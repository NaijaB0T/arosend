import type { Route } from "./+types/file.$transferId";
import { BackgroundManager } from "../components/BackgroundManager";
import { Header } from "../components/Header";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router";
import { useAuth } from "../lib/auth";
import { ExpiryWarningModal } from "../components/ExpiryWarningModal";
import { ExtendExpiryConfirmationModal } from "../components/ExtendExpiryConfirmationModal";
import { DeletionWarningModal } from "../components/DeletionWarningModal";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `File Transfer - ${params.transferId} - Arosend` },
    { name: "description", content: "Your file transfer details and download link. Extend storage time or share with others." },
  ];
}

interface TransferFile {
  id: string;
  filename: string;
  size: number;
  upload_status: string;
}

interface Transfer {
  id: string;
  status: string;
  expires_at: number;
  created_at: number;
  files: TransferFile[];
}

export default function FilePage() {
  const { transferId } = useParams();
  const { user, isAuthenticated } = useAuth();
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showExtension, setShowExtension] = useState(false);
  const [extensionDays, setExtensionDays] = useState(1);
  const [guestEmail, setGuestEmail] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  
  // Credit-related state for authenticated users
  const [credits, setCredits] = useState(0);
  const [creditsLoading, setCreditLoading] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  
  // Credits modal state
  const [creditAmount, setCreditAmount] = useState(0);
  const [creditPaymentLoading, setCreditPaymentLoading] = useState(false);
  
  // New expiry notification modals state
  const [showExpiryWarning, setShowExpiryWarning] = useState(false);
  const [showExtendConfirmation, setShowExtendConfirmation] = useState(false);
  const [showDeletionWarning, setShowDeletionWarning] = useState(false);
  const [hasShownExpiryWarning, setHasShownExpiryWarning] = useState(false);
  const [copiedFileLinks, setCopiedFileLinks] = useState<{[key: string]: boolean}>({});

  const [downloadUrl, setDownloadUrl] = useState(`/file/${transferId}`);

  useEffect(() => {
    fetchTransfer();
  }, [transferId]);

  // Check for expiry warning when transfer data loads
  useEffect(() => {
    if (transfer && !hasShownExpiryWarning) {
      const now = Date.now();
      const timeRemaining = transfer.expires_at - now;
      const hoursRemaining = timeRemaining / (1000 * 60 * 60);
      
      // Show warning if less than 48 hours remaining
      if (hoursRemaining > 0 && hoursRemaining < 48) {
        setShowExpiryWarning(true);
        setHasShownExpiryWarning(true);
      }
    }
  }, [transfer, hasShownExpiryWarning]);

  useEffect(() => {
    // Check for payment success in URL params and refresh credits
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success' && isAuthenticated) {
      // Refresh credits after successful payment
      setTimeout(() => {
        fetchCredits();
        setShowCreditsModal(false);
      }, 1000);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Set full URL on client side only
    if (typeof window !== 'undefined') {
      setDownloadUrl(`${window.location.origin}/file/${transferId}`);
    }
  }, [transferId]);

  useEffect(() => {
    // Fetch credits when extension panel is shown for authenticated users
    if (showExtension && isAuthenticated) {
      fetchCredits();
    }
  }, [showExtension, isAuthenticated]);

  useEffect(() => {
    // Set minimum credit amount when modal opens
    if (showCreditsModal) {
      const requiredCredits = calculateExtensionCost();
      const neededCredits = Math.max(100, requiredCredits - credits); // Minimum 100 naira
      setCreditAmount(neededCredits);
    }
  }, [showCreditsModal, credits]);

  useEffect(() => {
    // Set minimum extension days for guests when extension panel opens
    if (showExtension && !isAuthenticated && transfer) {
      const minDays = calculateMinimumDaysForGuests();
      if (extensionDays < minDays) {
        setExtensionDays(minDays);
      }
    }
  }, [showExtension, isAuthenticated, transfer]);

  const fetchTransfer = async () => {
    try {
      const response = await fetch(`/api/transfers/${transferId}`);
      if (!response.ok) {
        throw new Error('Transfer not found');
      }
      const data = await response.json() as Transfer;
      setTransfer(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transfer');
    } finally {
      setLoading(false);
    }
  };

  const fetchCredits = async () => {
    if (!isAuthenticated || !user) return;
    
    try {
      setCreditLoading(true);
      const response = await fetch("/api/credits", {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${user.id}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCredits(data.credits || 0);
      }
    } catch (error) {
      console.error("Error fetching credits:", error);
    } finally {
      setCreditLoading(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(downloadUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = downloadUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyFileLink = async (fileId: string, filename: string) => {
    const fileUrl = `${window.location.origin}/api/file/${transferId}/${encodeURIComponent(filename)}`;
    try {
      await navigator.clipboard.writeText(fileUrl);
      setCopiedFileLinks(prev => ({ ...prev, [fileId]: true }));
      setTimeout(() => {
        setCopiedFileLinks(prev => ({ ...prev, [fileId]: false }));
      }, 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = fileUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedFileLinks(prev => ({ ...prev, [fileId]: true }));
      setTimeout(() => {
        setCopiedFileLinks(prev => ({ ...prev, [fileId]: false }));
      }, 2000);
    }
  };

  const calculateExtensionCost = () => {
    if (!transfer) return 0;
    const totalSizeGB = transfer.files.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024 * 1024);
    return totalSizeGB * extensionDays * 2; // ₦2 per GB per day - precise calculation
  };

  const formatCost = (cost: number): string => {
    if (cost >= 1) {
      return cost.toFixed(2);
    }
    
    // For values less than 1, find first 2 non-zero digits
    const costStr = cost.toString();
    const decimalIndex = costStr.indexOf('.');
    
    if (decimalIndex === -1) return cost.toFixed(2);
    
    let nonZeroCount = 0;
    let precision = 0;
    
    for (let i = decimalIndex + 1; i < costStr.length; i++) {
      precision++;
      if (costStr[i] !== '0') {
        nonZeroCount++;
        if (nonZeroCount === 2) break;
      }
    }
    
    return cost.toFixed(Math.max(2, precision));
  };

  // Calculate minimum days needed for ₦100 minimum payment for guests
  const calculateMinimumDaysForGuests = () => {
    if (!transfer || isAuthenticated) return 1;
    
    const totalSizeGB = transfer.files.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024 * 1024);
    if (totalSizeGB === 0) return 1;
    
    // Calculate days needed for ₦100: 100 = totalSizeGB * days * 2
    // So days = 100 / (totalSizeGB * 2)
    const daysFor100Naira = 100 / (totalSizeGB * 2);
    
    // Cap at 200 days maximum
    const cappedDays = Math.min(daysFor100Naira, 200);
    
    // Round up to ensure we meet minimum ₦100
    return Math.ceil(cappedDays);
  };

  // Get the cost for guest users (₦100 base + excess days if any)
  const getGuestCost = () => {
    if (!transfer || isAuthenticated) return Math.ceil(calculateExtensionCost());
    
    const minDays = calculateMinimumDaysForGuests();
    const totalSizeGB = transfer.files.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024 * 1024);
    
    if (extensionDays <= minDays) {
      return 100; // Fixed ₦100 for minimum days
    } else {
      // ₦100 base + excess days at actual rate
      const excessDays = extensionDays - minDays;
      const dailyRate = totalSizeGB * 2; // ₦2 per GB per day
      const excessCost = excessDays * dailyRate;
      return Math.ceil(100 + excessCost); // Round up the total
    }
  };

  // Get breakdown of guest cost for display
  const getGuestCostBreakdown = () => {
    if (!transfer || isAuthenticated) return null;
    
    const minDays = calculateMinimumDaysForGuests();
    const totalSizeGB = transfer.files.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024 * 1024);
    
    if (extensionDays <= minDays) {
      return {
        baseCost: 100,
        excessCost: 0,
        excessDays: 0,
        total: 100
      };
    } else {
      const excessDays = extensionDays - minDays;
      const dailyRate = totalSizeGB * 2;
      const excessCost = excessDays * dailyRate;
      return {
        baseCost: 100,
        excessCost: Math.ceil(excessCost),
        excessDays,
        total: Math.ceil(100 + excessCost)
      };
    }
  };

  // Handle expiry warning modal actions
  const handleExpiryExtend = () => {
    setShowExpiryWarning(false);
    setShowExtendConfirmation(true);
  };

  const handleExpiryIgnore = () => {
    setShowExpiryWarning(false);
    setShowDeletionWarning(true);
  };

  const handleDeletionContinue = () => {
    setShowDeletionWarning(false);
    // User acknowledges deletion warning, close modal
  };

  const handleDeletionExtend = () => {
    setShowDeletionWarning(false);
    setShowExtendConfirmation(true);
  };

  const handleExtendConfirmationClose = () => {
    setShowExtendConfirmation(false);
  };

  const handleProceedToPayment = (days: number) => {
    setExtensionDays(days);
    setShowExtendConfirmation(false);
    if (isAuthenticated) {
      // If authenticated, try to extend with credits first
      extendTransferWithCredits();
    } else {
      // If guest, show existing extension modal
      setShowExtension(true);
    }
  };

  const extendTransfer = async () => {
    if (!guestEmail || !transfer) return;
    
    const cost = getGuestCost(); // Use smart guest cost calculation
    if (cost < 100) {
      alert('Minimum extension cost is ₦100');
      return;
    }

    setPaymentLoading(true);
    try {
      const response = await fetch('/api/extend-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transferId,
          days: extensionDays,
          email: guestEmail,
          amount: cost * 100 // Convert to kobo
        })
      });

      if (!response.ok) {
        throw new Error('Payment initialization failed');
      }

      const result = await response.json() as { authorization_url: string };
      const { authorization_url } = result;
      window.location.href = authorization_url;
    } catch (err) {
      alert('Payment failed. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Calculate 5% transaction fee
  const calculateTransactionFee = (amount: number) => {
    return Math.ceil(amount * 0.05); // 5% fee, rounded up
  };

  // Calculate total amount including fee
  const calculateTotalWithFee = (amount: number) => {
    return amount + calculateTransactionFee(amount);
  };

  const extendTransferWithCredits = async () => {
    if (!transfer || !user) return;
    
    const cost = calculateExtensionCost(); // Use precise cost for credit calculation
    if (credits < cost) {
      setShowCreditsModal(true);
      return;
    }

    setPaymentLoading(true);
    try {
      const response = await fetch('/api/extend-transfer-credits', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        },
        body: JSON.stringify({
          transferId,
          days: extensionDays
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.error === 'Insufficient credits') {
          setShowCreditsModal(true);
          return;
        }
        throw new Error(errorData.error || 'Extension failed');
      }

      const result = await response.json();
      setCredits(result.remaining_credits);
      alert(`Transfer extended successfully! ₦${formatCost(cost)} credits used.`);
      setShowExtension(false);
      
      // Refresh transfer data to show new expiry
      fetchTransfer();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Extension failed. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  const purchaseCredits = async () => {
    if (!user || creditAmount < 100) return; // Minimum 100 naira
    
    setCreditPaymentLoading(true);
    try {
      // Calculate total amount including 5% fee
      const fee = Math.ceil(creditAmount * 0.05); // 5% fee, rounded up
      const totalAmount = creditAmount + fee;
      
      // Initialize payment with Paystack
      const response = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        },
        body: JSON.stringify({
          amount: totalAmount * 100, // Convert to kobo
          credits_to_receive: creditAmount, // Actual credits user will receive
          email: user.email,
          callback_url: `${window.location.origin}/file/${transferId}?payment=success`
        })
      });

      if (!response.ok) {
        throw new Error('Payment initialization failed');
      }

      const result = await response.json();
      if (result.data?.authorization_url) {
        // Redirect to Paystack payment page
        window.location.href = result.data.authorization_url;
      } else {
        throw new Error('Invalid payment response');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Payment failed. Please try again.');
    } finally {
      setCreditPaymentLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatTimeRemaining = (expiresAt: number) => {
    const now = Date.now();
    const remaining = expiresAt - now;
    
    if (remaining <= 0) return 'Expired';
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? 's' : ''} remaining`;
    }
    
    return `${hours}h ${minutes}m remaining`;
  };

  if (loading) {
    return (
      <BackgroundManager>
        <div className="min-h-screen">
          <Header />
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-white">Loading transfer details...</p>
            </div>
          </div>
        </div>
      </BackgroundManager>
    );
  }

  if (error || !transfer) {
    return (
      <BackgroundManager>
        <div className="min-h-screen">
          <Header />
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-4">Transfer Not Found</h1>
              <p className="text-white/70 mb-6">{error || 'This transfer does not exist or has been deleted.'}</p>
              <a href="/" className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors">
                Create New Transfer
              </a>
            </div>
          </div>
        </div>
      </BackgroundManager>
    );
  }

  return (
    <BackgroundManager>
      <div className="min-h-screen">
        <Header />
        
        <div className="px-4 md:px-6 py-8 md:py-12">
          <div className="max-w-4xl mx-auto">
            
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Transfer Ready! 🎉
              </h1>
              <p className="text-white/70 text-lg">
                Your files are uploaded and ready to share
              </p>
            </div>

            {/* Main Card */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 md:p-8 border border-white/20 mb-8">
              
              {/* Status & Time */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 pb-6 border-b border-white/20">
                <div>
                  <div className="flex items-center mb-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                    <span className="text-white font-medium">Active Transfer</span>
                  </div>
                  <p className="text-white/70 text-sm">
                    {formatTimeRemaining(transfer.expires_at)}
                  </p>
                </div>
                <button
                  onClick={() => setShowExtension(true)}
                  className="mt-4 md:mt-0 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  Extend Time
                </button>
              </div>

              {/* Shareable Link */}
              <div className="mb-6">
                <label className="block text-white font-medium mb-2">Share this link:</label>
                <div className="flex flex-col md:flex-row gap-3">
                  <input
                    type="text"
                    value={downloadUrl}
                    readOnly
                    className="flex-1 bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    onClick={copyLink}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                      copied 
                        ? 'bg-green-600 text-white' 
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {copied ? 'Copied!' : 'Copy Link'}
                  </button>
                </div>
              </div>

              {/* Direct Download Links */}
              {transfer.files.length > 0 && (
                <div className="mb-6">
                  <label className="block text-white font-medium mb-2">Direct download links:</label>
                  <div className="space-y-4">
                    {transfer.files.map((file) => {
                      const fileDownloadUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/file/${transfer.id}/${encodeURIComponent(file.filename)}`;
                      
                      return (
                        <div key={file.id} className="bg-white/5 rounded-lg p-4">
                          {/* File Info */}
                          <div className="flex items-center mb-3">
                            <div className="text-xl mr-3">📁</div>
                            <div>
                              <p className="text-white font-medium">{file.filename}</p>
                              <p className="text-white/60 text-sm">{formatFileSize(file.size)}</p>
                            </div>
                          </div>
                          
                          {/* Download Link Input */}
                          <div className="flex flex-col md:flex-row gap-3">
                            <input
                              type="text"
                              value={fileDownloadUrl}
                              readOnly
                              onClick={() => {
                                // Make the input clickable to download
                                const link = document.createElement('a');
                                link.href = fileDownloadUrl;
                                link.download = file.filename;
                                link.click();
                              }}
                              className="flex-1 bg-green-900/20 border border-green-500/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer hover:bg-green-800/30 transition-colors"
                              title="Click to download"
                            />
                            <button
                              onClick={() => copyFileLink(file.id, file.filename)}
                              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                                copiedFileLinks[file.id]
                                  ? 'bg-green-600 text-white' 
                                  : 'bg-white/10 text-white hover:bg-white/20'
                              }`}
                            >
                              {copiedFileLinks[file.id] ? 'Copied!' : 'Copy Link'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>

            {/* Extension Modal - Desktop */}
            {showExtension && (
              <>
                {/* Desktop Modal */}
                <div className="hidden sm:flex fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                  <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 md:p-8 border border-white/20 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-white">Extend Storage Time</h3>
                      <button
                        onClick={() => setShowExtension(false)}
                        className="text-gray-400 hover:text-white p-2"
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    <p className="text-white/70 mb-6">
                      Keep your files accessible for longer. {isAuthenticated ? 'Use your credits to extend any transfer.' : 'Pay only for the time you need.'}
                    </p>

                    {isAuthenticated ? (
                      // Authenticated user interface
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-white font-medium mb-2">Extension Days</label>
                            <input
                              type="number"
                              min="1"
                              max="365"
                              value={extensionDays}
                              onChange={(e) => setExtensionDays(parseInt(e.target.value) || 1)}
                              className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                          <div>
                            <label className="block text-white font-medium mb-2">Your Credits</label>
                            <div className="bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white">
                              {creditsLoading ? (
                                <span className="text-white/60">Loading...</span>
                              ) : (
                                <span className="text-green-400 font-medium">₦{credits.toLocaleString()} available</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-6 p-4 bg-white/5 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-white">Cost in Credits:</span>
                            <span className="text-2xl font-bold text-green-400">
                              ₦{formatCost(calculateExtensionCost())}
                            </span>
                          </div>
                          <p className="text-white/60 text-sm mt-1">
                            ₦2 per GB per day • Deducted from your credit balance
                          </p>
                          {!creditsLoading && credits < calculateExtensionCost() && (
                            <p className="text-red-400 text-sm mt-2">
                              Insufficient credits. You need ₦{formatCost(calculateExtensionCost() - credits)} more.
                            </p>
                          )}
                        </div>

                        <div className="mt-6 flex gap-3">
                          <button
                            onClick={() => setShowExtension(false)}
                            className="flex-1 border border-white/30 text-white px-6 py-3 rounded-lg hover:bg-white/10 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={extendTransferWithCredits}
                            disabled={creditsLoading || paymentLoading}
                            className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {paymentLoading ? 'Processing...' : 'Extend with Credits'}
                          </button>
                        </div>
                      </>
                    ) : (
                      // Guest user interface
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-white font-medium mb-2">Extension Days</label>
                            <input
                              type="number"
                              min={calculateMinimumDaysForGuests()}
                              max="365"
                              value={extensionDays}
                              onChange={(e) => {
                                const newDays = parseInt(e.target.value) || calculateMinimumDaysForGuests();
                                const minDays = calculateMinimumDaysForGuests();
                                setExtensionDays(Math.max(newDays, minDays));
                              }}
                              className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                            <p className="text-white/60 text-xs mt-1">
                              Minimum {calculateMinimumDaysForGuests()} days for ₦100 minimum payment
                            </p>
                          </div>
                          <div>
                            <label className="block text-white font-medium mb-2">Your Email</label>
                            <input
                              type="email"
                              placeholder="email@example.com"
                              value={guestEmail}
                              onChange={(e) => setGuestEmail(e.target.value)}
                              className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                        </div>

                        <div className="mt-6 p-4 bg-white/5 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-white">Total Cost:</span>
                            <span className="text-2xl font-bold text-green-400">
                              ₦{getGuestCost().toLocaleString()}
                            </span>
                          </div>
                          
                          {(() => {
                            const breakdown = getGuestCostBreakdown();
                            if (!breakdown) return null;
                            
                            if (breakdown.excessDays > 0) {
                              return (
                                <div className="mt-3 space-y-1">
                                  <div className="flex justify-between text-sm text-white/80">
                                    <span>Base cost ({calculateMinimumDaysForGuests()} days):</span>
                                    <span>₦{breakdown.baseCost.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between text-sm text-white/80">
                                    <span>Extra cost ({breakdown.excessDays} additional days):</span>
                                    <span>₦{breakdown.excessCost.toLocaleString()}</span>
                                  </div>
                                  <div className="border-t border-white/20 pt-1"></div>
                                </div>
                              );
                            }
                            return null;
                          })()}
                          
                          <p className="text-white/60 text-sm mt-1">
                            ₦2 per GB per day • Minimum ₦100
                          </p>
                          
                          {extensionDays === calculateMinimumDaysForGuests() && (
                            <p className="text-blue-400 text-sm mt-2">
                              ✨ Extended to {extensionDays} days to meet minimum payment requirement
                            </p>
                          )}
                          
                          {(() => {
                            const breakdown = getGuestCostBreakdown();
                            return breakdown && breakdown.excessDays > 0 && (
                              <p className="text-yellow-400 text-sm mt-2">
                                💡 {breakdown.excessDays} extra days beyond minimum at actual rate
                              </p>
                            );
                          })()}
                        </div>

                        <div className="mt-6 flex gap-3">
                          <button
                            onClick={() => setShowExtension(false)}
                            className="flex-1 border border-white/30 text-white px-6 py-3 rounded-lg hover:bg-white/10 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={extendTransfer}
                            disabled={!guestEmail || getGuestCost() < 100 || paymentLoading}
                            className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {paymentLoading ? 'Processing...' : 'Pay & Extend'}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Mobile Bottom Sheet Modal - Render via Portal */}
                {typeof window !== "undefined" && createPortal(
                  <div className="sm:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-[999]" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
                    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto" style={{ position: 'fixed', bottom: 0, left: 0, right: 0 }}>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-white">
                          Extend Storage Time
                        </h3>
                        <button
                          onClick={() => setShowExtension(false)}
                          className="text-gray-400 hover:text-white p-2"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      
                      <p className="text-white/70 mb-6">
                        Keep your files accessible for longer. {isAuthenticated ? 'Use your credits to extend any transfer.' : 'Pay only for the time you need.'}
                      </p>

                      {isAuthenticated ? (
                        // Authenticated user mobile interface
                        <>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-white font-medium mb-2">Extension Days</label>
                              <input
                                type="number"
                                min="1"
                                max="365"
                                value={extensionDays}
                                onChange={(e) => setExtensionDays(parseInt(e.target.value) || 1)}
                                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                              />
                            </div>
                            <div>
                              <label className="block text-white font-medium mb-2">Your Credits</label>
                              <div className="bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white">
                                {creditsLoading ? (
                                  <span className="text-white/60">Loading...</span>
                                ) : (
                                  <span className="text-green-400 font-medium">₦{credits.toLocaleString()} available</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mt-6 p-4 bg-white/5 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="text-white">Cost in Credits:</span>
                              <span className="text-2xl font-bold text-green-400">
                                ₦{formatCost(calculateExtensionCost())}
                              </span>
                            </div>
                            <p className="text-white/60 text-sm mt-1">
                              ₦2 per GB per day • Deducted from your credit balance
                            </p>
                            {!creditsLoading && credits < calculateExtensionCost() && (
                              <p className="text-red-400 text-sm mt-2">
                                Insufficient credits. You need ₦{formatCost(calculateExtensionCost() - credits)} more.
                              </p>
                            )}
                          </div>

                          <div className="mt-6 flex gap-3 pb-6">
                            <button
                              onClick={() => setShowExtension(false)}
                              className="flex-1 border border-white/30 text-white px-6 py-3 rounded-lg hover:bg-white/10 transition-colors font-medium"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={extendTransferWithCredits}
                              disabled={creditsLoading || paymentLoading}
                              className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                            >
                              {paymentLoading ? 'Processing...' : 'Extend with Credits'}
                            </button>
                          </div>
                        </>
                      ) : (
                        // Guest user mobile interface
                        <>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-white font-medium mb-2">Extension Days</label>
                              <input
                                type="number"
                                min={calculateMinimumDaysForGuests()}
                                max="365"
                                value={extensionDays}
                                onChange={(e) => {
                                  const newDays = parseInt(e.target.value) || calculateMinimumDaysForGuests();
                                  const minDays = calculateMinimumDaysForGuests();
                                  setExtensionDays(Math.max(newDays, minDays));
                                }}
                                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                              />
                              <p className="text-white/60 text-xs mt-1">
                                Minimum {calculateMinimumDaysForGuests()} days for ₦100 minimum payment
                              </p>
                            </div>
                            <div>
                              <label className="block text-white font-medium mb-2">Your Email</label>
                              <input
                                type="email"
                                placeholder="email@example.com"
                                value={guestEmail}
                                onChange={(e) => setGuestEmail(e.target.value)}
                                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-green-500"
                              />
                            </div>
                          </div>

                          <div className="mt-6 p-4 bg-white/5 rounded-lg">
                            <div className="flex justify-between items-center">
                              <span className="text-white">Total Cost:</span>
                              <span className="text-2xl font-bold text-green-400">
                                ₦{getGuestCost().toLocaleString()}
                              </span>
                            </div>
                            
                            {(() => {
                              const breakdown = getGuestCostBreakdown();
                              if (!breakdown) return null;
                              
                              if (breakdown.excessDays > 0) {
                                return (
                                  <div className="mt-3 space-y-1">
                                    <div className="flex justify-between text-sm text-white/80">
                                      <span>Base cost ({calculateMinimumDaysForGuests()} days):</span>
                                      <span>₦{breakdown.baseCost.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-white/80">
                                      <span>Extra cost ({breakdown.excessDays} additional days):</span>
                                      <span>₦{breakdown.excessCost.toLocaleString()}</span>
                                    </div>
                                    <div className="border-t border-white/20 pt-1"></div>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                            
                            <p className="text-white/60 text-sm mt-1">
                              ₦2 per GB per day • Minimum ₦100
                            </p>
                            
                            {extensionDays === calculateMinimumDaysForGuests() && (
                              <p className="text-blue-400 text-sm mt-2">
                                ✨ Extended to {extensionDays} days to meet minimum payment requirement
                              </p>
                            )}
                            
                            {(() => {
                              const breakdown = getGuestCostBreakdown();
                              return breakdown && breakdown.excessDays > 0 && (
                                <p className="text-yellow-400 text-sm mt-2">
                                  💡 {breakdown.excessDays} extra days beyond minimum at actual rate
                                </p>
                              );
                            })()}
                          </div>

                          <div className="mt-6 flex gap-3 pb-6">
                            <button
                              onClick={() => setShowExtension(false)}
                              className="flex-1 border border-white/30 text-white px-6 py-3 rounded-lg hover:bg-white/10 transition-colors font-medium"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={extendTransfer}
                              disabled={!guestEmail || getGuestCost() < 100 || paymentLoading}
                              className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                            >
                              {paymentLoading ? 'Processing...' : 'Pay & Extend'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>,
                  document.body
                )}
              </>
            )}

            {/* Credits Modal */}
            {showCreditsModal && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 md:p-8 border border-white/20 max-w-md w-full">
                  <h3 className="text-xl font-bold text-white mb-4">Add Credits</h3>
                  <p className="text-white/70 mb-6">
                    You need ₦{formatCost(calculateExtensionCost())} credits to extend this transfer, but you only have ₦{credits.toLocaleString()}.
                  </p>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-white">
                      <span>Required:</span>
                      <span className="font-medium">₦{formatCost(calculateExtensionCost())}</span>
                    </div>
                    <div className="flex justify-between text-white">
                      <span>Available:</span>
                      <span className="font-medium">₦{credits.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-white/20 pt-3 flex justify-between text-white">
                      <span>Minimum needed:</span>
                      <span className="font-bold text-red-400">₦{formatCost(calculateExtensionCost() - credits)}</span>
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-white font-medium mb-2">Credits to Purchase (₦)</label>
                    <input
                      type="number"
                      min="100"
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(Math.max(100, parseInt(e.target.value) || 100))}
                      className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="Enter amount (minimum ₦100)"
                    />
                    <p className="text-white/60 text-sm mt-1">
                      1 credit = ₦1 • Minimum purchase: ₦100
                    </p>
                  </div>

                  <div className="mb-6 p-4 bg-white/5 rounded-lg">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-sm text-white/80">
                        <span>Credits to receive:</span>
                        <span>₦{creditAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm text-white/80">
                        <span>Transaction fee (5%):</span>
                        <span>₦{calculateTransactionFee(creditAmount).toLocaleString()}</span>
                      </div>
                      <div className="border-t border-white/20 pt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-white font-medium">Total Payment:</span>
                          <span className="text-2xl font-bold text-green-400">
                            ₦{calculateTotalWithFee(creditAmount).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-white/60 text-xs mt-3">
                      💳 All transactions include a 5% processing fee to cover payment gateway and operational costs
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowCreditsModal(false)}
                      disabled={creditPaymentLoading}
                      className="flex-1 border border-white/30 text-white px-6 py-3 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={purchaseCredits}
                      disabled={creditAmount < 100 || creditPaymentLoading}
                      className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {creditPaymentLoading ? 'Processing...' : 'Pay Now'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* New Expiry Notification Modals */}
            <ExpiryWarningModal
              isOpen={showExpiryWarning}
              expiresAt={transfer?.expires_at || 0}
              onExtend={handleExpiryExtend}
              onIgnore={handleExpiryIgnore}
            />

            <ExtendExpiryConfirmationModal
              isOpen={showExtendConfirmation}
              onClose={handleExtendConfirmationClose}
              onProceedToPayment={handleProceedToPayment}
              fileSizeGB={transfer ? transfer.files.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024 * 1024) : 0}
              isAuthenticated={isAuthenticated}
            />

            <DeletionWarningModal
              isOpen={showDeletionWarning}
              expiresAt={transfer?.expires_at || 0}
              onContinue={handleDeletionContinue}
              onExtend={handleDeletionExtend}
            />

          </div>
        </div>
      </div>
    </BackgroundManager>
  );
}
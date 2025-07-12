import type { Route } from "./+types/file.$transferId";
import { BackgroundManager } from "../components/BackgroundManager";
import { Header } from "../components/Header";
import { useState, useEffect } from "react";
import { useParams } from "react-router";
import { useAuth } from "../lib/auth";

export function meta({ params }: Route.MetaArgs) {
  return [
    { title: `File Transfer - ${params.transferId} - Àrokò` },
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

  const [downloadUrl, setDownloadUrl] = useState(`/file/${transferId}`);

  useEffect(() => {
    fetchTransfer();
  }, [transferId]);

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

  const calculateExtensionCost = () => {
    if (!transfer) return 0;
    const totalSizeGB = transfer.files.reduce((sum, file) => sum + file.size, 0) / (1024 * 1024 * 1024);
    return Math.ceil(totalSizeGB * extensionDays * 2); // ₦2 per GB per day
  };

  const extendTransfer = async () => {
    if (!guestEmail || !transfer) return;
    
    const cost = calculateExtensionCost();
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

  const extendTransferWithCredits = async () => {
    if (!transfer || !user) return;
    
    const cost = calculateExtensionCost();
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
      alert(`Transfer extended successfully! ${cost} credits used.`);
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
      // Initialize payment with Paystack
      const response = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.id}`
        },
        body: JSON.stringify({
          amount: creditAmount * 100, // Convert to kobo
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
                  onClick={() => setShowExtension(!showExtension)}
                  className="mt-4 md:mt-0 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  Extend Time
                </button>
              </div>

              {/* Download Link */}
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

              {/* Files List */}
              <div>
                <h3 className="text-white font-medium mb-4">Files ({transfer.files.length})</h3>
                <div className="space-y-3">
                  {transfer.files.map((file) => (
                    <div key={file.id} className="flex items-center justify-between bg-white/5 rounded-lg p-4">
                      <div className="flex items-center">
                        <div className="text-2xl mr-3">📁</div>
                        <div>
                          <p className="text-white font-medium">{file.filename}</p>
                          <p className="text-white/60 text-sm">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <a 
                          href={`/api/file/${transfer.id}/${encodeURIComponent(file.filename)}`}
                          download={file.filename}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                          Ready to download
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Extension Panel */}
            {showExtension && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 md:p-8 border border-white/20">
                <h3 className="text-xl font-bold text-white mb-4">Extend Storage Time</h3>
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
                          ₦{calculateExtensionCost().toLocaleString()}
                        </span>
                      </div>
                      <p className="text-white/60 text-sm mt-1">
                        ₦2 per GB per day • Deducted from your credit balance
                      </p>
                      {!creditsLoading && credits < calculateExtensionCost() && (
                        <p className="text-red-400 text-sm mt-2">
                          Insufficient credits. You need ₦{(calculateExtensionCost() - credits).toLocaleString()} more.
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
                          min="1"
                          max="365"
                          value={extensionDays}
                          onChange={(e) => setExtensionDays(parseInt(e.target.value) || 1)}
                          className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
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
                          ₦{calculateExtensionCost().toLocaleString()}
                        </span>
                      </div>
                      <p className="text-white/60 text-sm mt-1">
                        ₦2 per GB per day • Minimum ₦100
                      </p>
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
                        disabled={!guestEmail || calculateExtensionCost() < 100 || paymentLoading}
                        className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {paymentLoading ? 'Processing...' : 'Pay & Extend'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Credits Modal */}
            {showCreditsModal && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 md:p-8 border border-white/20 max-w-md w-full">
                  <h3 className="text-xl font-bold text-white mb-4">Add Credits</h3>
                  <p className="text-white/70 mb-6">
                    You need ₦{calculateExtensionCost().toLocaleString()} credits to extend this transfer, but you only have ₦{credits.toLocaleString()}.
                  </p>
                  
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-white">
                      <span>Required:</span>
                      <span className="font-medium">₦{calculateExtensionCost().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-white">
                      <span>Available:</span>
                      <span className="font-medium">₦{credits.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-white/20 pt-3 flex justify-between text-white">
                      <span>Minimum needed:</span>
                      <span className="font-bold text-red-400">₦{(calculateExtensionCost() - credits).toLocaleString()}</span>
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
                    <div className="flex justify-between items-center">
                      <span className="text-white">Total Payment:</span>
                      <span className="text-2xl font-bold text-green-400">
                        ₦{creditAmount.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-white/60 text-sm mt-1">
                      You'll receive {creditAmount} credits
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

          </div>
        </div>
      </div>
    </BackgroundManager>
  );
}
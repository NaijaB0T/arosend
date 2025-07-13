import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "~/lib/auth";

interface ManagedFile {
  id: string;
  filename: string;
  filesize: number;
  transfer_id: string;
  transfer_status: string;
  current_expiry: number;
  is_expired: boolean;
  extension_cost_per_day: number;
  total_extensions: number;
  total_extension_cost: number;
  created_at: number;
}

interface FileExtension {
  id: string;
  days_extended: number;
  cost_in_credits: number;
  new_expiry_date: number;
  created_at: number;
}

interface FilesResponse {
  files: ManagedFile[];
  message?: string;
}

interface ExtensionResponse {
  cost_paid: number;
  error?: string;
}

interface DeleteResponse {
  error?: string;
}

export function FilesTab() {
  const { user } = useAuth();
  const [files, setFiles] = useState<ManagedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [extendingFile, setExtendingFile] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [extensionDays, setExtensionDays] = useState<number>(1);
  const [customDays, setCustomDays] = useState<string>("");
  const [useCustomDays, setUseCustomDays] = useState<boolean>(false);
  const [extensionHistory, setExtensionHistory] = useState<FileExtension[]>([]);
  const [showExtensionModal, setShowExtensionModal] = useState(false);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      
      if (typeof window === "undefined") {
        setLoading(false);
        return;
      }
      
      const authUser = localStorage.getItem("auth_user");
      const userId = authUser ? JSON.parse(authUser).id : "";
      
      const response = await fetch("/api/files", {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userId}`,
        },
      });

      if (response.ok) {
        const data: FilesResponse = await response.json();
        setFiles(data.files || []);
        
        // Show migration message if needed
        if (data.message) {
          console.log(data.message);
        }
      }
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateExtensionCost = (file: ManagedFile, days: number): number => {
    const fileSizeGB = file.filesize / (1024 * 1024 * 1024);
    return fileSizeGB * days * 2; // ₦2 per GB per day
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

  const copyFileLink = async (transferId: string, filename: string) => {
    try {
      const fileLink = `${window.location.origin}/file/${transferId}`;
      await navigator.clipboard.writeText(fileLink);
      alert(`Link copied to clipboard for ${filename}`);
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      alert("Failed to copy link to clipboard");
    }
  };

  const handleExtendFile = async (file: ManagedFile) => {
    const daysToExtend = useCustomDays ? parseInt(customDays) : extensionDays;
    if (!daysToExtend || daysToExtend < 1) return;
    
    try {
      setExtendingFile(file.id);
      
      const authUser = localStorage.getItem("auth_user");
      const userId = authUser ? JSON.parse(authUser).id : "";
      
      const response = await fetch("/api/files/extend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userId}`,
        },
        body: JSON.stringify({
          fileId: file.id,
          days: daysToExtend
        }),
      });

      const data: ExtensionResponse = await response.json();
      
      if (response.ok) {
        alert(`File extended successfully! ${data.cost_paid} credits deducted.`);
        fetchFiles(); // Refresh file list
        setShowExtensionModal(false);
        setSelectedFile(null);
        setExtensionDays(1);
        setCustomDays("");
        setUseCustomDays(false);
      } else {
        alert(data.error || "Failed to extend file");
      }
    } catch (error) {
      console.error("Error extending file:", error);
      alert("An error occurred while extending the file");
    } finally {
      setExtendingFile(null);
    }
  };

  const handleDeleteFile = async (fileId: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const authUser = localStorage.getItem("auth_user");
      const userId = authUser ? JSON.parse(authUser).id : "";
      
      const response = await fetch(`/api/files/${fileId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${userId}`,
        },
      });

      if (response.ok) {
        alert("File deleted successfully");
        fetchFiles(); // Refresh file list
      } else {
        const data: DeleteResponse = await response.json();
        alert(data.error || "Failed to delete file");
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("An error occurred while deleting the file");
    }
  };

  const openExtensionModal = (file: ManagedFile) => {
    setSelectedFile(file.id);
    setExtensionDays(1);
    setCustomDays("");
    setUseCustomDays(false);
    setShowExtensionModal(true);
  };

  const selectedFileData = files.find(f => f.id === selectedFile);

  return (
    <div className="text-white">
      <h2 className="text-xl font-semibold mb-6">File Management</h2>
      
      {loading ? (
        <div className="text-center text-white/70 py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
          <p>Loading your files...</p>
        </div>
      ) : files.length === 0 ? (
        <div className="text-center text-white/70 py-8">
          <p>No managed files yet</p>
          <p className="text-sm">Files you upload while logged in will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {files.map((file) => (
            <div key={file.id} className="bg-white/10 rounded-lg p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 mb-4 sm:mb-0">
                  <h3 className="font-medium text-white mb-2 break-words">{file.filename}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-white/70">
                    <div>
                      <span className="block">Size</span>
                      <span className="text-white">{formatFileSize(file.filesize)}</span>
                    </div>
                    <div>
                      <span className="block">Status</span>
                      <span className={`${file.is_expired ? 'text-red-400' : 'text-green-400'}`}>
                        {file.is_expired ? 'Expired' : 'Active'}
                      </span>
                    </div>
                    <div>
                      <span className="block">Expires</span>
                      <span className="text-white">{formatDate(file.current_expiry)}</span>
                    </div>
                    <div>
                      <span className="block">Extensions</span>
                      <span className="text-white">{file.total_extensions}</span>
                    </div>
                  </div>
                  
                  {file.total_extension_cost > 0 && (
                    <div className="mt-2 text-sm text-white/60">
                      Total spent on extensions: ₦{formatCost(file.total_extension_cost)}
                    </div>
                  )}
                </div>
                
                {/* Desktop buttons */}
                <div className="hidden sm:flex flex-col space-y-2 ml-4">
                  <button
                    onClick={() => copyFileLink(file.transfer_id, file.filename)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                  >
                    Copy Link
                  </button>
                  {!file.is_expired && (
                    <button
                      onClick={() => openExtensionModal(file)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                    >
                      Extend
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteFile(file.id, file.filename)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
                
                {/* Mobile buttons */}
                <div className="sm:hidden ml-0">
                  <div className="flex flex-row space-x-2">
                    <button
                      onClick={() => copyFileLink(file.transfer_id, file.filename)}
                      className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                    >
                      Copy Link
                    </button>
                    {!file.is_expired && (
                      <button
                        onClick={() => openExtensionModal(file)}
                        className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                      >
                        Extend
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteFile(file.id, file.filename)}
                      className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="text-sm text-white/70">
                  <span>Extension cost: ₦{formatCost(calculateExtensionCost(file, 1))}/day</span>
                  <span className="mx-2">•</span>
                  <span>Upload date: {formatDate(file.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Extension Modal */}
      {showExtensionModal && selectedFileData && (
        <>
          {/* Desktop Modal */}
          <div className="hidden sm:flex fixed inset-0 bg-black/50 items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-white mb-4">
                Extend File: {selectedFileData.filename}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/70 mb-2">
                    Extension Period
                  </label>
                  <div className="space-y-3">
                    <div>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          checked={!useCustomDays}
                          onChange={() => setUseCustomDays(false)}
                          className="text-blue-600"
                        />
                        <span className="text-white text-sm">Preset options</span>
                      </label>
                      {!useCustomDays && (
                        <select
                          value={extensionDays}
                          onChange={(e) => setExtensionDays(parseInt(e.target.value))}
                          className="w-full mt-2 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                        >
                          <option value={1}>1 Day</option>
                          <option value={3}>3 Days</option>
                          <option value={7}>1 Week</option>
                          <option value={14}>2 Weeks</option>
                          <option value={30}>1 Month</option>
                          <option value={90}>3 Months</option>
                          <option value={180}>6 Months</option>
                          <option value={365}>1 Year</option>
                        </select>
                      )}
                    </div>
                    
                    <div>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          checked={useCustomDays}
                          onChange={() => setUseCustomDays(true)}
                          className="text-blue-600"
                        />
                        <span className="text-white text-sm">Custom days</span>
                      </label>
                      {useCustomDays && (
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={customDays}
                          onChange={(e) => setCustomDays(e.target.value)}
                          placeholder="Enter number of days"
                          className="w-full mt-2 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
                        />
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-sm text-white/70 space-y-1">
                    <div>File size: {formatFileSize(selectedFileData.filesize)}</div>
                    <div>Extension period: {useCustomDays ? (parseInt(customDays) || 0) : extensionDays} day(s)</div>
                    <div className="font-medium text-white">
                      Cost: ₦{formatCost(calculateExtensionCost(selectedFileData, useCustomDays ? parseInt(customDays) || 0 : extensionDays))}
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowExtensionModal(false);
                      setSelectedFile(null);
                      setCustomDays("");
                      setUseCustomDays(false);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleExtendFile(selectedFileData)}
                    disabled={extendingFile === selectedFileData.id}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors"
                  >
                    {extendingFile === selectedFileData.id ? "Extending..." : "Extend File"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Bottom Sheet Modal - Render via Portal */}
          {typeof window !== "undefined" && createPortal(
            <div className="sm:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-[999]" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
              <div className="fixed bottom-0 left-0 right-0 bg-gray-800 rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto" style={{ position: 'fixed', bottom: 0, left: 0, right: 0 }}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    Extend File
                  </h3>
                  <button
                    onClick={() => {
                      setShowExtensionModal(false);
                      setSelectedFile(null);
                      setCustomDays("");
                      setUseCustomDays(false);
                    }}
                    className="text-gray-400 hover:text-white p-2"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="mb-4">
                  <p className="text-white/70 text-sm break-words">{selectedFileData.filename}</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-white/70 mb-2">
                      Extension Period
                    </label>
                    <div className="space-y-3">
                      <div>
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            checked={!useCustomDays}
                            onChange={() => setUseCustomDays(false)}
                            className="text-blue-600"
                          />
                          <span className="text-white text-sm">Preset options</span>
                        </label>
                        {!useCustomDays && (
                          <select
                            value={extensionDays}
                            onChange={(e) => setExtensionDays(parseInt(e.target.value))}
                            className="w-full mt-2 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                          >
                            <option value={1}>1 Day</option>
                            <option value={3}>3 Days</option>
                            <option value={7}>1 Week</option>
                            <option value={14}>2 Weeks</option>
                            <option value={30}>1 Month</option>
                            <option value={90}>3 Months</option>
                            <option value={180}>6 Months</option>
                            <option value={365}>1 Year</option>
                          </select>
                        )}
                      </div>
                      
                      <div>
                        <label className="flex items-center space-x-2">
                          <input
                            type="radio"
                            checked={useCustomDays}
                            onChange={() => setUseCustomDays(true)}
                            className="text-blue-600"
                          />
                          <span className="text-white text-sm">Custom days</span>
                        </label>
                        {useCustomDays && (
                          <input
                            type="number"
                            min="1"
                            max="365"
                            value={customDays}
                            onChange={(e) => setCustomDays(e.target.value)}
                            placeholder="Enter number of days"
                            className="w-full mt-2 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white/5 rounded-lg p-4">
                    <div className="text-sm text-white/70 space-y-1">
                      <div>File size: {formatFileSize(selectedFileData.filesize)}</div>
                      <div>Extension period: {useCustomDays ? (parseInt(customDays) || 0) : extensionDays} day(s)</div>
                      <div className="font-medium text-white">
                        Cost: ₦{formatCost(calculateExtensionCost(selectedFileData, useCustomDays ? parseInt(customDays) || 0 : extensionDays))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-3 pb-6">
                    <button
                      onClick={() => {
                        setShowExtensionModal(false);
                        setSelectedFile(null);
                        setCustomDays("");
                        setUseCustomDays(false);
                      }}
                      className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleExtendFile(selectedFileData)}
                      disabled={extendingFile === selectedFileData.id}
                      className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg transition-colors font-medium"
                    >
                      {extendingFile === selectedFileData.id ? "Extending..." : "Extend File"}
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  );
}
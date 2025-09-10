import React, { useState, useRef } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { useBackgroundProgress } from './BackgroundManager';
import { useNavigate } from 'react-router';

interface FileInfo {
  id: string;
  file: File;
  name: string;
  relativePath: string; // Store the full path including folders
  size: number;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  uploadId?: string;
  key?: string;
  error?: string;
}

interface TransferFormData {
  files: FileInfo[];
}

// Smart chunk size calculation to stay within R2's 10,000 part limit
const getChunkSize = (fileSize: number): number => {
  const MB = 1024 * 1024;
  const GB = 1024 * MB;
  
  // Single upload for files < 5MB (avoids multipart overhead)
  if (fileSize < 5 * MB) {
    return fileSize;
  }
  
  // Calculate chunk size to stay within 10,000 part limit
  const MAX_PARTS = 10000;
  const MIN_CHUNK_SIZE = 5 * MB; // R2 minimum
  const MAX_CHUNK_SIZE = 5 * GB; // R2 maximum
  
  // Calculate optimal chunk size for this file
  let optimalChunkSize = Math.ceil(fileSize / MAX_PARTS);
  
  // Ensure chunk size is within R2 limits
  optimalChunkSize = Math.max(MIN_CHUNK_SIZE, optimalChunkSize);
  optimalChunkSize = Math.min(MAX_CHUNK_SIZE, optimalChunkSize);
  
  return optimalChunkSize;
};

export function TransferForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<TransferFormData>({
    files: []
  });
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [transferId, setTransferId] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  
  // Background progress integration
  const { setProgress, setIsUploading: setBackgroundUploading } = useBackgroundProgress();

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileSelect = (files: FileList | null, isFolder = false) => {
    if (!files) return;
    
    const newFiles: FileInfo[] = Array.from(files).map(file => {
      // For folder uploads, use webkitRelativePath; for regular files, use file.name
      const relativePath = isFolder && (file as any).webkitRelativePath 
        ? (file as any).webkitRelativePath 
        : file.name;
      
      return {
        id: crypto.randomUUID(),
        file,
        name: file.name,
        relativePath,
        size: file.size,
        progress: 0,
        status: 'pending' as const
      };
    });
    
    setFormData(prev => ({ ...prev, files: [...prev.files, ...newFiles] }));
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files, false);
  };

  const handleFolderInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files, true);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const removeFile = (fileId: string) => {
    setFormData(prev => ({
      ...prev,
      files: prev.files.filter(file => file.id !== fileId)
    }));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isFormValid = () => {
    return formData.files.length > 0;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid()) return;

    console.log('🚀 Starting upload process...');
    setIsUploading(true);
    setBackgroundUploading(true);
    setProgress(0);
    
    try {
      console.log('📡 Step 1: Creating transfer...');
      // Step 1: Create transfer and get upload URLs
      const transferResponse = await fetch('/api/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: formData.files.map(f => ({
            filename: f.relativePath, // Use full path including folders
            filesize: f.size
          }))
        })
      });

      if (!transferResponse.ok) {
        const errorData = await transferResponse.json().catch(() => ({ error: 'Unknown error' })) as { error?: string };
        throw new Error(`Failed to create transfer: ${errorData.error || 'Unknown error'}`);
      }

      const transferData = await transferResponse.json() as {
        transferId: string;
        files: Array<{
          fileId: string;
          filename: string;
          uploadId: string;
          key: string;
        }>;
      };
      
      setTransferId(transferData.transferId);
      
      // Update files with upload metadata
      setFormData(prev => ({
        ...prev,
        files: prev.files.map((file, index) => ({
          ...file,
          uploadId: transferData.files[index].uploadId,
          key: transferData.files[index].key,
          status: 'uploading' as const
        }))
      }));
      
      console.log('📤 Step 2: Starting file uploads...');
      // Step 2: Upload files and complete uploads
      const uploadPromises = formData.files.map(async (fileInfo, index) => {
        const fileData = transferData.files[index];
        const uploadParts = await uploadFileSimple(fileInfo, fileData);
        
        if (uploadParts.length > 0) {
          return await completeFileUpload(transferData.transferId, fileData, uploadParts);
        }
        return null;
      });

      await Promise.all(uploadPromises);
      
      // Set download URL and completion status
      const baseUrl = window.location.origin;
      const downloadLink = `${baseUrl}/file/${transferData.transferId}`;
      setDownloadUrl(downloadLink);
      setUploadComplete(true);
      setProgress(100);
      
      // Auto-redirect to file page after 2 seconds
      setTimeout(() => {
        setBackgroundUploading(false);
        setProgress(0);
        navigate(`/file/${transferData.transferId}`);
      }, 2000);
      
    } catch (error) {
      console.error('Transfer failed:', error);
      alert('Transfer failed. Please try again.');
    } finally {
      setIsUploading(false);
      if (!uploadComplete) {
        setBackgroundUploading(false);
        setProgress(0);
      }
    }
  };

  const uploadFileSimple = async (fileInfo: FileInfo, fileData: any) => {
    const file = fileInfo.file;
    if (!file) {
      throw new Error('File object is missing');
    }
    
    const uploadParts: Array<{ partNumber: number; etag: string }> = [];
    const chunkSize = getChunkSize(file.size);
    const isSingleUpload = chunkSize >= file.size;
    
    // Create abort controller for this file
    const abortController = new AbortController();
    abortControllersRef.current.set(fileInfo.id, abortController);
    
    try {
      // Handle single upload for small files (< 5MB)
      if (isSingleUpload) {
        const response = await fetch(`/api/upload-simple/${encodeURIComponent(fileData.key)}`, {
          method: 'PUT',
          body: file,
          signal: abortController.signal,
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
            'Content-Length': file.size.toString()
          }
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
        }
        
        // Update progress
        setProgress(100);
        setFormData(prev => ({
          ...prev,
          files: prev.files.map(f => 
            f.id === fileInfo.id ? { 
              ...f, 
              progress: 100,
              status: 'completed' as const
            } : f
          )
        }));

        // Return a single "part" for compatibility
        return [{
          partNumber: 1,
          etag: 'single-upload'
        }];
      }

      // Handle multipart upload for larger files
      const totalChunks = Math.ceil(file.size / chunkSize);
      let uploadedBytes = 0;

      for (let partNumber = 1; partNumber <= totalChunks; partNumber++) {
        const start = (partNumber - 1) * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('key', fileData.key);
        formData.append('uploadId', fileData.uploadId);
        formData.append('partNumber', partNumber.toString());
        formData.append('chunk', chunk);

        const response = await fetch('/api/uploads/chunk', {
          method: 'POST',
          body: formData,
          signal: abortController.signal
        });

        if (!response.ok) {
          throw new Error(`Upload failed for part ${partNumber}: ${response.status} ${response.statusText}`);
        }

        const result = await response.json() as { partNumber: number; etag: string };
        uploadParts.push({
          partNumber: result.partNumber,
          etag: result.etag
        });

        // Update progress
        uploadedBytes += chunk.size;
        const progress = Math.round((uploadedBytes / file.size) * 100);
        setProgress(progress);
        
        setFormData(prev => ({
          ...prev,
          files: prev.files.map(f => 
            f.id === fileInfo.id ? { 
              ...f, 
              progress,
              status: 'uploading' as const
            } : f
          )
        }));
      }

      // Mark as completed
      setFormData(prev => ({
        ...prev,
        files: prev.files.map(f => 
          f.id === fileInfo.id ? { 
            ...f, 
            status: 'completed' as const
          } : f
        )
      }));

      return uploadParts;
      
    } catch (error) {
      setFormData(prev => ({
        ...prev,
        files: prev.files.map(f => 
          f.id === fileInfo.id ? { 
            ...f, 
            status: 'error' as const,
            error: error instanceof Error ? error.message : 'Upload failed'
          } : f
        )
      }));
      throw error;
    } finally {
      abortControllersRef.current.delete(fileInfo.id);
    }
  };

  const completeFileUpload = async (transferId: string, fileData: any, uploadParts: any[]) => {
    if (!uploadParts || uploadParts.length === 0) {
      return null;
    }
    
    const completeResponse = await fetch('/api/transfers/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transferId,
        key: fileData.key,
        uploadId: fileData.uploadId,
        parts: uploadParts
      })
    });

    if (!completeResponse.ok) {
      throw new Error('Failed to complete file upload');
    }

    const result = await completeResponse.json();
    return result;
  };

  const resetForm = () => {
    // Cancel all ongoing uploads
    abortControllersRef.current.forEach(controller => controller.abort());
    abortControllersRef.current.clear();
    
    setFormData({
      files: []
    });
    setUploadComplete(false);
    setDownloadUrl('');
    setTransferId('');
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(downloadUrl);
      alert('Download link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const getStatusIcon = (status: FileInfo['status']) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'uploading': return '📤';
      case 'completed': return '✅';
      case 'error': return '❌';
      default: return '📄';
    }
  };

  const getStatusColor = (status: FileInfo['status']) => {
    switch (status) {
      case 'pending': return 'text-gray-500';
      case 'uploading': return 'text-blue-600';
      case 'completed': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-500';
    }
  };

  if (uploadComplete) {
    return (
      <div className="text-center">
        <div className="text-green-500 text-2xl mb-2">✅</div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">Transfer Complete!</h2>
        

        {/* Download Link */}
        <div className="bg-gray-50 rounded-lg p-3 mb-3">
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Download Link
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={downloadUrl}
              readOnly
              className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md bg-white text-xs"
            />
            <button
              type="button"
              onClick={copyToClipboard}
              className="px-2 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs"
            >
              Copy
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1 font-light">
            This link will expire in 24 hours
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-green-600 text-white py-2 px-3 rounded-md hover:bg-green-700 transition-colors text-xs"
          >
            View Download Page
          </a>
          <button
            type="button"
            onClick={resetForm}
            className="block w-full bg-gray-600 text-white py-2 px-3 rounded-md hover:bg-gray-700 transition-colors text-xs"
          >
            Send Another Transfer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Upload Area - Simplified */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {/* Add files button */}
            <div
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 ${
                isDragOver
                  ? 'border-blue-500 bg-blue-50 scale-105'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="space-y-2">
                <div className="text-2xl">📄</div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">+ Add files</p>
                  <p className="text-xs text-gray-500 mt-1 font-light">No file size limit</p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileInputChange}
                className="hidden"
              />
            </div>

            {/* Add folder button */}
            <div 
              className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 border-gray-300 hover:border-green-400 hover:bg-green-50"
              onClick={() => folderInputRef.current?.click()}
            >
              <div className="space-y-2">
                <div className="text-2xl">📁</div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">+ Add folders</p>
                  <p className="text-xs text-gray-500 mt-1 font-light">Upload entire directories</p>
                </div>
              </div>
              <input
                ref={folderInputRef}
                type="file"
                {...({ webkitdirectory: "true", directory: "true" } as any)}
                onChange={handleFolderInputChange}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* File List */}
        {formData.files.length > 0 && (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-700">
              Selected Files
            </label>
            <div className="space-y-2">
              {formData.files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-base">{getStatusIcon(file.status)}</span>
                      <div>
                        <p className="text-xs font-medium text-gray-900">
                          {file.relativePath !== file.name ? file.relativePath : file.name}
                        </p>
                        {file.relativePath !== file.name && (
                          <p className="text-xs text-blue-600 font-light">
                            📁 {file.relativePath.split('/').slice(0, -1).join('/')}
                          </p>
                        )}
                        <p className="text-xs text-gray-500 font-light">
                          {formatFileSize(file.size)}
                        </p>
                        <p className={`text-xs font-light ${getStatusColor(file.status)}`}>
                          {file.status === 'pending' && 'Waiting to upload'}
                          {file.status === 'uploading' && `Uploading... ${file.progress}%`}
                          {file.status === 'completed' && 'Upload complete'}
                          {file.status === 'error' && `Error: ${file.error || 'Upload failed'}`}
                        </p>
                      </div>
                    </div>
                    {file.status === 'uploading' && (
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {/* Remove File Button */}
                    <button
                      type="button"
                      onClick={() => removeFile(file.id)}
                      className="text-red-500 hover:text-red-700"
                      disabled={file.status === 'uploading'}
                      title="Remove file"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* Upload Progress */}
        {isUploading && (
          <div className="bg-blue-50 rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-blue-900">Uploading files...</span>
              <span className="text-sm text-blue-700 font-light">
                {formData.files.filter(f => f.status === 'completed').length} / {formData.files.length} files completed
              </span>
            </div>
          </div>
        )}


        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isFormValid() || isUploading}
          className={`w-full py-3 px-4 rounded-lg font-semibold text-sm text-white transition-all duration-200 ${
            !isFormValid() || isUploading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200'
          }`}
        >
          {isUploading ? 'Uploading...' : 'Transfer'}
        </button>
      </form>
    </div>
  );
}

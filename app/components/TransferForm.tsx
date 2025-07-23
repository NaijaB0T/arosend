import React, { useState, useRef } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import { useBackgroundProgress } from './BackgroundManager';
import { useNavigate } from 'react-router';

// Enhanced network monitoring and adaptation
class NetworkAdapter {
  private static instance: NetworkAdapter | null = null;
  private speedHistory: number[] = [];
  private currentBandwidth = 0;
  private connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'unstable' = 'good';
  private speedTestResults: Array<{ timestamp: number; speed: number; latency: number }> = [];
  
  static getInstance(): NetworkAdapter {
    if (!NetworkAdapter.instance) {
      NetworkAdapter.instance = new NetworkAdapter();
    }
    return NetworkAdapter.instance;
  }
  
  async measureNetworkSpeed(): Promise<{ speed: number; latency: number }> {
    try {
      // Use Navigator Connection API for speed and estimate latency
      if ('connection' in navigator && (navigator as any).connection) {
        const connection = (navigator as any).connection;
        const speed = connection.downlink || 5;
        const latency = connection.rtt || 100; // Use built-in RTT if available
        
        this.currentBandwidth = speed;
        this.updateConnectionQuality(speed, latency);
        
        this.speedTestResults.push({ timestamp: Date.now(), speed, latency });
        if (this.speedTestResults.length > 10) {
          this.speedTestResults.shift();
        }
        
        return { speed, latency };
      }
      
      // Fallback when Connection API is not available
      const estimatedSpeed = 5;
      const estimatedLatency = 100;
      this.currentBandwidth = estimatedSpeed;
      this.updateConnectionQuality(estimatedSpeed, estimatedLatency);
      
      return { speed: estimatedSpeed, latency: estimatedLatency };
    } catch (error) {
      console.warn('Network measurement failed:', error);
      return { speed: 5, latency: 100 };
    }
  }
  
  private updateConnectionQuality(speedMbps: number, latency: number) {
    if (speedMbps >= 50 && latency < 50) {
      this.connectionQuality = 'excellent';
    } else if (speedMbps >= 25 && latency < 100) {
      this.connectionQuality = 'good';
    } else if (speedMbps >= 10 && latency < 200) {
      this.connectionQuality = 'fair';
    } else if (speedMbps >= 1 && latency < 500) {
      this.connectionQuality = 'poor';
    } else {
      this.connectionQuality = 'unstable';
    }
  }
  
  getAdaptiveChunkSize(fileSize: number, partNumber?: number): number {
    const MB = 1024 * 1024;
    const GB = 1024 * MB;
    
    // For files smaller than 5MB, use single upload (no chunking) to avoid R2 multipart limits
    if (fileSize < 5 * MB) {
      return fileSize; // Return full file size to indicate single upload
    }
    
    let baseChunkSize: number;
    if (fileSize < 100 * MB) {
      baseChunkSize = 5 * MB; // Minimum 5MB for R2 multipart upload compliance
    } else if (fileSize < 1 * GB) {
      baseChunkSize = 8 * MB; // Slightly larger for efficiency
    } else if (fileSize < 10 * GB) {
      baseChunkSize = 15 * MB; // Optimized for large files
    } else {
      baseChunkSize = 25 * MB; // Large chunks for very big files
    }
    
    // Use smaller chunks for initial network testing (first 3 chunks)
    if (partNumber && partNumber <= 3) {
      baseChunkSize = Math.max(5 * MB, Math.min(baseChunkSize, 5 * MB)); // Start with 5MB for testing
      console.log(`🧪 Using test chunk size ${this.formatBytes(baseChunkSize)} for part ${partNumber}`);
    }
    
    let speedMultiplier = 1;
    switch (this.connectionQuality) {
      case 'excellent': speedMultiplier = 1.8; break;
      case 'good': speedMultiplier = 1.4; break;
      case 'fair': speedMultiplier = 1.0; break;
      case 'poor': speedMultiplier = 0.8; break; // Reduced but keeping above 5MB minimum
      case 'unstable': speedMultiplier = 0.7; break; // Reduced but keeping above 5MB minimum
    }
    
    const adaptiveChunkSize = Math.round(baseChunkSize * speedMultiplier);
    // Ensure we never go below 5MB for multipart uploads (R2 requirement)
    // and never above 50MB for efficiency
    return Math.max(5 * MB, Math.min(50 * MB, adaptiveChunkSize));
  }
  
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  getAdaptiveConcurrency(fileSize: number, totalChunks: number, isDevelopment: boolean): number {
    const MB = 1024 * 1024;
    const GB = 1024 * MB;
    
    let baseConcurrency: number;
    if (isDevelopment) {
      // Very conservative for development to prevent server crashes
      baseConcurrency = Math.min(3, Math.max(1, Math.ceil(totalChunks * 0.05)));
    } else {
      // Production settings optimized for Nigerian networks
      if (fileSize < 100 * MB) {
        baseConcurrency = Math.min(4, Math.max(2, totalChunks)); // Reduced from 8
      } else if (fileSize < 1 * GB) {
        baseConcurrency = Math.min(6, Math.max(3, Math.ceil(totalChunks * 0.1))); // Reduced
      } else if (fileSize < 10 * GB) {
        baseConcurrency = Math.min(8, Math.max(4, Math.ceil(totalChunks * 0.08))); // More conservative
      } else {
        baseConcurrency = Math.min(12, Math.max(6, Math.ceil(totalChunks * 0.04))); // Much more conservative
      }
    }
    
    let qualityMultiplier = 1;
    switch (this.connectionQuality) {
      case 'excellent': qualityMultiplier = 1.5; break;
      case 'good': qualityMultiplier = 1.2; break;
      case 'fair': qualityMultiplier = 1.0; break;
      case 'poor': qualityMultiplier = 0.8; break; // Increased from 0.7 for better performance
      case 'unstable': qualityMultiplier = 0.5; break; // Increased from 0.4 for reliability
    }
    
    const adaptiveConcurrency = Math.round(baseConcurrency * qualityMultiplier);
    // More conservative limits for Nigerian market
    const maxConcurrency = isDevelopment ? 4 : 12; // Reduced from 6:32
    const minConcurrency = 1; // Always allow at least 1
    
    return Math.max(minConcurrency, Math.min(maxConcurrency, adaptiveConcurrency));
  }
  
  getAdaptiveRetryDelay(baseDelay: number, retryCount: number): number {
    let qualityMultiplier = 1;
    switch (this.connectionQuality) {
      case 'excellent': qualityMultiplier = 0.5; break;
      case 'good': qualityMultiplier = 0.8; break;
      case 'fair': qualityMultiplier = 1.0; break;
      case 'poor': qualityMultiplier = 1.5; break; // Reduced from 2.0 for faster recovery
      case 'unstable': qualityMultiplier = 3.0; break; // Reduced from 4.0
    }
    
    // Progressive timeout increases for slow networks
    let progressiveMultiplier = 1;
    if (this.connectionQuality === 'poor' || this.connectionQuality === 'unstable') {
      progressiveMultiplier = 1 + (retryCount * 0.5); // Increase delay by 50% per retry for slow networks
    }
    
    // Cap maximum retry delay at 60 seconds for slow networks, 30 seconds for others
    const maxDelay = (this.connectionQuality === 'poor' || this.connectionQuality === 'unstable') ? 60000 : 30000;
    const delay = baseDelay * Math.pow(2, retryCount) * qualityMultiplier * progressiveMultiplier;
    return Math.min(delay, maxDelay);
  }
  
  getAdaptiveTimeout(baseTimeout: number, partNumber: number): number {
    let timeoutMultiplier = 1;
    switch (this.connectionQuality) {
      case 'excellent': timeoutMultiplier = 0.8; break;
      case 'good': timeoutMultiplier = 1.0; break;
      case 'fair': timeoutMultiplier = 1.2; break;
      case 'poor': timeoutMultiplier = 2.0; break;
      case 'unstable': timeoutMultiplier = 3.0; break;
    }
    
    // Longer timeout for initial chunks as they're testing the network
    if (partNumber <= 3) {
      timeoutMultiplier *= 1.5;
    }
    
    return Math.min(baseTimeout * timeoutMultiplier, 180000); // Max 3 minutes
  }
  
  async monitorAndAdapt(uploadStartTime: number, bytesUploaded: number, consecutiveSuccesses?: number) {
    const currentTime = performance.now();
    const elapsedSeconds = (currentTime - uploadStartTime) / 1000;
    
    if (elapsedSeconds > 5) {
      const currentSpeed = (bytesUploaded * 8) / (1024 * 1024 * elapsedSeconds);
      this.speedHistory.push(currentSpeed);
      if (this.speedHistory.length > 10) {
        this.speedHistory.shift();
      }
      
      const avgSpeed = this.speedHistory.reduce((a, b) => a + b, 0) / this.speedHistory.length;
      const speedVariation = Math.abs(currentSpeed - avgSpeed) / avgSpeed;
      
      if (speedVariation > 0.3) {
        this.updateConnectionQuality(avgSpeed, 100);
        return { shouldAdjust: true, newSpeed: avgSpeed, quality: this.connectionQuality };
      }
    }
    
    // Check if we should recommend larger chunk sizes based on consecutive successes
    if (consecutiveSuccesses && consecutiveSuccesses >= 5) {
      return { 
        shouldAdjust: true, 
        recommendLargerChunks: true, 
        consecutiveSuccesses,
        quality: this.connectionQuality 
      };
    }
    
    return { shouldAdjust: false };
  }
  
  getOptimalChunkSizeForPart(baseChunkSize: number, partNumber: number, consecutiveSuccesses: number): number {
    const MB = 1024 * 1024;
    
    // Start with test size for first 3 chunks
    if (partNumber <= 3) {
      return Math.max(5 * MB, Math.min(baseChunkSize, 5 * MB));
    }
    
    // Gradually increase chunk size based on consecutive successes
    let sizeMultiplier = 1;
    if (consecutiveSuccesses >= 5 && this.connectionQuality !== 'poor' && this.connectionQuality !== 'unstable') {
      // Increase chunk size by 25% for every 5 consecutive successes, up to 2x base size
      const increments = Math.floor(consecutiveSuccesses / 5);
      sizeMultiplier = Math.min(1 + (increments * 0.25), 2.0);
      console.log(`📈 Increasing chunk size by ${Math.round((sizeMultiplier - 1) * 100)}% due to ${consecutiveSuccesses} consecutive successes`);
    }
    
    const adaptiveSize = Math.round(baseChunkSize * sizeMultiplier);
    // Ensure we stay within R2 limits
    return Math.max(5 * MB, Math.min(50 * MB, adaptiveSize));
  }
  
  getNetworkStats() {
    return {
      quality: this.connectionQuality,
      bandwidth: this.currentBandwidth,
      speedHistory: [...this.speedHistory],
      recentTests: [...this.speedTestResults]
    };
  }
}

interface FileInfo {
  id: string;
  file: File;
  name: string;
  size: number;
  progress: number;
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'error';
  uploadId?: string;
  key?: string;
  uploadedParts?: Array<{ partNumber: number; etag: string }>;
  currentPart?: number;
  error?: string;
}

interface TransferFormData {
  files: FileInfo[];
}

// Streaming file reader for memory-efficient chunk processing
class StreamingFileReader {
  private file: File;
  private chunkSize: number;
  private position: number = 0;

  constructor(file: File, chunkSize: number) {
    this.file = file;
    this.chunkSize = chunkSize;
  }

  async* readChunks(): AsyncGenerator<{ chunk: Blob; partNumber: number; isLast: boolean }> {
    let partNumber = 1;
    
    while (this.position < this.file.size) {
      const end = Math.min(this.position + this.chunkSize, this.file.size);
      const chunk = this.file.slice(this.position, end);
      const isLast = end >= this.file.size;
      
      yield { chunk, partNumber, isLast };
      
      this.position = end;
      partNumber++;
      
      // Allow garbage collection of previous chunk
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  reset() {
    this.position = 0;
  }

  seekToChunk(partNumber: number) {
    this.position = (partNumber - 1) * this.chunkSize;
  }

  getChunk(partNumber: number, customChunkSize?: number): Blob {
    const chunkSize = customChunkSize || this.chunkSize;
    const start = (partNumber - 1) * this.chunkSize; // Use original chunk boundaries
    const end = Math.min(start + chunkSize, this.file.size);
    return this.file.slice(start, end);
  }

  getTotalChunks(): number {
    return Math.ceil(this.file.size / this.chunkSize);
  }
}

// Streaming concurrent upload with memory management
async function streamingConcurrentUpload(
  fileReader: StreamingFileReader,
  uploadParts: Array<{ partNumber: number; etag: string }>,
  startPart: number,
  totalChunks: number,
  concurrency: number,
  uploadCallback: (partNumber: number, chunk: Blob) => Promise<{ partNumber: number; etag: string }>
): Promise<void> {
  const uploadedPartNumbers = new Set(uploadParts.map(p => p.partNumber));
  const chunkQueue: Array<{ chunk: Blob; partNumber: number; isLast: boolean }> = [];
  const activeUploads = new Map<number, Promise<{ partNumber: number; etag: string }>>();
  
  // Memory monitoring
  MemoryMonitor.logMemoryUsage('Streaming Upload Start');
  
  // Start reading chunks from the file
  const chunkIterator = fileReader.readChunks();
  
  let readingComplete = false;
  let currentConcurrency = 0;
  
  const processNextChunk = async (): Promise<void> => {
    // Read next chunk if queue is not full and reading is not complete
    if (chunkQueue.length < concurrency * 2 && !readingComplete) {
      const result = await chunkIterator.next();
      if (result.done) {
        readingComplete = true;
      } else {
        const { chunk, partNumber, isLast } = result.value;
        
        // Only queue chunks that haven't been uploaded yet
        if (!uploadedPartNumbers.has(partNumber)) {
          chunkQueue.push({ chunk, partNumber, isLast });
          
          // Log memory usage periodically
          if (partNumber % 10 === 0) {
            MemoryMonitor.logMemoryUsage(`Chunk ${partNumber}`);
          }
        }
      }
    }
    
    // Start uploads from queue if we have capacity
    while (chunkQueue.length > 0 && currentConcurrency < concurrency) {
      const chunkData = chunkQueue.shift()!;
      currentConcurrency++;
      
      const uploadPromise = uploadCallback(chunkData.partNumber, chunkData.chunk)
        .then(result => {
          uploadParts.push(result);
          currentConcurrency--;
          
          // Force garbage collection every 5 completed uploads
          if (uploadParts.length % 5 === 0) {
            MemoryMonitor.forceGarbageCollection();
          }
          
          return result;
        })
        .catch(error => {
          currentConcurrency--;
          // Propagate pause/cancel errors to stop the streaming process
          if (error instanceof Error && (error.message === 'Upload paused' || error.message === 'Upload cancelled')) {
            throw error;
          }
          throw error;
        });
      
      activeUploads.set(chunkData.partNumber, uploadPromise);
    }
  };
  
  // Main processing loop
  while (!readingComplete || chunkQueue.length > 0 || activeUploads.size > 0) {
    await processNextChunk();
    
    // Wait for at least one upload to complete if we're at capacity
    if (activeUploads.size > 0 && (currentConcurrency >= concurrency || chunkQueue.length === 0)) {
      const completedUpload = await Promise.race(activeUploads.values());
      
      // Remove completed upload from active set
      for (const [partNumber, promise] of activeUploads.entries()) {
        if (await promise.then(() => true).catch(() => false)) {
          activeUploads.delete(partNumber);
          break;
        }
      }
    }
    
    // Small delay to prevent tight loops
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  
  MemoryMonitor.logMemoryUsage('Streaming Upload Complete');
}

// Memory monitoring utilities
class MemoryMonitor {
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static logMemoryUsage(context: string) {
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      console.log(`🧠 Memory [${context}]:`, {
        used: this.formatBytes(memory.usedJSHeapSize),
        total: this.formatBytes(memory.totalJSHeapSize),
        limit: this.formatBytes(memory.jsHeapSizeLimit)
      });
    }
  }

  static async forceGarbageCollection() {
    // Force garbage collection if available (dev tools)
    if ('gc' in window) {
      (window as any).gc();
    }
    
    // Alternative: trigger GC through memory pressure
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}

export function TransferForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<TransferFormData>({
    files: []
  });
  
  // Global error handler to prevent unhandled promise rejections
  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Silently handle upload-related errors to prevent UI disruption
      if (event.reason?.message?.includes('fetch') || 
          event.reason?.message?.includes('500') ||
          event.reason?.message?.includes('Network error')) {
        event.preventDefault();
        console.warn('Upload error handled silently:', event.reason?.message);
      }
    };
    
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [transferId, setTransferId] = useState<string>('');
  const [pausedUploads, setPausedUploads] = useState<Set<string>>(new Set());
  const [networkInfo, setNetworkInfo] = useState<{
    speed: 'fast' | 'medium' | 'slow';
    quality: 'excellent' | 'good' | 'fair' | 'poor' | 'unstable';
    bandwidth: number;
    latency: number;
  }>({ speed: 'medium', quality: 'fair', bandwidth: 5, latency: 100 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  
  // Background progress integration
  const { setProgress, setIsUploading: setBackgroundUploading } = useBackgroundProgress();

  // Initialize network detection on component mount
  React.useEffect(() => {
    const initNetworkDetection = async () => {
      try {
        const netInfo = await detectNetworkCondition();
        setNetworkInfo(netInfo);
      } catch (error) {
        console.warn('Initial network detection failed:', error);
      }
    };
    
    initNetworkDetection();
    
    // Re-detect network conditions every 30 seconds
    const networkInterval = setInterval(initNetworkDetection, 30000);
    
    return () => clearInterval(networkInterval);
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    const newFiles: FileInfo[] = Array.from(files).map(file => ({
      id: crypto.randomUUID(),
      file,
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'pending' as const,
      uploadedParts: [],
      currentPart: 0
    }));
    
    setFormData(prev => ({ ...prev, files: [...prev.files, ...newFiles] }));
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
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

  // Enhanced chunk size calculation with network adaptation
  const calculateOptimalChunkSize = async (fileSize: number): Promise<number> => {
    const networkAdapter = NetworkAdapter.getInstance();
    
    // Get network-adaptive chunk size
    const adaptiveChunkSize = networkAdapter.getAdaptiveChunkSize(fileSize);
    
    console.log(`🧩 Adaptive chunk size: ${formatFileSize(adaptiveChunkSize)} (based on network conditions)`);
    
    return adaptiveChunkSize;
  };

  // Enhanced network detection with real-time measurement
  const detectNetworkCondition = async (): Promise<{
    speed: 'fast' | 'medium' | 'slow';
    quality: 'excellent' | 'good' | 'fair' | 'poor' | 'unstable';
    bandwidth: number;
    latency: number;
  }> => {
    const networkAdapter = NetworkAdapter.getInstance();
    
    try {
      // Perform real-time speed test
      const speedTest = await networkAdapter.measureNetworkSpeed();
      const stats = networkAdapter.getNetworkStats();
      
      // Map to legacy speed categories for backward compatibility
      let speedCategory: 'fast' | 'medium' | 'slow';
      if (speedTest.speed >= 25) {
        speedCategory = 'fast';
      } else if (speedTest.speed >= 5) {
        speedCategory = 'medium';
      } else {
        speedCategory = 'slow';
      }
      
      return {
        speed: speedCategory,
        quality: stats.quality,
        bandwidth: speedTest.speed,
        latency: speedTest.latency
      };
    } catch (error) {
      console.warn('Network detection failed, using fallback:', error);
      
      // Fallback to Navigator Connection API
      if ('connection' in navigator && (navigator as any).connection) {
        const connection = (navigator as any).connection;
        const effectiveType = connection.effectiveType;
        const downlink = connection.downlink || 1;
        
        let speedCategory: 'fast' | 'medium' | 'slow';
        if (effectiveType === '4g' || downlink > 10) {
          speedCategory = 'fast';
        } else if (effectiveType === '3g' || downlink > 1.5) {
          speedCategory = 'medium';
        } else {
          speedCategory = 'slow';
        }
        
        return {
          speed: speedCategory,
          quality: downlink > 25 ? 'excellent' : downlink > 10 ? 'good' : downlink > 5 ? 'fair' : 'poor',
          bandwidth: downlink,
          latency: connection.rtt || 100
        };
      }
      
      // Ultimate fallback
      return {
        speed: 'medium',
        quality: 'fair',
        bandwidth: 5,
        latency: 100
      };
    }
  };

  // Enhanced concurrency calculation with network adaptation
  const calculateOptimalConcurrency = async (fileSize: number, chunkCount: number): Promise<number> => {
    // Detect development vs production environment
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.port === '5173';
    
    const networkAdapter = NetworkAdapter.getInstance();
    
    // Get network-adaptive concurrency
    const adaptiveConcurrency = networkAdapter.getAdaptiveConcurrency(fileSize, chunkCount, isDevelopment);
    
    console.log(`⚡ Adaptive concurrency: ${adaptiveConcurrency} (based on network quality)`);
    
    return adaptiveConcurrency;
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
            filename: f.name,
            filesize: f.size
          }))
        })
      });

      console.log('📡 Transfer response status:', transferResponse.status);
      
      if (!transferResponse.ok) {
        const errorData = await transferResponse.json().catch(() => ({ error: 'Unknown error' })) as { error?: string };
        console.error('❌ Transfer creation failed:', errorData);
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
      
      console.log('✅ Transfer created successfully:', transferData.transferId);
      console.log('📋 Files to upload:', transferData.files.length);
      
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
      
      // Save upload state for resumption
      console.log('💾 Saving upload state...');
      saveUploadState({ transferId: transferData.transferId, formData });
      
      console.log('📤 Step 2: Starting file uploads...');
      // Step 2: Upload files in chunks and complete uploads
      const uploadPromises = formData.files.map(async (fileInfo, index) => {
        console.log(`🔄 Starting upload for file ${index + 1}/${formData.files.length}: ${fileInfo.name}`);
        const fileData = transferData.files[index];
        const uploadParts = await uploadFileInChunks(fileInfo, fileData);
        
        // Only complete upload if we have parts (not paused)
        if (uploadParts.length > 0) {
          return await completeFileUpload(transferData.transferId, fileData, uploadParts);
        }
        return null; // Paused upload
      });

      const results = await Promise.allSettled(uploadPromises);
      
      // Check if any uploads completed successfully
      const completedUploads = results.filter(result => 
        result.status === 'fulfilled' && result.value !== null
      );
      
      // Only show completion if at least one file completed
      if (completedUploads.length > 0) {
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
        }, 2000); // Show completion for 2 seconds then redirect
        clearUploadState();
      }
      
    } catch (error) {
      // Don't show error for pause/abort operations
      if (error instanceof Error && (error.name === 'AbortError' || error.message === 'Upload paused')) {
        console.log('Upload paused by user');
      } else {
        console.error('Transfer failed:', error);
        alert('Transfer failed. Please try again.');
      }
    } finally {
      setIsUploading(false);
      if (!uploadComplete) {
        setBackgroundUploading(false);
        setProgress(0);
      }
    }
  };

  const uploadFileInChunks = async (fileInfo: FileInfo, fileData: any) => {
    const file = fileInfo.file;
    if (!file) {
      console.error('❌ No file object found in fileInfo');
      throw new Error('File object is missing');
    }
    
    // Declare variables outside try block for scope accessibility
    const uploadParts = [...(fileInfo.uploadedParts || [])];
    const chunkProgress = new Map<number, number>();
    const chunkSizes = new Map<number, number>();
    
    try {
      // Log initial memory usage
      MemoryMonitor.logMemoryUsage('Upload Start');
      
      // Get network information and adaptive settings
      const detectedNetworkInfo = await detectNetworkCondition();
      setNetworkInfo(detectedNetworkInfo);
      const networkAdapter = NetworkAdapter.getInstance();
      
      const BASE_CHUNK_SIZE = await calculateOptimalChunkSize(file.size);
      const isSingleUpload = BASE_CHUNK_SIZE >= file.size; // Single upload if chunk size equals or exceeds file size
      const chunks = isSingleUpload ? 1 : Math.ceil(file.size / BASE_CHUNK_SIZE);
      let CONCURRENT_UPLOADS = await calculateOptimalConcurrency(file.size, chunks);
      const MAX_RETRIES = 3;
      const RETRY_DELAY = 1000; // Base retry delay
      const BASE_TIMEOUT = 60000; // Base timeout of 60 seconds
      
      // Track upload start time for bandwidth monitoring
      const uploadStartTime = performance.now();
      let totalBytesUploaded = 0;
      let consecutiveSuccesses = 0;
      let lastSuccessTime = uploadStartTime;
      
      // Create streaming file reader for memory-efficient processing
      const fileReader = new StreamingFileReader(file, BASE_CHUNK_SIZE);
      
      // Detect development environment
      const isDevelopment = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' ||
                           window.location.port === '5173';
      
      // Circuit breaker for server overload
      let serverErrorCount = 0;
      const MAX_SERVER_ERRORS = isDevelopment ? 2 : 5; // Lower threshold for development
      let serverHealthy = true;
      
      console.log(`🌐 Network Quality: ${detectedNetworkInfo.quality} (${detectedNetworkInfo.bandwidth.toFixed(1)} Mbps, ${detectedNetworkInfo.latency.toFixed(0)}ms latency)`);
      console.log(`📁 File: ${file.name} (${formatFileSize(file.size)})`);
      if (isSingleUpload) {
        console.log(`📦 Upload mode: Single upload (file < 5MB, avoiding R2 multipart limits)`);
      } else {
        console.log(`🧩 Base chunk size: ${formatFileSize(BASE_CHUNK_SIZE)} (${chunks} chunks total)`);
        console.log(`⚡ Concurrency: ${CONCURRENT_UPLOADS} parallel uploads`);
        console.log(`🧪 First 3 chunks will use smaller sizes for network testing`);
      }
      console.log(`🎯 Environment: ${isDevelopment ? 'Development' : 'Production'} mode`);
      
      const startPart = (fileInfo.currentPart || 0) + 1;

      // Create abort controller for this file
      const abortController = new AbortController();
      abortControllersRef.current.set(fileInfo.id, abortController);

      // Handle single upload for small files (< 5MB)
      if (isSingleUpload) {
        console.log('📦 Starting single file upload...');
        
        try {
          // Use simple PUT upload instead of multipart
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

          console.log('✅ Single file upload completed successfully');
          
          // Return a single "part" for compatibility with completion logic
          return [{
            partNumber: 1,
            etag: 'single-upload' // Placeholder etag for single uploads
          }];
          
        } catch (error) {
          console.error('❌ Single upload failed:', error);
          throw error;
        }
      }

      // Function to update real-time progress
      const updateRealTimeProgress = () => {
        // Calculate total bytes uploaded (completed chunks + partial progress)
        let totalBytesUploaded = 0;
        
        // Add bytes from completed chunks
        for (const part of uploadParts) {
          const chunkSize = Math.min(CHUNK_SIZE, file.size - (part.partNumber - 1) * CHUNK_SIZE);
          totalBytesUploaded += chunkSize;
        }
        
        // Add partial progress from currently uploading chunks
        for (const [partNumber, bytesUploaded] of chunkProgress) {
          // Only count if this chunk isn't already completed
          if (!uploadParts.find(p => p.partNumber === partNumber)) {
            totalBytesUploaded += bytesUploaded;
          }
        }
        
        const progress = Math.min(Math.round((totalBytesUploaded / file.size) * 100), 100);
        
        // Update background progress
        setProgress(progress);
        
        setFormData(prev => ({
          ...prev,
          files: prev.files.map(f => 
            f.id === fileInfo.id ? { 
              ...f, 
              progress,
              uploadedParts: [...uploadParts],
              currentPart: uploadParts.length > 0 ? Math.max(...uploadParts.map(p => p.partNumber)) : 0,
              status: 'uploading' as const
            } : f
          )
        }));
      };

      const uploadChunkWithRetry = async (partNumber: number, chunk: Blob, retryCount = 0, dynamicChunkSize?: number): Promise<{ partNumber: number; etag: string }> => {
        try {
          // Use dynamic chunk size if provided, otherwise use original chunk
          const actualChunk = dynamicChunkSize && dynamicChunkSize !== chunk.size ? 
            fileReader.getChunk(partNumber, dynamicChunkSize) : chunk;
          
          // Store chunk size for progress calculation
          chunkSizes.set(partNumber, actualChunk.size);
          chunkProgress.set(partNumber, 0);

          return await new Promise<{ partNumber: number; etag: string }>((resolve, reject) => {
            // Check for pause/abort before starting each upload
            const checkPauseOrAbort = () => {
              if (pausedUploads.has(fileInfo.id)) {
                chunkProgress.delete(partNumber);
                reject(new Error('Upload paused'));
                return true;
              }
              if (abortController.signal.aborted) {
                chunkProgress.delete(partNumber);
                reject(new Error('Upload cancelled'));
                return true;
              }
              return false;
            };

            if (checkPauseOrAbort()) return;

            const xhr = new XMLHttpRequest();
            
            // Suppress console errors for better UX
            const originalConsoleError = console.error;
            const suppressError = () => {
              console.error = () => {}; // Temporarily suppress console errors
              setTimeout(() => {
                console.error = originalConsoleError; // Restore after 100ms
              }, 100);
            };
            
            // Set up progress tracking with pause checks
            xhr.upload.addEventListener('progress', (event) => {
              // Check for pause during upload
              if (pausedUploads.has(fileInfo.id)) {
                xhr.abort();
                return;
              }
              
              if (event.lengthComputable) {
                const previousLoaded = chunkProgress.get(partNumber) || 0;
                chunkProgress.set(partNumber, event.loaded);
                updateRealTimeProgress();
                
                // Update total bytes uploaded for bandwidth monitoring
                totalBytesUploaded += event.loaded - previousLoaded;
                
                // Periodic network adaptation check
                if (partNumber % 5 === 0) {
                  networkAdapter.monitorAndAdapt(uploadStartTime, totalBytesUploaded).then((result: any) => {
                    if (result.shouldAdjust) {
                      console.log(`📊 Network adaptation: Speed changed to ${result.newSpeed?.toFixed(1)} Mbps (${result.quality})`);
                    }
                  }).catch(() => {});
                }
              }
            });

            // Handle completion
            xhr.addEventListener('load', () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                try {
                  const result = JSON.parse(xhr.responseText);
                  // Mark this chunk as fully uploaded
                  chunkProgress.delete(partNumber);
                  
                  // Track consecutive successes for adaptive chunk sizing
                  consecutiveSuccesses++;
                  lastSuccessTime = performance.now();
                  
                  // Check if we should adapt network settings based on success pattern
                  if (consecutiveSuccesses % 5 === 0) {
                    networkAdapter.monitorAndAdapt(uploadStartTime, totalBytesUploaded, consecutiveSuccesses).then((result: any) => {
                      if (result.recommendLargerChunks) {
                        console.log(`🚀 Network proving stable with ${consecutiveSuccesses} consecutive successes - future chunks may be larger`);
                      }
                    }).catch(() => {});
                  }
                  
                  resolve(result);
                } catch (e) {
                  chunkProgress.delete(partNumber);
                  reject(new Error('Invalid JSON response'));
                }
              } else {
                chunkProgress.delete(partNumber);
                reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
              }
            });

            // Handle errors
            xhr.addEventListener('error', () => {
              suppressError(); // Suppress console errors
              chunkProgress.delete(partNumber);
              reject(new Error('Network error'));
            });

            // Handle abort - check if it's pause or cancel
            xhr.addEventListener('abort', () => {
              suppressError(); // Suppress console errors
              chunkProgress.delete(partNumber);
              if (pausedUploads.has(fileInfo.id)) {
                reject(new Error('Upload paused'));
              } else {
                reject(new Error('Upload cancelled'));
              }
            });

            // Handle abort controller
            abortController.signal.addEventListener('abort', () => {
              xhr.abort();
            });

            // Prepare form data
            const chunkFormData = new FormData();
            chunkFormData.append('key', fileData.key);
            chunkFormData.append('uploadId', fileData.uploadId);
            chunkFormData.append('partNumber', partNumber.toString());
            chunkFormData.append('chunk', actualChunk);

            // Set adaptive timeout based on network quality and part number
            const adaptiveTimeout = networkAdapter.getAdaptiveTimeout(BASE_TIMEOUT, partNumber);
            xhr.timeout = adaptiveTimeout;
            xhr.addEventListener('timeout', () => {
              console.error(`⏰ Chunk ${partNumber}/${chunks} timed out after ${Math.round(adaptiveTimeout/1000)} seconds (${detectedNetworkInfo.quality} network)`);
              chunkProgress.delete(partNumber);
              reject(new Error('Upload timeout'));
            });

            // Start upload
            xhr.open('POST', '/api/uploads/chunk');
            xhr.send(chunkFormData);
          });

        } catch (error) {
          chunkProgress.delete(partNumber);
          
          // Reset consecutive successes on any error
          consecutiveSuccesses = 0;
          
          if (error instanceof Error && (error.name === 'AbortError' || error.message === 'Upload paused' || error.message === 'Upload cancelled')) {
            throw error;
          }

          if (retryCount < MAX_RETRIES) {
            // Network-adaptive retry delay
            let retryDelay = networkAdapter.getAdaptiveRetryDelay(RETRY_DELAY, retryCount);
            
            // Track server errors for circuit breaker
            if (error instanceof Error && (
              error.message.includes('500') || 
              error.message.includes('ERR_CONNECTION_ABORTED') ||
              error.message.includes('ERR_EMPTY_RESPONSE') ||
              error.message.includes('Network connection lost')
            )) {
              serverErrorCount++;
              serverHealthy = false;
              retryDelay = retryDelay * (isDevelopment ? 5 : 3); // Longer delays in development
              
              // Circuit breaker: Aggressive reduction for development
              if (serverErrorCount >= MAX_SERVER_ERRORS && CONCURRENT_UPLOADS > (isDevelopment ? 1 : 2)) {
                const reductionFactor = isDevelopment ? 0.3 : 0.5; // More aggressive in dev
                CONCURRENT_UPLOADS = Math.max(isDevelopment ? 1 : 2, Math.floor(CONCURRENT_UPLOADS * reductionFactor));
                console.log(`Circuit breaker: Reducing concurrency to ${CONCURRENT_UPLOADS} due to server issues`);
              }
              
              console.log(`Server issue ${serverErrorCount}/${MAX_SERVER_ERRORS}, extending retry delay for part ${partNumber}`);
            }
            
            console.log(`Retrying part ${partNumber} (attempt ${retryCount + 1}/${MAX_RETRIES + 1}) after ${retryDelay.toFixed(0)}ms (${detectedNetworkInfo.quality} network)`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return uploadChunkWithRetry(partNumber, chunk, retryCount + 1);
          }

          throw new Error(`Failed to upload part ${partNumber} after ${MAX_RETRIES + 1} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      };

      // Helper function to limit concurrent promises with adaptive batching
      const limitConcurrency = async (
        tasks: (() => Promise<any>)[],
        initialLimit: number
      ): Promise<any[]> => {
        const results: any[] = [];
        let currentLimit = initialLimit;
        let consecutiveErrors = 0;
        
        for (let i = 0; i < tasks.length; i += currentLimit) {
          const batch = tasks.slice(i, i + currentLimit);
          
          try {
            const batchResults = await Promise.all(batch.map(task => task()));
            results.push(...batchResults);
            
            // Reset error count on successful batch
            consecutiveErrors = 0;
            
            // Gradually increase concurrency back up if it was reduced
            if (currentLimit < initialLimit) {
              currentLimit = Math.min(currentLimit + 1, initialLimit);
              console.log(`Increasing concurrency back to ${currentLimit}`);
            }
            
          } catch (error) {
            consecutiveErrors++;
            
            // If we get server errors, reduce concurrency for subsequent batches
            if (error instanceof Error && error.message.includes('500') && consecutiveErrors >= 2) {
              currentLimit = Math.max(Math.floor(currentLimit * 0.7), 2);
              console.log(`Server overload detected, reducing concurrency to ${currentLimit}`);
            }
            
            // Still push the error - let individual tasks handle their own retries
            throw error;
          }
        }
        
        return results;
      };

      let newPartsUploaded = 0;
      let completedParts = uploadParts.length; // Start with already completed parts
      
      // Set initial progress based on already completed chunks
      updateRealTimeProgress();

      // Use streaming approach with memory-efficient concurrent upload processing
      await streamingConcurrentUpload(
        fileReader,
        uploadParts,
        startPart,
        chunks,
        CONCURRENT_UPLOADS,
        (partNumber: number, chunk: Blob) => {
          // Calculate optimal chunk size for this part based on network performance
          const optimalChunkSize = networkAdapter.getOptimalChunkSizeForPart(BASE_CHUNK_SIZE, partNumber, consecutiveSuccesses);
          return uploadChunkWithRetry(partNumber, chunk, 0, optimalChunkSize);
        }
      );

      // Log final memory usage
      MemoryMonitor.logMemoryUsage('Upload Complete');
      await MemoryMonitor.forceGarbageCollection();

      return uploadParts;
  } catch (error) {
    // Check if this is a pause operation (not an actual error)
    if (error instanceof Error && error.message === 'Upload paused') {
      console.log(`Upload paused for file ${fileInfo.id}`);
      
      setFormData(prev => ({
        ...prev,
        files: prev.files.map(f => 
          f.id === fileInfo.id ? { 
            ...f, 
            status: 'paused' as const,
            uploadedParts: [...uploadParts],
            currentPart: uploadParts.length > 0 ? Math.max(...uploadParts.map(p => p.partNumber)) : 0
          } : f
        )
      }));
      
      return [];
    }
    
    // Check if this is an abort/cancel operation
    if (error instanceof Error && (error.name === 'AbortError' || error.message === 'Upload cancelled')) {
      console.log(`Upload cancelled for file ${fileInfo.id}`);
      return [];
    }
    
    // Mark file as error only for real errors with user-friendly messages
    const getUserFriendlyError = (error: any): string => {
      if (error?.message?.includes('500')) {
        return 'Server temporarily overloaded. Click retry to continue.';
      }
      if (error?.message?.includes('Network error') || error?.message?.includes('fetch')) {
        return 'Connection interrupted. Check your internet and retry.';
      }
      if (error?.message?.includes('Failed to upload part')) {
        return 'Upload temporarily failed. Click retry to continue.';
      }
      return 'Upload error occurred. Click retry to continue.';
    };
    
    setFormData(prev => ({
      ...prev,
      files: prev.files.map(f => 
        f.id === fileInfo.id ? { 
          ...f, 
          status: 'error' as const,
          error: getUserFriendlyError(error)
        } : f
      )
    }));
    throw error;
  } finally {
    // Clean up progress tracking
    chunkProgress.clear();
    chunkSizes.clear();
    abortControllersRef.current.delete(fileInfo.id);
  }
  };

  const completeFileUpload = async (transferId: string, fileData: any, uploadParts: any[]) => {
    // Don't complete if no parts (paused upload)
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

  // Save upload state to localStorage
  const saveUploadState = (state: { transferId: string; formData: TransferFormData }) => {
    // Create a serializable version of the state (without File objects)
    const serializedFiles = state.formData.files.map(file => ({
      id: file.id,
      name: file.name,
      size: file.size,
      progress: file.progress,
      status: file.status,
      uploadId: file.uploadId,
      key: file.key,
      uploadedParts: file.uploadedParts,
      currentPart: file.currentPart,
      error: file.error
      // Note: we can't save the actual File object
    }));
    
    const serializableState = {
      transferId: state.transferId,
      formData: {
        files: serializedFiles
      }
    };
    
    localStorage.setItem('arosend_upload_state', JSON.stringify(serializableState));
  };

  // Load upload state from localStorage
  const loadUploadState = (): { transferId: string; formData: TransferFormData } | null => {
    try {
      const saved = localStorage.getItem('arosend_upload_state');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  // Clear upload state from localStorage
  const clearUploadState = () => {
    localStorage.removeItem('arosend_upload_state');
  };

  const convertToFreshUpload = async (fileInfo: FileInfo) => {
    setFormData(prev => ({
      ...prev,
      files: prev.files.map(f => 
        f.id === fileInfo.id ? { 
          ...f, 
          status: 'pending' as const,
          error: undefined,
          progress: 0,
          uploadedParts: [],
          currentPart: 0,
          uploadId: undefined,
          key: undefined
        } : f
      )
    }));
    
    // Clear any stale transfer state
    setTransferId('');
    clearUploadState();
    setShowResumeNotification(false);
    
    alert('Previous upload is no longer valid. File will start as a fresh upload.\nClick "Upload Files" to begin.');
  };

  const promptFileReselection = async (fileInfo: FileInfo): Promise<void> => {
    return new Promise((resolve) => {
      // Create a temporary file input
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.style.display = 'none';
      
      // Set up file selection handler
      fileInput.onchange = (event) => {
        const selectedFiles = (event.target as HTMLInputElement).files;
        if (selectedFiles && selectedFiles.length > 0) {
          const selectedFile = selectedFiles[0];
          
          // Validate the file matches the original
          if (selectedFile.name === fileInfo.name && selectedFile.size === fileInfo.size) {
            // Update the file info with the new File object
            setFormData(prev => ({
              ...prev,
              files: prev.files.map(f => 
                f.id === fileInfo.id ? { 
                  ...f, 
                  file: selectedFile,
                  status: 'paused' as const,
                  error: undefined
                } : f
              )
            }));
            
            // Now resume the upload with the file object
            setTimeout(() => {
              const updatedFileInfo = { ...fileInfo, file: selectedFile };
              resumeFileUpload(updatedFileInfo);
            }, 100);
            
            alert(`File "${selectedFile.name}" selected! Resuming upload from ${fileInfo.progress}%...`);
          } else {
            alert(`File mismatch! Please select the exact same file:\nExpected: ${fileInfo.name} (${formatFileSize(fileInfo.size)})\nSelected: ${selectedFile.name} (${formatFileSize(selectedFile.size)})`);
            setFormData(prev => ({
              ...prev,
              files: prev.files.map(f => 
                f.id === fileInfo.id ? { 
                  ...f, 
                  status: 'error' as const,
                  error: 'Wrong file selected. Please select the exact same file to resume.'
                } : f
              )
            }));
          }
        }
        
        // Clean up
        document.body.removeChild(fileInput);
        resolve();
      };
      
      // Set up cancel handler
      fileInput.oncancel = () => {
        document.body.removeChild(fileInput);
        setFormData(prev => ({
          ...prev,
          files: prev.files.map(f => 
            f.id === fileInfo.id ? { 
              ...f, 
              status: 'error' as const,
              error: 'File selection cancelled. Cannot resume without file.'
            } : f
          )
        }));
        resolve();
      };
      
      // Add to DOM and trigger file selection
      document.body.appendChild(fileInput);
      
      // Show user instruction
      alert(`To resume uploading "${fileInfo.name}" from ${fileInfo.progress}%, please select the same file again.`);
      
      fileInput.click();
    });
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
    setPausedUploads(new Set());
    clearUploadState();
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(downloadUrl);
      alert('Download link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  // Pause/Resume functions
  const pauseFileUpload = (fileId: string) => {
    setPausedUploads(prev => new Set([...prev, fileId]));
    setFormData(prev => ({
      ...prev,
      files: prev.files.map(f => 
        f.id === fileId ? { ...f, status: 'paused' as const } : f
      )
    }));
    
    // Abort the current upload for this file
    const controller = abortControllersRef.current.get(fileId);
    if (controller) {
      controller.abort();
    }
  };

  const resumeFileUpload = async (fileInfo: FileInfo) => {
    // Check if file is already completed
    if (fileInfo.status === 'completed') {
      console.log('File already completed, no need to resume');
      return;
    }

    // First, validate the transfer exists and hasn't expired
    if (transferId) {
      try {
        const validateResponse = await fetch(`/api/transfers/validate/${transferId}`);
        const validation = await validateResponse.json() as { valid: boolean; reason?: string };
        
        if (!validation.valid) {
          console.log('Transfer validation failed:', validation.reason);
          setFormData(prev => ({
            ...prev,
            files: prev.files.map(f => 
              f.id === fileInfo.id ? { 
                ...f, 
                status: 'error' as const,
                error: `Cannot resume: ${validation.reason}. Please start a fresh upload.`
              } : f
            )
          }));
          
          // Clear stale state
          setTransferId('');
          clearUploadState();
          setShowResumeNotification(false);
          
          alert(`Cannot resume upload: ${validation.reason}\nPlease start a fresh upload.`);
          return;
        }
      } catch (error) {
        console.error('Error validating transfer:', error);
        alert('Unable to validate transfer. Please start a fresh upload.');
        return;
      }
    }

    // Check if we have the actual File object (needed for resume)
    if (!fileInfo.file) {
      console.log('File object missing, prompting user to re-select file');
      await promptFileReselection(fileInfo);
      return;
    }

    // Remove from paused uploads and start resuming
    setPausedUploads(prev => {
      const newSet = new Set(prev);
      newSet.delete(fileInfo.id);
      return newSet;
    });

    // Update status to uploading
    setFormData(prev => ({
      ...prev,
      files: prev.files.map(f => 
        f.id === fileInfo.id ? { ...f, status: 'uploading' as const } : f
      )
    }));

    // Resume the upload from where it left off
    try {
      const fileData = {
        key: fileInfo.key,
        uploadId: fileInfo.uploadId
      };
      
      console.log(`Resuming upload for ${fileInfo.name} from part ${(fileInfo.currentPart || 0) + 1}`);
      const uploadParts = await uploadFileInChunks(fileInfo, fileData);
      
      // Complete upload if we have all parts
      if (uploadParts.length > 0) {
        await completeFileUpload(transferId, fileData, uploadParts);
      }
    } catch (error) {
      console.error('Resume failed:', error);
      setFormData(prev => ({
        ...prev,
        files: prev.files.map(f => 
          f.id === fileInfo.id ? { 
            ...f, 
            status: 'error' as const,
            error: error instanceof Error ? error.message : 'Resume failed'
          } : f
        )
      }));
    }
  };

  const retryFileUpload = (fileInfo: FileInfo) => {
    resumeFileUpload(fileInfo);
  };

  // Function to load saved upload state on component mount
  const loadSavedUpload = () => {
    const savedState = loadUploadState();
    if (savedState) {
      setFormData(savedState.formData);
      setTransferId(savedState.transferId);
      
      // Show resume dialog or auto-resume
      const hasIncompleteFiles = savedState.formData.files.some(f => f.status !== 'completed');
      if (hasIncompleteFiles) {
        const shouldResume = window.confirm('Found an interrupted upload. Would you like to resume it?');
        if (shouldResume) {
          // Resume incomplete files
          savedState.formData.files.forEach(file => {
            if (file.status === 'uploading' || file.status === 'paused' || file.status === 'error') {
              resumeFileUpload(file);
            }
          });
        } else {
          clearUploadState();
        }
      }
    }
  };

  const [showResumeNotification, setShowResumeNotification] = useState(false);

  // Browser close/refresh warning
  React.useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Check if there are active uploads
      const hasActiveUploads = formData.files.some(file => 
        file.status === 'uploading' || file.status === 'paused'
      );
      
      if (hasActiveUploads || isUploading) {
        const message = 'You have uploads in progress. If you leave this page, you\'ll need to re-select your files and start fresh. Are you sure you want to leave?';
        event.preventDefault();
        event.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [formData.files, isUploading]);

  // Load saved upload on component mount
  React.useEffect(() => {
    const savedState = loadUploadState();
    if (savedState) {
      const hasIncompleteFiles = savedState.formData.files.some(f => f.status !== 'completed');
      if (hasIncompleteFiles) {
        setShowResumeNotification(true);
        
        // Mark files without File objects as needing re-selection
        const updatedFiles = savedState.formData.files.map(file => {
          return {
            ...file,
            status: file.status === 'completed' ? 'completed' as const : 'error' as const,
            error: file.status !== 'completed' ? 'Click the 🔄 button to re-select this file for fresh upload.' : undefined
          };
        });
        
        setFormData({
          files: updatedFiles
        });
        setTransferId(savedState.transferId);
      }
    }
  }, []);

  const getStatusIcon = (status: FileInfo['status']) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'uploading': return '📤';
      case 'paused': return '⏸️';
      case 'completed': return '✅';
      case 'error': return '❌';
      default: return '📄';
    }
  };

  const getStatusColor = (status: FileInfo['status']) => {
    switch (status) {
      case 'pending': return 'text-gray-500';
      case 'uploading': return 'text-blue-600';
      case 'paused': return 'text-yellow-600';
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

      {/* Resume Notification */}
      {showResumeNotification && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-orange-600 text-lg mr-2">🔄</span>
              <div>
                <p className="text-sm font-medium text-orange-800">
                  Previous upload detected
                </p>
                <p className="text-sm text-orange-600 font-light">
                  Upload will restart fresh for reliability. Click "Restore Files" to re-select your files and upload again.
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => {
                  formData.files.forEach(file => {
                    if (file.status === 'error') {
                      resumeFileUpload(file);
                    }
                  });
                  setShowResumeNotification(false);
                }}
                className="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
              >
                Restore Files
              </button>
              <button
                type="button"
                onClick={() => {
                  clearUploadState();
                  resetForm();
                  setShowResumeNotification(false);
                }}
                className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Start Fresh
              </button>
            </div>
          </div>
        </div>
      )}

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
            <div className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 border-gray-300 hover:border-blue-400 hover:bg-gray-50 opacity-50">
              <div className="space-y-2">
                <div className="text-2xl">📁</div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">+ Add folders</p>
                  <p className="text-xs text-gray-500 mt-1 font-light">Coming soon</p>
                </div>
              </div>
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
                        <p className="text-xs font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500 font-light">
                          {formatFileSize(file.size)} • Network: {networkInfo.quality} • {networkInfo.bandwidth.toFixed(1)} Mbps
                        </p>
                        <p className={`text-xs font-light ${getStatusColor(file.status)}`}>
                          {file.status === 'pending' && 'Waiting to upload'}
                          {file.status === 'uploading' && `Uploading... ${file.progress}%`}
                          {file.status === 'paused' && 'Paused'}
                          {file.status === 'completed' && 'Upload complete'}
                          {file.status === 'error' && `Error: ${file.error || 'Upload failed'}`}
                        </p>
                      </div>
                    </div>
                    {(file.status === 'uploading' || file.status === 'paused') && (
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {/* Pause/Resume/Retry Controls */}
                    {file.status === 'uploading' && (
                      <button
                        type="button"
                        onClick={() => pauseFileUpload(file.id)}
                        className="px-1.5 py-0.5 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600"
                        title="Pause upload"
                      >
                        ⏸️
                      </button>
                    )}
                    
                    {(file.status === 'paused' || file.status === 'error') && (
                      <button
                        type="button"
                        onClick={() => resumeFileUpload(file)}
                        className="px-1.5 py-0.5 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                        title={file.status === 'paused' ? 'Resume upload' : 'Retry upload'}
                      >
                        {file.status === 'paused' ? '▶️' : '🔄'}
                      </button>
                    )}
                    
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


        {/* Upload Controls */}
        {isUploading && (
          <div className="bg-blue-50 rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium text-blue-900">Upload Progress</span>
                <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">
                  {networkInfo.quality} ({networkInfo.bandwidth.toFixed(1)} Mbps)
                </span>
                {(window.location.hostname === 'localhost' || window.location.port === '5173') && (
                  <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-800 rounded">
                    dev mode
                  </span>
                )}
              </div>
              <span className="text-sm text-blue-700 font-light">
                {formData.files.filter(f => f.status === 'completed').length} / {formData.files.length} files completed
              </span>
            </div>
            
            {/* Development Warning */}
            {(window.location.hostname === 'localhost' || window.location.port === '5173') && (
              <div className="bg-orange-50 border border-orange-200 rounded p-2 mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-orange-600 text-xs">🔧</span>
                  <p className="text-xs text-orange-700 font-light">
                    <strong>Development mode:</strong> Reduced concurrency to prevent server overload. Production will be faster.
                  </p>
                </div>
              </div>
            )}
            
            {/* Resume Warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-yellow-600 text-xs">⚠️</span>
                <p className="text-xs text-yellow-700 font-light">
                  <strong>Stay on this page</strong> to use pause/resume. Closing or refreshing will require re-uploading.
                </p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => {
                  formData.files.forEach(file => {
                    if (file.status === 'uploading') {
                      pauseFileUpload(file.id);
                    }
                  });
                }}
                className="px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                Pause All
              </button>
              <button
                type="button"
                onClick={() => {
                  formData.files.forEach(file => {
                    if (file.status === 'paused' || file.status === 'error') {
                      resumeFileUpload(file);
                    }
                  });
                }}
                className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
              >
                Resume All
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Are you sure you want to cancel all uploads?')) {
                    abortControllersRef.current.forEach(controller => controller.abort());
                    setIsUploading(false);
                    clearUploadState();
                  }
                }}
                className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
              >
                Cancel All
              </button>
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

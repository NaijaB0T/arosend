import React, { useState, useRef, useEffect } from 'react';

export interface MediaFile {
  id: string;
  filename: string;
  size: number;
  url: string;
}

interface MediaPreviewProps {
  file: MediaFile;
  transferId: string;
}

const getFileExtension = (filename: string): string => {
  return filename.toLowerCase().split('.').pop() || '';
};

const getMediaType = (filename: string): 'image' | 'video' | 'audio' | 'document' | 'other' => {
  const extension = getFileExtension(filename);
  
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
  const videoExtensions = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', '3gp', 'm4v'];
  const audioExtensions = ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma'];
  const documentExtensions = ['pdf', 'doc', 'docx', 'txt', 'rtf'];
  
  if (imageExtensions.includes(extension)) return 'image';
  if (videoExtensions.includes(extension)) return 'video';
  if (audioExtensions.includes(extension)) return 'audio';
  if (documentExtensions.includes(extension)) return 'document';
  
  return 'other';
};

const isWebCompatibleVideo = (filename: string): boolean => {
  const extension = getFileExtension(filename);
  // These formats are most likely to work in browsers
  const webCompatible = ['mp4', 'webm', 'ogg'];
  return webCompatible.includes(extension);
};

const getVideoMimeType = (filename: string): string => {
  const extension = getFileExtension(filename);
  const mimeTypes: {[key: string]: string} = {
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'ogg': 'video/ogg',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'wmv': 'video/x-ms-wmv',
    'flv': 'video/x-flv',
    'mkv': 'video/x-matroska',
    '3gp': 'video/3gpp',
    'm4v': 'video/x-m4v'
  };
  return mimeTypes[extension] || 'video/mp4';
};

const formatFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

export const MediaPreview: React.FC<MediaPreviewProps> = ({ file, transferId }) => {
  console.log('MediaPreview MOUNTED:', { filename: file.filename, url: file.url, transferId });
  
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const mediaType = getMediaType(file.filename);
  
  console.log('MediaPreview mediaType:', mediaType, 'for file:', file.filename);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Simple test to verify the endpoint works
  useEffect(() => {
    if (mediaType === 'video' || mediaType === 'image') {
      console.log(`🔍 Testing direct ${mediaType} URL:`, file.url);
    }
  }, [file.url, mediaType]);
  
  // Set loading to false for all media types initially - let the media elements handle their own loading
  useEffect(() => {
    console.log(`💡 Setting initial loading state for ${mediaType}`);
    setIsLoading(false);
  }, [mediaType]);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (showControls && (mediaType === 'video' || mediaType === 'audio')) {
        setShowControls(false);
      }
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [showControls, mediaType]);

  const handleMediaLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleMediaError = (e?: any) => {
    console.error('Video loading failed:', {
      filename: file.filename,
      url: file.url,
      error: e
    });
    setIsLoading(false);
    setHasError(true);
  };

  // Add timeout for loading state in case media never loads
  useEffect(() => {
    if (isLoading && (mediaType === 'image' || mediaType === 'video' || mediaType === 'audio')) {
      console.log(`⏱️ Starting ${mediaType} loading timeout for:`, file.filename);
      const timeout = setTimeout(() => {
        console.log(`⏱️ ${mediaType} loading timeout reached for:`, file.filename);
        setIsLoading(false);
        setHasError(true);
      }, 10000); // Shorter 10 second timeout

      return () => {
        console.log(`⏱️ Clearing ${mediaType} loading timeout for:`, file.filename);
        clearTimeout(timeout);
      };
    }
  }, [isLoading, mediaType, file.filename]);

  const toggleFullscreen = () => {
    if (mediaType === 'image' || mediaType === 'video') {
      setIsFullscreen(!isFullscreen);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
  };

  const renderPreview = () => {
    switch (mediaType) {
      case 'image':
        return (
          <div className="relative group">
            <img
              src={file.url}
              alt={file.filename}
              className="max-w-full max-h-96 object-contain rounded-lg cursor-pointer"
              onLoad={() => {
                console.log('🖼️ Image loaded successfully:', file.filename);
                handleMediaLoad();
              }}
              onError={(e) => {
                console.error('🖼️ Image loading error:', {
                  filename: file.filename,
                  url: file.url,
                  error: e
                });
                handleMediaError(e);
              }}
              onClick={toggleFullscreen}
            />
            {!isLoading && !hasError && (
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-lg">
                <button
                  onClick={toggleFullscreen}
                  className="bg-black/60 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-black/80 transition-colors"
                >
                  View Fullscreen
                </button>
              </div>
            )}
          </div>
        );

      case 'video':
        const isCompatible = isWebCompatibleVideo(file.filename);
        console.log(`🎬 Rendering video element with src:`, file.url);
        return (
          <div className="relative" onMouseMove={handleMouseMove}>
            {!isCompatible && (
              <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-500/30 rounded-lg">
                <div className="flex items-center text-yellow-400 text-sm">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  {getFileExtension(file.filename).toUpperCase()} files may not preview in all browsers
                </div>
              </div>
            )}
            <video
              ref={videoRef}
              controls={showControls}
              className="max-w-full max-h-96 rounded-lg cursor-pointer"
              src={file.url}
              onLoadStart={() => console.log('🎬 Video load started:', file.filename)}
              onLoadedMetadata={() => {
                console.log('🎬 Video metadata loaded successfully:', file.filename);
                handleMediaLoad();
              }}
              onLoadedData={() => {
                console.log('🎬 Video data loaded successfully:', file.filename);
                handleMediaLoad();
              }}
              onCanPlay={() => {
                console.log('🎬 Video can play:', file.filename);
                handleMediaLoad();
              }}
              onError={(e) => {
                const target = e.target as HTMLVideoElement;
                const error = target.error;
                console.error('🎬 Video element error:', {
                  filename: file.filename,
                  url: file.url,
                  currentSrc: target.currentSrc,
                  errorCode: error?.code,
                  errorMessage: error?.message,
                  networkState: target.networkState,
                  readyState: target.readyState
                });
                handleMediaError(e);
              }}
              onClick={toggleFullscreen}
              preload="metadata"
            >
              Your browser does not support the video tag.
            </video>
            {!showControls && !isLoading && !hasError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  onClick={() => setShowControls(true)}
                  className="bg-black/60 text-white p-3 rounded-full hover:bg-black/80 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-7 4h12l-1 1H9l-1-1z" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        );

      case 'audio':
        return (
          <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-medium">{file.filename}</h3>
                <p className="text-white/60 text-sm">{formatFileSize(file.size)}</p>
              </div>
            </div>
            <audio
              ref={audioRef}
              src={file.url}
              controls
              className="w-full"
              onLoadedData={handleMediaLoad}
              onCanPlay={handleMediaLoad}
              onError={handleMediaError}
              preload="metadata"
            >
              Your browser does not support the audio element.
            </audio>
          </div>
        );

      case 'document':
        return (
          <div className="bg-white/5 rounded-lg p-6 text-center">
            <div className="w-16 h-16 bg-red-500 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-white font-medium mb-2">{file.filename}</h3>
            <p className="text-white/60 text-sm mb-4">{formatFileSize(file.size)}</p>
            {getFileExtension(file.filename) === 'pdf' && (
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors inline-flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View PDF
              </a>
            )}
          </div>
        );

      default:
        return (
          <div className="bg-white/5 rounded-lg p-6 text-center">
            <div className="w-16 h-16 bg-gray-500 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-white font-medium mb-2">{file.filename}</h3>
            <p className="text-white/60 text-sm">{formatFileSize(file.size)}</p>
            <p className="text-white/40 text-xs mt-2">Preview not available for this file type</p>
          </div>
        );
    }
  };

  return (
    <div className="w-full">
      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <span className="ml-3 text-white/70">Loading preview...</span>
        </div>
      )}
      
      {hasError && !isLoading && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
          <div className="w-16 h-16 bg-red-500 rounded-lg flex items-center justify-center mx-auto mb-4">
            {mediaType === 'video' ? (
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            )}
          </div>
          <h3 className="text-red-400 font-medium mb-2">
            {mediaType === 'video' ? 'Video preview unavailable' : 'Preview not available'}
          </h3>
          <p className="text-red-300 text-sm mb-1">{file.filename}</p>
          <p className="text-red-300/70 text-xs mb-3">({formatFileSize(file.size)})</p>
          
          {mediaType === 'video' && (
            <p className="text-red-300/80 text-xs mb-4">
              {getFileExtension(file.filename).toUpperCase()} videos may use codecs not supported by your browser. 
              Try downloading to view with a video player.
            </p>
          )}
          
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center mt-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download to View
          </a>
        </div>
      )}
      
      {!isLoading && !hasError && renderPreview()}

      {/* Fullscreen Modal */}
      {isFullscreen && (mediaType === 'image' || mediaType === 'video') && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-full max-h-full">
            <button
              onClick={() => setIsFullscreen(false)}
              className="absolute top-4 right-4 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {mediaType === 'image' ? (
              <img
                src={file.url}
                alt={file.filename}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <video
                src={file.url}
                controls
                className="max-w-full max-h-full"
                autoPlay
              >
                Your browser does not support the video tag.
              </video>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
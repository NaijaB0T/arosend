import React, { useRef } from 'react';

interface MobileTransferFormProps {
  onFilesSelected: (files: FileList) => void;
}

export function MobileTransferForm({ onFilesSelected }: MobileTransferFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCircleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFilesSelected(files);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
      <div
        onClick={handleCircleClick}
        className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-2xl cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95"
      >
        <div className="w-12 h-12 flex items-center justify-center">
          <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
      </div>
      
      <div className="text-center mt-6">
        <h2 className="text-2xl font-bold text-white mb-2">Upload files</h2>
        <p className="text-white/70 text-lg">Tap to select files</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
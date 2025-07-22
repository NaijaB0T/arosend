import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface DeletionWarningModalProps {
  isOpen: boolean;
  expiresAt: number;
  onContinue: () => void;
  onExtend: () => void;
}

export function DeletionWarningModal({ isOpen, expiresAt, onContinue, onExtend }: DeletionWarningModalProps) {
  const [hoursRemaining, setHoursRemaining] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, expiresAt - now);
      const hours = Math.ceil(remaining / (1000 * 60 * 60));
      setHoursRemaining(hours);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [isOpen, expiresAt]);

  if (!isOpen || typeof window === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
      <div className="bg-red-900/20 backdrop-blur-lg rounded-2xl p-8 border border-red-500/30 max-w-md w-full text-center">
        <div className="mb-6">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-4">
            Are you sure?
          </h2>
          
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-200 text-lg">
              In <span className="font-bold text-red-400">{hoursRemaining} hour{hoursRemaining !== 1 ? 's' : ''}</span>, this file will be permanently deleted.
            </p>
            <p className="text-red-300 text-sm mt-2">
              Are you sure you want to continue?
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={onContinue}
            className="flex-1 bg-white text-red-600 px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors font-medium text-lg border border-red-500/30"
          >
            Continue
          </button>
          <button
            onClick={onExtend}
            className="flex-1 bg-white text-green-600 px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors font-medium text-lg border border-green-500/30"
          >
            Extend
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
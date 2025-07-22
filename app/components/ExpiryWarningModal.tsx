import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ExpiryWarningModalProps {
  isOpen: boolean;
  expiresAt: number;
  onExtend: () => void;
  onIgnore: () => void;
}

export function ExpiryWarningModal({ isOpen, expiresAt, onExtend, onIgnore }: ExpiryWarningModalProps) {
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!isOpen) return;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, expiresAt - now);
      
      if (remaining <= 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
      const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [isOpen, expiresAt]);

  if (!isOpen || typeof window === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 max-w-md w-full text-center">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">
            This file is about to expire!
          </h2>
          
          {/* Countdown Timer */}
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-6 mb-6">
            <div className="text-3xl font-bold text-red-400 mb-2">
              {String(timeRemaining.days).padStart(2, '0')} : {String(timeRemaining.hours).padStart(2, '0')} : {String(timeRemaining.minutes).padStart(2, '0')} : {String(timeRemaining.seconds).padStart(2, '0')}
            </div>
            <div className="text-red-300 text-sm font-medium">
              Days : Hours : Minutes : Seconds
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={onExtend}
            className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium text-lg"
          >
            Extend Expiry
          </button>
          <button
            onClick={onIgnore}
            className="flex-1 bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium text-lg"
          >
            Ignore
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
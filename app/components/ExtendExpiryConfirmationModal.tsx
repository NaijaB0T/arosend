import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatNGNWithUSD, formatNGNWithUSDFixed, toUSD } from '../lib/currency';

interface ExtendExpiryConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToPayment: (days: number) => void;
  fileSizeGB: number;
  isAuthenticated: boolean;
  credits?: number;
  creditsLoading?: boolean;
}

export function ExtendExpiryConfirmationModal({ 
  isOpen, 
  onClose, 
  onProceedToPayment, 
  fileSizeGB,
  isAuthenticated,
  credits = 0,
  creditsLoading = false
}: ExtendExpiryConfirmationModalProps) {
  const [days, setDays] = useState(5);
  const [priceNGN, setPriceNGN] = useState(0);
  const [priceUSD, setPriceUSD] = useState(0);

  const BASE_RATE = 2; // ₦2 per GB per day
  const USD_EXCHANGE_RATE = 1600; // ₦1600 = $1

  // Format file size in appropriate units
  const formatFileSize = (sizeGB: number) => {
    const sizeBytes = sizeGB * 1024 * 1024 * 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (sizeBytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(sizeBytes) / Math.log(1024));
    return Math.round(sizeBytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Calculate minimum days needed for ₦100 minimum payment for guests
  const calculateMinimumDaysForGuests = () => {
    if (isAuthenticated || fileSizeGB === 0) return 1;
    
    // Calculate days needed for ₦100: 100 = fileSizeGB * days * 2
    // So days = 100 / (fileSizeGB * 2)
    const daysFor100Naira = 100 / (fileSizeGB * 2);
    
    // Cap at 200 days maximum
    const cappedDays = Math.min(daysFor100Naira, 200);
    
    // Round up to ensure we meet minimum ₦100
    return Math.ceil(cappedDays);
  };

  // Get the cost for guest users (₦100 base + excess days if any)
  const getGuestCost = () => {
    if (isAuthenticated) return fileSizeGB * days * BASE_RATE;
    
    const minDays = calculateMinimumDaysForGuests();
    
    if (days <= minDays) {
      return 100; // Fixed ₦100 for minimum days
    } else {
      // ₦100 base + excess days at actual rate
      const excessDays = days - minDays;
      const dailyRate = fileSizeGB * 2; // ₦2 per GB per day
      const excessCost = excessDays * dailyRate;
      return Math.ceil(100 + excessCost); // Round up the total
    }
  };

  // Get breakdown of guest cost for display
  const getGuestCostBreakdown = () => {
    if (isAuthenticated) return null;
    
    const minDays = calculateMinimumDaysForGuests();
    
    if (days <= minDays) {
      return {
        baseCost: 100,
        excessCost: 0,
        excessDays: 0,
        total: 100
      };
    } else {
      const excessDays = days - minDays;
      const dailyRate = fileSizeGB * 2;
      const excessCost = excessDays * dailyRate;
      return {
        baseCost: 100,
        excessCost: Math.ceil(excessCost),
        excessDays,
        total: Math.ceil(100 + excessCost)
      };
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    let totalPriceNGN;
    if (isAuthenticated) {
      // For authenticated users, use simple calculation
      totalPriceNGN = fileSizeGB * days * BASE_RATE;
    } else {
      // For guest users, use the ₦100 minimum logic
      totalPriceNGN = getGuestCost();
    }
    
    const totalPriceUSD = totalPriceNGN / USD_EXCHANGE_RATE;

    setPriceNGN(totalPriceNGN);
    setPriceUSD(totalPriceUSD);
  }, [days, fileSizeGB, isOpen, isAuthenticated]);

  const handleDaysChange = (newDays: number) => {
    const minDays = isAuthenticated ? 1 : calculateMinimumDaysForGuests();
    if (newDays >= minDays && newDays <= 365) {
      setDays(newDays);
    } else if (newDays < minDays) {
      setDays(minDays);
    }
  };

  // Set minimum days when modal opens
  useEffect(() => {
    if (isOpen && !isAuthenticated) {
      const minDays = calculateMinimumDaysForGuests();
      if (days < minDays) {
        setDays(minDays);
      }
    }
  }, [isOpen, isAuthenticated]);

  const handleProceed = () => {
    onProceedToPayment(days);
  };

  if (!isOpen || typeof window === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 max-w-lg w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Extend File Expiration</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Days Input */}
          <div>
            <label className="block text-white font-medium mb-3">Number of Days</label>
            <input
              type="number"
              min={isAuthenticated ? 1 : calculateMinimumDaysForGuests()}
              max="365"
              value={days}
              onChange={(e) => handleDaysChange(parseInt(e.target.value) || (isAuthenticated ? 1 : calculateMinimumDaysForGuests()))}
              className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            {!isAuthenticated && (
              <p className="text-white/60 text-sm mt-1">
                Minimum {calculateMinimumDaysForGuests()} days for ₦100 minimum payment
              </p>
            )}
          </div>

          {/* Price Summary */}
          <div className="bg-white/5 rounded-lg p-6">
            <h3 className="text-white font-medium mb-4">Price Summary</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-white/70">File size:</span>
                <span className="text-white">{formatFileSize(fileSizeGB)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/70">Extension period:</span>
                <span className="text-white">{days} day{days !== 1 ? 's' : ''}</span>
              </div>
              {isAuthenticated ? (
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Rate:</span>
                  <span className="text-white">₦{BASE_RATE} (${toUSD(BASE_RATE).toFixed(3)}) per GB per day</span>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Rate:</span>
                  <span className="text-white">₦{BASE_RATE} (${toUSD(BASE_RATE).toFixed(3)}) per GB per day • Minimum {formatNGNWithUSDFixed(100)}</span>
                </div>
              )}
              
              {!isAuthenticated && (() => {
                const breakdown = getGuestCostBreakdown();
                if (!breakdown) return null;
                
                if (breakdown.excessDays > 0) {
                  return (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-white/80">
                        <span>Base cost ({calculateMinimumDaysForGuests()} days):</span>
                        <span>{formatNGNWithUSD(breakdown.baseCost)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-white/80">
                        <span>Extra cost ({breakdown.excessDays} additional days):</span>
                        <span>{formatNGNWithUSD(breakdown.excessCost)}</span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              
              <div className="border-t border-white/20 pt-3 mt-4">
                {isAuthenticated ? (
                  <div>
                    <div className="flex justify-between items-center text-lg">
                      <span className="text-white font-medium">Cost in Credits:</span>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-400">
                          {formatNGNWithUSDFixed(priceNGN)}
                        </div>
                      </div>
                    </div>
                    <p className="text-white/60 text-sm mt-2">
                      ₦2 per GB per day • Deducted from your credit balance
                    </p>
                    {!creditsLoading && credits < priceNGN && (
                      <p className="text-red-400 text-sm mt-2">
                        Insufficient credits. You need {formatNGNWithUSDFixed(priceNGN - credits)} more.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex justify-between items-center text-lg">
                    <span className="text-white font-medium">Total Price:</span>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-400">
                        {formatNGNWithUSDFixed(priceNGN)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {!isAuthenticated && days === calculateMinimumDaysForGuests() && (
                <p className="text-blue-400 text-sm mt-2">
                  ✨ Extended to {days} days to meet minimum payment requirement
                </p>
              )}
              
              {!isAuthenticated && (() => {
                const breakdown = getGuestCostBreakdown();
                return breakdown && breakdown.excessDays > 0 && (
                  <p className="text-yellow-400 text-sm mt-2">
                    💡 {breakdown.excessDays} extra days beyond minimum at actual rate
                  </p>
                );
              })()}
              
              {isAuthenticated && (
                <div className="mt-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white/70">Your Credits:</span>
                    <span className={creditsLoading ? 'text-white/60' : 'text-green-400 font-medium'}>
                      {creditsLoading ? 'Loading...' : `${formatNGNWithUSD(credits)} available`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 border border-white/30 text-white px-6 py-3 rounded-lg hover:bg-white/10 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleProceed}
              disabled={isAuthenticated && (!creditsLoading && credits < priceNGN)}
              className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAuthenticated ? 'Extend with Credits' : 'Proceed to Payment'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
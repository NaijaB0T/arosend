import React, { useState, useEffect } from 'react';
import { Header } from '~/components/Header';
import { ThreeBackground } from '~/components/ThreeBackground';

export default function Pricing() {
  const [fileSize, setFileSize] = useState<string>('1');
  const [sizeUnit, setSizeUnit] = useState<'MB' | 'GB'>('GB');
  const [days, setDays] = useState<string>('1');
  const [cost, setCost] = useState<number>(0);

  // Pricing logic (same as backend)
  const calculatePrice = (fileSizeInput: string, unit: 'MB' | 'GB', daysInput: string): number => {
    const fileSizeValue = parseFloat(fileSizeInput) || 0;
    const daysValue = parseInt(daysInput) || 0;
    
    // Convert to GB
    const fileSizeGB = unit === 'MB' ? fileSizeValue / 1024 : fileSizeValue;
    
    // Cost calculation: ₦2 per GB per day
    const costPerGBPerDay = 2;
    return Math.ceil(fileSizeGB * daysValue * costPerGBPerDay);
  };

  // Update cost whenever inputs change
  useEffect(() => {
    const newCost = calculatePrice(fileSize, sizeUnit, days);
    setCost(newCost);
  }, [fileSize, sizeUnit, days]);

  const formatFileSize = (size: string, unit: 'MB' | 'GB'): string => {
    const sizeValue = parseFloat(size) || 0;
    if (sizeValue === 0) return '0 MB';
    
    if (unit === 'MB') {
      if (sizeValue >= 1024) {
        return `${(sizeValue / 1024).toFixed(2)} GB`;
      }
      return `${sizeValue} MB`;
    } else {
      return `${sizeValue} GB`;
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const commonFileSizes = [
    { size: '100', unit: 'MB' as const, label: '100 MB' },
    { size: '500', unit: 'MB' as const, label: '500 MB' },
    { size: '1', unit: 'GB' as const, label: '1 GB' },
    { size: '5', unit: 'GB' as const, label: '5 GB' },
    { size: '10', unit: 'GB' as const, label: '10 GB' },
    { size: '50', unit: 'GB' as const, label: '50 GB' },
  ];

  const commonDurations = [
    { days: '1', label: '1 Day' },
    { days: '7', label: '1 Week' },
    { days: '30', label: '1 Month' },
    { days: '90', label: '3 Months' },
    { days: '365', label: '1 Year' },
  ];

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <ThreeBackground />
      <Header />
      
      <main className="relative z-10 max-w-4xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
            File Storage Pricing
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Calculate the cost to store your files securely. Simple, transparent pricing with no hidden fees.
          </p>
          <div className="bg-green-600/10 border border-green-600/20 rounded-lg p-4 max-w-md mx-auto">
            <p className="text-green-400 font-medium">
              ₦2 per GB per day
            </p>
            <p className="text-green-300/80 text-sm">
              Pay only for what you store
            </p>
          </div>
        </div>

        {/* Calculator Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-12 border border-white/20">
          <h2 className="text-2xl font-bold mb-6 text-center">Pricing Calculator</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* File Size Input */}
            <div>
              <label className="block text-sm font-medium mb-3">File Size</label>
              <div className="flex space-x-2 mb-4">
                <input
                  type="number"
                  value={fileSize}
                  onChange={(e) => setFileSize(e.target.value)}
                  min="0"
                  step="0.1"
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter file size"
                />
                <select
                  value={sizeUnit}
                  onChange={(e) => setSizeUnit(e.target.value as 'MB' | 'GB')}
                  className="px-4 py-3 bg-black/60 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="MB">MB</option>
                  <option value="GB">GB</option>
                </select>
              </div>
              
              {/* Quick Size Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {commonFileSizes.map((item) => (
                  <button
                    key={`${item.size}-${item.unit}`}
                    onClick={() => {
                      setFileSize(item.size);
                      setSizeUnit(item.unit);
                    }}
                    className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Storage Duration */}
            <div>
              <label className="block text-sm font-medium mb-3">Storage Duration</label>
              <input
                type="number"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                min="1"
                max="365"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 mb-4"
                placeholder="Enter number of days"
              />
              
              {/* Quick Duration Buttons */}
              <div className="grid grid-cols-2 gap-2">
                {commonDurations.map((item) => (
                  <button
                    key={item.days}
                    onClick={() => setDays(item.days)}
                    className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Cost Display */}
          <div className="mt-8 p-6 bg-gradient-to-r from-green-600/20 to-blue-600/20 rounded-xl border border-green-500/30 text-center">
            <div className="text-sm text-gray-300 mb-2">
              {formatFileSize(fileSize, sizeUnit)} for {days} day{parseInt(days) !== 1 ? 's' : ''}
            </div>
            <div className="text-4xl font-bold text-green-400 mb-2">
              {formatCurrency(cost)}
            </div>
            <div className="text-sm text-gray-400">
              {cost > 0 && `${formatCurrency(cost / Math.max(parseInt(days), 1))} per day`}
            </div>
          </div>
        </div>

        {/* Pricing Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
            <div className="w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Secure Storage</h3>
            <p className="text-gray-400">Your files are encrypted and stored securely in the cloud with 99.9% uptime.</p>
          </div>

          <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
            <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Fast Transfers</h3>
            <p className="text-gray-400">Optimized for Nigerian networks with adaptive upload speeds and resume capability.</p>
          </div>

          <div className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10">
            <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Pay As You Go</h3>
            <p className="text-gray-400">No monthly subscriptions. Pay only for the storage time you actually use.</p>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10">
          <h2 className="text-2xl font-bold mb-6 text-center">Frequently Asked Questions</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">How is pricing calculated?</h3>
              <p className="text-gray-400">We charge ₦2 per GB per day. If you store a 5GB file for 7 days, the cost would be 5 × 7 × ₦2 = ₦70.</p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Can I extend storage duration?</h3>
              <p className="text-gray-400">Yes! You can extend your file storage at any time from your account dashboard using the same pricing rate.</p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-gray-400">We accept all major Nigerian payment methods through Paystack, including bank transfers, cards, and mobile money.</p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Is there a minimum storage period?</h3>
              <p className="text-gray-400">The minimum storage period is 1 day. Files are automatically deleted after expiration unless extended.</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-12">
          <div className="inline-flex items-center space-x-4">
            <a
              href="/home"
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-semibold transition-colors"
            >
              Start Upload
            </a>
            <a
              href="/api/auth/password/register"
              className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-xl font-semibold transition-colors border border-white/20"
            >
              Create Account
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
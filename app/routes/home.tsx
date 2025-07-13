import type { Route } from "./+types/home";
import { BackgroundManager } from "../components/BackgroundManager";
import { TransferForm } from "../components/TransferForm";
import { MobileTransferForm } from "../components/MobileTransferForm";
import { Header } from "../components/Header";
import { useState, useEffect } from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Arosend - Secure File Transfer and Storage" },
    { name: "description", content: "Send large files securely with pay-as-you-use storage from ₦60/month or ₦2/day. Free transfers included!" },
  ];
}

export default function Home() {
  const [isTransferExpanded, setIsTransferExpanded] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  // Check if device is desktop on mount
  useEffect(() => {
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkIsDesktop();
    window.addEventListener('resize', checkIsDesktop);
    return () => window.removeEventListener('resize', checkIsDesktop);
  }, []);

  const handleFilesSelected = (files: FileList) => {
    setSelectedFiles(files);
    setShowMobileModal(true);
  };

  // Populate TransferForm when modal opens with selected files
  useEffect(() => {
    if (showMobileModal && selectedFiles) {
      // Wait for modal to render, then populate the form
      setTimeout(() => {
        const modalTransferForm = document.getElementById('modal-transfer-form');
        const transferFormInput = modalTransferForm?.querySelector('input[type="file"]') as HTMLInputElement;
        
        if (transferFormInput) {
          // Create a new DataTransfer object to set the files
          const dataTransfer = new DataTransfer();
          Array.from(selectedFiles).forEach(file => {
            dataTransfer.items.add(file);
          });
          transferFormInput.files = dataTransfer.files;
          
          // Trigger the change event
          const event = new Event('change', { bubbles: true });
          transferFormInput.dispatchEvent(event);
        }
      }, 100);
    }
  }, [showMobileModal, selectedFiles]);

  return (
    <BackgroundManager>
      <div className="min-h-screen">
        <Header />

        {/* Main content area */}
        <div className="px-4 md:px-6 py-4 md:py-8 pb-20">
          {/* Mobile Layout */}
          <div className="lg:hidden">
            <MobileTransferForm onFilesSelected={handleFilesSelected} />
          </div>

          {/* Desktop Layout */}
          <div className={`hidden lg:grid w-full max-w-6xl mx-auto grid-cols-1 gap-6 lg:gap-8 items-start min-h-[calc(100vh-120px)] lg:min-h-[calc(100vh-160px)] transition-all duration-500 ${
            isTransferExpanded ? 'lg:grid-cols-5' : 'lg:grid-cols-3'
          }`}>
            
            {/* Left side - Transfer widget (Desktop only) */}
            <div 
              className={`order-1 lg:order-1 flex items-start justify-center lg:justify-start transition-all duration-500 ${
                isTransferExpanded ? 'lg:col-span-3' : 'lg:col-span-1'
              }`}
              onMouseEnter={() => isDesktop && setIsTransferExpanded(true)}
              onMouseLeave={() => isDesktop && setIsTransferExpanded(false)}
            >
              <div className={`bg-white rounded-2xl shadow-xl p-4 md:p-5 w-full mx-auto lg:mx-0 lg:sticky lg:top-6 transition-all duration-500 ${
                isTransferExpanded ? 'max-w-none shadow-2xl scale-105' : 'max-w-sm hover:shadow-2xl cursor-pointer'
              }`}>
                <div className="max-h-[70vh] overflow-y-auto scrollable-widget">
                  <TransferForm />
                </div>
              </div>
            </div>

            {/* Right side - Headline and CTA (Desktop only) */}
            <div className={`order-2 lg:order-2 text-center lg:text-left lg:pl-8 flex flex-col justify-center transition-all duration-500 ${
              isTransferExpanded ? 'lg:col-span-2' : 'lg:col-span-2'
            }`}>
              <h1 className="text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-serif font-bold text-white mb-3 md:mb-4 leading-tight">
                Store & Send Big Files
              </h1>
              <h2 className="text-lg md:text-xl lg:text-2xl xl:text-3xl font-light text-white mb-4 md:mb-6 opacity-90">
                Pay only for what you use
              </h2>
              
              {/* Pricing highlight */}
              <div className="bg-black bg-opacity-80 backdrop-blur-sm rounded-xl p-3 md:p-4 mb-4 md:mb-6 border border-gray-600">
                <div className="text-center">
                  <div className="text-lg md:text-xl lg:text-2xl font-bold text-white mb-1 md:mb-2">Store 1GB for ₦60/month</div>
                  <div className="text-xs md:text-sm text-gray-300 font-light">Or pay ₦2 per day as you use</div>
                </div>
              </div>
              
              <div className="space-y-3 mb-4 md:mb-6">
                <button className="w-full sm:w-auto bg-green-600 text-white px-6 md:px-8 py-3 rounded-lg text-base md:text-lg font-semibold hover:bg-green-700 transition-colors font-light">
                  Start Storing Files
                </button>
                <div className="text-center lg:text-left">
                  <span className="text-white text-sm opacity-80 font-light">Free transfers included</span>
                </div>
              </div>
              
              {/* Feature highlights */}
              <div className="mt-4 md:mt-6 space-y-2 md:space-y-3 text-white opacity-90 text-sm">
                <div className="flex items-center justify-center lg:justify-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0"></div>
                  <span className="font-light">Pay-as-you-use pricing</span>
                </div>
                <div className="flex items-center justify-center lg:justify-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0"></div>
                  <span className="font-light">Free file transfers (24hr expiry)</span>
                </div>
                <div className="flex items-center justify-center lg:justify-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0"></div>
                  <span className="font-light">Long-term storage available</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Mobile floating modal */}
        {!isDesktop && (
          <>
            {/* Floating CTA button */}
            <div className="fixed bottom-6 left-4 right-4 z-50 lg:hidden">
              <button
                onClick={() => setShowMobileModal(true)}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-2xl shadow-2xl transition-all duration-300 transform hover:scale-105 backdrop-blur-lg border border-green-500/20"
              >
                <div className="text-center">
                  <div className="text-lg font-bold mb-1">Take Control</div>
                  <div className="text-sm opacity-90">Pay for what you need</div>
                </div>
              </button>
            </div>

            {/* Mobile modal overlay */}
            {showMobileModal && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 lg:hidden">
                <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 transform transition-transform duration-300">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900">Start Transfer</h3>
                    <button
                      onClick={() => {
                        setShowMobileModal(false);
                        setSelectedFiles(null);
                      }}
                      className="text-gray-500 hover:text-gray-700 p-2"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="max-h-[70vh] overflow-y-auto" id="modal-transfer-form">
                    <TransferForm />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

      </div>
    </BackgroundManager>
  );
}

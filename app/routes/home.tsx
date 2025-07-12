import type { Route } from "./+types/home";
import { BackgroundManager } from "../components/BackgroundManager";
import { TransferForm } from "../components/TransferForm";
import { Header } from "../components/Header";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Aroko - Ancient Yoruba Way of Sending Files" },
    { name: "description", content: "Send large files with the ancient Yoruba way of messaging. Pay-as-you-use storage from ₦60/month or ₦2/day. Free transfers included!" },
  ];
}

export default function Home() {
  return (
    <BackgroundManager>
      <div className="min-h-screen">
        <Header />

        {/* Main content area */}
        <div className="px-4 md:px-6 py-4 md:py-8 pb-20">
          <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start min-h-[calc(100vh-120px)] lg:min-h-[calc(100vh-160px)]">
            
            {/* Left side - Transfer widget */}
            <div className="order-2 lg:order-1 lg:col-span-1 flex items-start justify-center lg:justify-start">
              <div className="bg-white rounded-2xl shadow-xl p-4 md:p-5 w-full max-w-sm mx-auto lg:mx-0 lg:sticky lg:top-6">
                <div className="max-h-[70vh] overflow-y-auto scrollable-widget">
                  <TransferForm />
                </div>
              </div>
            </div>

            {/* Right side - Headline and CTA */}
            <div className="order-1 lg:order-2 lg:col-span-2 text-center lg:text-left lg:pl-8 flex flex-col justify-center">
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
      </div>
    </BackgroundManager>
  );
}

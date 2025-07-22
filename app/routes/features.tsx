import type { Route } from "./+types/features";
import { BackgroundManager } from "../components/BackgroundManager";
import { Header } from "../components/Header";
import { Link } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Features - Arosend" },
    { name: "description", content: "Discover Arosend's powerful file transfer and storage features. Pay-as-you-use pricing, secure transfers, and long-term storage options." },
  ];
}

export default function Features() {
  const features = [
    {
      icon: "🚀",
      title: "Fast & Secure Transfers",
      description: "Send files up to any size with military-grade encryption and optimized delivery speeds.",
      details: ["End-to-end encryption", "Resume interrupted transfers", "Global CDN delivery"]
    },
    {
      icon: "💰",
      title: "Pay-as-You-Use Storage",
      description: "Only pay for what you store. No monthly commitments or hidden fees.",
      details: ["₦60 ($0.04)/month per GB", "₦2 ($0.001)/day flexible pricing", "No setup costs"]
    },
    {
      icon: "⏱️",
      title: "Free Quick Transfers",
      description: "Send files instantly with 24-hour free storage for temporary transfers.",
      details: ["24-hour expiry", "No registration required", "Instant sharing links"]
    },
    {
      icon: "📱",
      title: "Cross-Platform Access",
      description: "Access your files from any device, anywhere in the world.",
      details: ["Web browser access", "Mobile optimized", "Offline file management"]
    },
    {
      icon: "🔒",
      title: "Enterprise Security",
      description: "Bank-level security with access controls and audit trails.",
      details: ["256-bit AES encryption", "Access logging", "Password protection"]
    },
    {
      icon: "📊",
      title: "Usage Analytics",
      description: "Track your usage and costs with detailed analytics and insights.",
      details: ["Real-time usage tracking", "Cost breakdown", "Download analytics"]
    }
  ];

  return (
    <BackgroundManager>
      <div className="min-h-screen">
        <Header />
        
        {/* Hero Section */}
        <div className="px-4 md:px-6 py-8 md:py-12">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              Powerful Features for
              <span className="block text-green-400">Modern File Sharing</span>
            </h1>
            <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
              Everything you need to store, share, and manage files securely. Built with the ancient Yoruba wisdom of reliable messaging.
            </p>
          </div>

          {/* Features Grid */}
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {features.map((feature, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-colors">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-white/70 mb-4 leading-relaxed">{feature.description}</p>
                <ul className="space-y-2">
                  {feature.details.map((detail, idx) => (
                    <li key={idx} className="flex items-center text-sm text-white/60">
                      <div className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2 flex-shrink-0"></div>
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* CTA Section */}
          <div className="max-w-4xl mx-auto text-center bg-white/10 backdrop-blur-lg rounded-xl p-8 border border-white/20">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
              Ready to Start Sharing?
            </h2>
            <p className="text-white/70 mb-6 text-lg">
              Join thousands of users who trust Arosend for their file transfer needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/"
                className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold text-lg"
              >
                Start Transferring
              </Link>
              <Link 
                to="/pricing"
                className="border border-white/30 text-white px-8 py-3 rounded-lg hover:bg-white/10 transition-colors font-semibold text-lg"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </div>
      </div>
    </BackgroundManager>
  );
}
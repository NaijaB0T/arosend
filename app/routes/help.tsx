import type { Route } from "./+types/help";
import { BackgroundManager } from "../components/BackgroundManager";
import { Header } from "../components/Header";
import { Link } from "react-router";
import { useState } from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Help & Support - Arosend" },
    { name: "description", content: "Get help with Arosend file transfers and storage. Find answers to common questions and contact support." },
  ];
}

export default function Help() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqData = [
    {
      question: "How large can my files be?",
      answer: "There's no file size limit for transfers. However, larger files may take longer to upload and are subject to your storage costs if kept beyond 24 hours."
    },
    {
      question: "How does the pricing work?",
      answer: "We offer pay-as-you-use pricing. Free transfers expire in 24 hours. For longer storage, pay ₦60 ($0.04)/month per GB or ₦2 ($0.001)/day as you use."
    },
    {
      question: "Are my files secure?",
      answer: "Yes, all files are encrypted with 256-bit AES encryption during transfer and storage. We use enterprise-grade security practices."
    },
    {
      question: "How long are files stored?",
      answer: "Free transfers are stored for 24 hours. Paid storage can be kept as long as you continue paying the storage fee."
    },
    {
      question: "Can I share files with multiple people?",
      answer: "Yes, you can share download links with anyone. Recipients don't need to create an account to download files."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards, debit cards, and bank transfers through our secure payment processor Paystack."
    },
    {
      question: "Can I cancel my storage anytime?",
      answer: "Yes, there are no long-term commitments. You can delete files or stop payments anytime. You only pay for what you actually use."
    },
    {
      question: "Do you offer bulk discounts?",
      answer: "For enterprise customers with high volume needs, please contact our support team to discuss custom pricing options."
    }
  ];

  const quickLinks = [
    { title: "Getting Started", items: ["Create your first transfer", "Understanding pricing", "Account setup"] },
    { title: "File Management", items: ["Uploading files", "Sharing links", "Managing storage"] },
    { title: "Billing & Payments", items: ["Payment methods", "Usage tracking", "Invoices"] },
    { title: "Security", items: ["File encryption", "Access controls", "Privacy policy"] }
  ];

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <BackgroundManager>
      <div className="min-h-screen">
        <Header />
        
        <div className="px-4 md:px-6 py-8 md:py-12">
          {/* Hero Section */}
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              How can we help you?
            </h1>
            <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto">
              Find answers to common questions or get in touch with our support team.
            </p>
          </div>

          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Quick Links */}
            <div className="lg:col-span-1">
              <h2 className="text-2xl font-bold text-white mb-6">Quick Links</h2>
              <div className="space-y-6">
                {quickLinks.map((section, index) => (
                  <div key={index} className="bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-white/20">
                    <h3 className="font-semibold text-white mb-3">{section.title}</h3>
                    <ul className="space-y-2">
                      {section.items.map((item, idx) => (
                        <li key={idx}>
                          <a href="#" className="text-sm text-white/70 hover:text-white transition-colors">
                            {item}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Contact Section */}
              <div className="mt-8 bg-white/10 backdrop-blur-lg rounded-lg p-6 border border-white/20">
                <h3 className="text-xl font-semibold text-white mb-4">Need More Help?</h3>
                <p className="text-white/70 mb-4 text-sm">
                  Can't find what you're looking for? Our support team is here to help.
                </p>
                <a 
                  href="mailto:support@arosend.com"
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium inline-block"
                >
                  Contact Support
                </a>
              </div>
            </div>

            {/* FAQ Section */}
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h2>
              <div className="space-y-4">
                {faqData.map((faq, index) => (
                  <div key={index} className="bg-white/10 backdrop-blur-lg rounded-lg border border-white/20 overflow-hidden">
                    <button
                      onClick={() => toggleFaq(index)}
                      className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-white/5 transition-colors"
                    >
                      <span className="font-medium text-white">{faq.question}</span>
                      <svg 
                        className={`w-5 h-5 text-white/70 transition-transform ${openFaq === index ? 'rotate-180' : ''}`}
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {openFaq === index && (
                      <div className="px-6 pb-4">
                        <p className="text-white/70 leading-relaxed">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Still Need Help */}
              <div className="mt-8 bg-gradient-to-r from-green-600/20 to-blue-600/20 backdrop-blur-lg rounded-lg p-6 border border-white/20">
                <h3 className="text-xl font-semibold text-white mb-2">Still need help?</h3>
                <p className="text-white/70 mb-4">
                  Our support team typically responds within 24 hours.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a 
                    href="mailto:support@arosend.com"
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium text-center"
                  >
                    Email Support
                  </a>
                  <Link 
                    to="/features"
                    className="border border-white/30 text-white px-6 py-2 rounded-lg hover:bg-white/10 transition-colors font-medium text-center"
                  >
                    View Features
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BackgroundManager>
  );
}
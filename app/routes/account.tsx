import { useState, useEffect } from "react";
import { useAuth } from "~/lib/auth";
import { Navigate } from "react-router";
import { CreditsTab } from "~/components/account/CreditsTab";
import { FilesTab } from "~/components/account/FilesTab";
import { BackgroundManager } from "~/components/BackgroundManager";
import { Header } from "~/components/Header";
import { TransferForm } from "~/components/TransferForm";
import type { Route } from "./+types/account";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Account Management - Arosend" },
    { name: "description", content: "Manage your Arosend account, credits, and settings." },
  ];
}

export default function Account() {
  const { isAuthenticated, user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("files");
  const [expandedWidget, setExpandedWidget] = useState<'transfer' | 'account' | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isMobileTransferCollapsed, setIsMobileTransferCollapsed] = useState(true);
  
  // Derived states for backward compatibility
  const isTransferExpanded = expandedWidget === 'transfer';
  const isAccountExpanded = expandedWidget === 'account';
  
  // Handler for widget expansion with immediate state change
  const handleWidgetExpansion = (widget: 'transfer' | 'account' | null) => {
    if (!isDesktop) return;
    setExpandedWidget(widget);
  };

  // Check if device is desktop on mount
  useEffect(() => {
    const checkIsDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkIsDesktop();
    window.addEventListener('resize', checkIsDesktop);
    return () => window.removeEventListener('resize', checkIsDesktop);
  }, []);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <BackgroundManager>
        <div className="h-screen overflow-hidden">
          <Header />
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-white">Loading...</p>
            </div>
          </div>
        </div>
      </BackgroundManager>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const tabs = [
    { id: "files", label: "Files", icon: "📁" },
    { id: "credits", label: "Credits", icon: "💳" },
    { id: "profile", label: "Profile", icon: "👤" },
    { id: "settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <BackgroundManager>
      <div className="min-h-screen">
        <Header />
        
        {/* Main content area */}
        <div className="px-4 md:px-6 py-4 md:py-8 pb-20">
          {/* Mobile Layout */}
          <div className="lg:hidden">
            {/* Mobile Transfer Widget - Collapsible */}
            <div className="mb-6">
              <button
                onClick={() => setIsMobileTransferCollapsed(!isMobileTransferCollapsed)}
                className="w-full bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-white/20 text-white flex items-center justify-between hover:bg-white/15 transition-colors"
              >
                <div className="flex items-center">
                  <span className="text-lg mr-2">📤</span>
                  <span className="font-medium">Quick Transfer</span>
                </div>
                <svg 
                  className={`w-5 h-5 transition-transform ${isMobileTransferCollapsed ? '' : 'rotate-180'}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {!isMobileTransferCollapsed && (
                <div className="mt-4 bg-white rounded-2xl shadow-xl p-4">
                  <div className="max-h-[60vh] overflow-y-auto">
                    <TransferForm />
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Account Management */}
            <div>
              {/* Header */}
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-white mb-2">Account Management</h1>
                <p className="text-white/70 text-sm">Welcome back, {user?.email}</p>
              </div>

              {/* Tabs */}
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-white/20">
                <div className="flex flex-wrap gap-1 mb-4 overflow-x-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${
                        activeTab === tab.id
                          ? "bg-indigo-600 text-white"
                          : "text-white/70 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <span>{tab.icon}</span>
                      <span className="text-sm">{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="space-y-4">
                  {activeTab === "files" && <FilesTab />}
                  {activeTab === "credits" && <CreditsTab />}
                  {activeTab === "profile" && (
                    <div className="text-white">
                      <h2 className="text-lg font-semibold mb-4">Profile Settings</h2>
                      <p className="text-white/70 text-sm">Profile management coming soon...</p>
                    </div>
                  )}
                  {activeTab === "settings" && (
                    <div className="text-white">
                      <h2 className="text-lg font-semibold mb-4">Account Settings</h2>
                      <p className="text-white/70 text-sm">Settings management coming soon...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className={`hidden lg:grid w-full max-w-7xl mx-auto grid-cols-1 gap-6 lg:gap-8 items-start transition-all duration-500 ${
            isTransferExpanded ? 'lg:grid-cols-5' : isAccountExpanded ? 'lg:grid-cols-6' : 'lg:grid-cols-4'
          }`}>
            
            {/* Left side - Transfer widget (Desktop) */}
            <div 
              className={`transition-all duration-500 ${
                isTransferExpanded ? 'lg:col-span-3' : isAccountExpanded ? 'lg:col-span-1' : 'lg:col-span-1'
              }`}
              onMouseEnter={() => handleWidgetExpansion('transfer')}
              onMouseLeave={() => expandedWidget === 'transfer' && handleWidgetExpansion(null)}
            >
              <div className={`bg-white rounded-2xl shadow-xl p-4 md:p-5 w-full mx-auto lg:mx-0 lg:sticky lg:top-6 transition-all duration-500 ${
                isTransferExpanded ? 'max-w-none shadow-2xl scale-105' : isAccountExpanded ? 'max-w-sm scale-95 opacity-90' : 'max-w-sm hover:shadow-2xl cursor-pointer'
              }`}>
                <div className="max-h-[70vh] overflow-y-auto scrollable-widget">
                  <TransferForm />
                </div>
              </div>
            </div>

            {/* Right side - Account Management (Desktop) */}
            <div 
              className={`transition-all duration-500 ${
                isTransferExpanded ? 'lg:col-span-2' : isAccountExpanded ? 'lg:col-span-5' : 'lg:col-span-3'
              }`}
              onFocus={() => handleWidgetExpansion('account')}
              onBlur={() => expandedWidget === 'account' && handleWidgetExpansion(null)}
              onMouseEnter={() => handleWidgetExpansion('account')}
              onMouseLeave={() => expandedWidget === 'account' && handleWidgetExpansion(null)}
              tabIndex={0}
            >
              {/* Header */}
              <div className="mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Account Management</h1>
                <p className="text-white/70 text-sm md:text-base">Welcome back, {user?.email}</p>
              </div>

              {/* Tabs */}
              <div className={`bg-white/10 backdrop-blur-lg rounded-lg p-4 md:p-6 transition-all duration-500 ${
                isAccountExpanded ? 'shadow-2xl scale-105 bg-white/15' : 'hover:bg-white/15 cursor-pointer'
              }`}>
                <div className="flex flex-wrap gap-1 mb-4 md:mb-6 overflow-x-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-2 px-3 md:px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${
                        activeTab === tab.id
                          ? "bg-indigo-600 text-white"
                          : "text-white/70 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      <span>{tab.icon}</span>
                      <span className="hidden xs:inline text-sm md:text-base">{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="space-y-4">
                  {activeTab === "files" && <FilesTab />}
                  {activeTab === "credits" && <CreditsTab />}
                  {activeTab === "profile" && (
                    <div className="text-white">
                      <h2 className="text-lg md:text-xl font-semibold mb-4">Profile Settings</h2>
                      <p className="text-white/70 text-sm md:text-base">Profile management coming soon...</p>
                    </div>
                  )}
                  {activeTab === "settings" && (
                    <div className="text-white">
                      <h2 className="text-lg md:text-xl font-semibold mb-4">Account Settings</h2>
                      <p className="text-white/70 text-sm md:text-base">Settings management coming soon...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </BackgroundManager>
  );
}
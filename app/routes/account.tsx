import { useState } from "react";
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
    { title: "Account Management - Aroko" },
    { name: "description", content: "Manage your Aroko account, credits, and settings." },
  ];
}

export default function Account() {
  const { isAuthenticated, user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("files");

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
    return <Navigate to="/auth/login" replace />;
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
        <div className="px-4 md:px-6 py-6 md:py-8 pb-20">
          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8 items-start">
            
            {/* Left side - Transfer widget */}
            <div className="order-2 lg:order-1 lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-xl p-4 md:p-5 w-full max-w-sm mx-auto lg:mx-0 sticky top-6">
                <div className="max-h-[70vh] overflow-y-auto scrollable-widget">
                  <TransferForm />
                </div>
              </div>
            </div>

            {/* Right side - Account Management */}
            <div className="order-1 lg:order-2 lg:col-span-3">
              {/* Header */}
              <div className="mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Account Management</h1>
                <p className="text-white/70 text-sm md:text-base">Welcome back, {user?.email}</p>
              </div>

              {/* Tabs */}
              <div className="bg-white/10 backdrop-blur-lg rounded-lg p-4 md:p-6">
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
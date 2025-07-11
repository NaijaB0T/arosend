import { useAuth } from "~/lib/auth";

export default function AuthDebug() {
  const { login } = useAuth();

  const handleDebugLogin = () => {
    // Log current state before login
    console.log("Debug: Starting login flow");
    console.log("Current localStorage:", localStorage.getItem("auth_user"));
    console.log("Current cookies:", document.cookie);
    console.log("Current origin:", window.location.origin);
    
    // Clear everything before starting
    localStorage.clear();
    
    // Clear all cookies for this domain
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    
    console.log("Debug: Cleared all local state");
    
    // Start login
    login();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 bg-white/10 backdrop-blur-lg rounded-lg p-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-2">Debug Auth Flow</h2>
          <p className="text-white/70">Click to test authentication with debug logging</p>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={handleDebugLogin}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Start Debug Login
          </button>
          
          <div className="text-center">
            <p className="text-white/70 text-sm">
              Check browser console for debug information
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
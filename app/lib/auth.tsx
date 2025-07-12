import { createContext, useContext, useEffect, useState } from "react";

const AUTH_BASE_URL = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";

interface AuthUser {
  id: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: () => void;
  register: () => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);

  // Set isClient to true after hydration to prevent SSR/hydration mismatches
  useEffect(() => {
    setIsClient(true);
  }, []);

  const checkAuth = async () => {
    try {
      // Only check in the browser and after client hydration
      if (isClient && typeof window !== "undefined") {
        // Check if we just came back from successful auth
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('auth') === 'success') {
          // Clear the URL parameter
          window.history.replaceState({}, '', window.location.pathname);
        }
        
        // Try to get user info from the server (which reads the HttpOnly cookie)
        try {
          const response = await fetch(`${AUTH_BASE_URL}/api/userinfo`, {
            credentials: 'include', // Important: include cookies
          });
          
          if (response.ok) {
            const userData: AuthUser = await response.json();
            setUser(userData);
            // Also store in localStorage for offline access
            localStorage.setItem("auth_user", JSON.stringify(userData));
            return;
          }
        } catch (fetchError) {
          console.log("No server auth found, checking localStorage");
        }
        
        // Fallback to localStorage if server check fails
        const userData = localStorage.getItem("auth_user");
        if (userData) {
          setUser(JSON.parse(userData));
        }
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      if (typeof window !== "undefined") {
        localStorage.removeItem("auth_user");
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = () => {
    // Direct navigation to OpenAuth login
    window.location.href = `${AUTH_BASE_URL}/api/auth/password/authorize`;
  };

  const register = () => {
    // Direct navigation to OpenAuth register
    window.location.href = `${AUTH_BASE_URL}/api/auth/password/register`;
  };

  const logout = async () => {
    if (typeof window !== "undefined") {
      // Clear localStorage
      localStorage.removeItem("auth_user");
      
      // Clear server-side cookie by making a logout request
      try {
        await fetch(`${AUTH_BASE_URL}/api/logout`, {
          method: 'POST',
          credentials: 'include',
        });
      } catch (error) {
        console.log("Logout request failed, but clearing local state anyway");
      }
      
      // Redirect to home page after logout
      window.location.href = '/';
    }
    setUser(null);
  };

  // Function to handle auth code from popup
  const handleAuthCode = async (code: string) => {
    try {
      // Exchange code for tokens using the local mock token endpoint
      const tokenResponse = await fetch(`${AUTH_BASE_URL}/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          client_id: 'naijasender-webapp',
          redirect_uri: AUTH_BASE_URL + '/callback'
        })
      });

      if (!tokenResponse.ok) {
        throw new Error('Token exchange failed');
      }

      const tokens = await tokenResponse.json();
      
      // For now, create mock user data since we have a working auth flow
      const userData = {
        id: `user-${Date.now()}`,
        email: "user@example.com" // In real implementation, get this from token
      };
      
      setAuthUser(userData);
    } catch (error) {
      console.error('Auth code handling failed:', error);
    }
  };

  // Function to set user after successful auth
  const setAuthUser = (userData: AuthUser) => {
    setUser(userData);
    localStorage.setItem("auth_user", JSON.stringify(userData));
  };

  useEffect(() => {
    if (isClient) {
      checkAuth();
    }
  }, [isClient]);

  useEffect(() => {
    if (!isClient) return;
    
    // Listen for storage changes (including from other tabs or manual updates)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_user') {
        if (e.newValue) {
          try {
            setUser(JSON.parse(e.newValue));
          } catch (error) {
            console.error('Error parsing user data from storage:', error);
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, [isClient]);

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
import { useAuth } from "~/lib/auth";
import { Link } from "react-router";
import { BackgroundManager } from "~/components/BackgroundManager";
import { Header } from "~/components/Header";
import type { Route } from "./+types/auth.register";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Sign Up - Aroko" },
    { name: "description", content: "Create your Aroko account to start managing files and credits." },
  ];
}

export default function Register() {
  const { register } = useAuth();

  return (
    <BackgroundManager>
      <div className="h-screen overflow-hidden">
        <Header />
        
        {/* Main content area */}
        <div className="flex items-center justify-center h-full px-4 md:px-6 py-8 overflow-y-auto">
          <div className="max-w-md w-full space-y-6 md:space-y-8 bg-white/10 backdrop-blur-lg rounded-lg p-6 md:p-8 mx-4">
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Sign Up</h2>
              <p className="text-white/70 text-sm md:text-base">Join Aroko</p>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={register}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm md:text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Sign Up with Email
              </button>
              
              <div className="text-center">
                <p className="text-white/70 text-sm">
                  Already have an account?{" "}
                  <Link to="/auth/login" className="text-indigo-300 hover:text-indigo-200 font-medium transition-colors">
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BackgroundManager>
  );
}
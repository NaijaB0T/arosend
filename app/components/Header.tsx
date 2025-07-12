import React, { useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '~/lib/auth';

export function Header() {
  const { user, logout, isAuthenticated } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="relative z-50 p-4 md:p-6">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <Link 
          to="/" 
          className="text-lg md:text-2xl font-bold text-white hover:opacity-80 transition-opacity font-logo"
          onClick={closeMenu}
        >
          AA r o k OOO
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-8 text-white text-base">
          <a href="#" className="hover:opacity-80 transition-opacity font-light">Storage</a>
          <a href="#" className="hover:opacity-80 transition-opacity font-light">Pricing</a>
          <a href="#" className="hover:opacity-80 transition-opacity font-light">Transfer</a>
          <a href="#" className="hover:opacity-80 transition-opacity font-light">Help</a>
        </nav>
        
        {/* Desktop Auth buttons */}
        <div className="hidden lg:flex items-center space-x-3">
          {isAuthenticated ? (
            <>
              <Link 
                to="/account"
                className="text-white hover:opacity-80 transition-opacity px-4 py-2 font-light text-base"
              >
                Account
              </Link>
              <span className="text-white/70 text-sm hidden xl:inline">
                {user?.email}
              </span>
              <button 
                onClick={logout}
                className="text-white hover:opacity-80 transition-opacity px-4 py-2 font-light text-base"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link 
                to="/auth/login"
                className="text-white hover:opacity-80 transition-opacity px-4 py-2 font-light text-base"
              >
                Log in
              </Link>
              <Link 
                to="/auth/register"
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-light text-base"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button 
          onClick={toggleMenu}
          className="lg:hidden text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu dropdown */}
      {isMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 bg-black/95 backdrop-blur-lg border-t border-white/10 mt-2 mx-4 rounded-lg shadow-xl">
          <nav className="p-4 space-y-4">
            {/* Navigation links */}
            <div className="space-y-3 pb-4 border-b border-white/10">
              <a href="#" className="block text-white hover:opacity-80 transition-opacity font-light py-2">Storage</a>
              <a href="#" className="block text-white hover:opacity-80 transition-opacity font-light py-2">Pricing</a>
              <a href="#" className="block text-white hover:opacity-80 transition-opacity font-light py-2">Transfer</a>
              <a href="#" className="block text-white hover:opacity-80 transition-opacity font-light py-2">Help</a>
            </div>
            
            {/* Auth section */}
            <div className="space-y-3 pt-2">
              {isAuthenticated ? (
                <>
                  {user?.email && (
                    <div className="text-white/70 text-sm py-2">
                      {user.email}
                    </div>
                  )}
                  <Link 
                    to="/account"
                    className="block text-white hover:opacity-80 transition-opacity py-2 font-light"
                    onClick={closeMenu}
                  >
                    Account
                  </Link>
                  <button 
                    onClick={() => { logout(); closeMenu(); }}
                    className="block w-full text-left text-white hover:opacity-80 transition-opacity py-2 font-light"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    to="/auth/login"
                    className="block text-white hover:opacity-80 transition-opacity py-2 font-light"
                    onClick={closeMenu}
                  >
                    Log in
                  </Link>
                  <Link 
                    to="/auth/register"
                    className="block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-light text-center"
                    onClick={closeMenu}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
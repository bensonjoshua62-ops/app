import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Sun, Moon } from 'lucide-react';
import { navLinks } from '../data/mock';
import { useTheme } from '../context/ThemeContext';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_forex-buddy-10/artifacts/qq95ijqq_IMG_4116.webp";

const Navbar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b transition-colors duration-300 ${
      isDark 
        ? 'bg-[#0a0a0f]/80 border-white/5' 
        : 'bg-white/80 border-gray-200'
    }`}>
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <img 
              src={LOGO_URL} 
              alt="IGRIS Logo" 
              className="w-8 h-8 object-contain group-hover:scale-110 transition-transform"
            />
            <span className="text-xl font-semibold">
              <span className={isDark ? 'text-white' : 'text-gray-900'}>IG</span>
              <span className="text-[#FFA500]">RIS</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              link.href.startsWith('/') ? (
                <Link
                  key={link.label}
                  to={link.href}
                  className={`hover:text-[#FFA500] transition-colors text-sm font-medium ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`hover:text-[#FFA500] transition-colors text-sm font-medium ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}
                >
                  {link.label}
                </a>
              )
            ))}
          </div>

          {/* Right side buttons */}
          <div className="hidden md:flex items-center gap-4">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full transition-all hover:scale-110 ${
                isDark 
                  ? 'bg-white/10 text-yellow-400 hover:bg-white/20' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            <button 
              onClick={() => navigate('/signin')}
              className={`transition-colors text-sm font-medium px-4 py-2 ${
                isDark ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sign In
            </button>
            <button 
              onClick={() => navigate('/signup')}
              className="bg-[#FFA500] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#FF8C00] transition-all hover:scale-105"
            >
              Get Started Free
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            {/* Mobile Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-full transition-all ${
                isDark 
                  ? 'bg-white/10 text-yellow-400' 
                  : 'bg-gray-100 text-gray-600'
              }`}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            <button
              className={`p-2 ${isDark ? 'text-white' : 'text-gray-900'}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className={`md:hidden mt-4 pb-4 border-t pt-4 ${
            isDark ? 'border-white/10' : 'border-gray-200'
          }`}>
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                link.href.startsWith('/') ? (
                  <Link
                    key={link.label}
                    to={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`hover:text-[#FFA500] transition-colors text-sm font-medium ${
                      isDark ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    {link.label}
                  </Link>
                ) : (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`hover:text-[#FFA500] transition-colors text-sm font-medium ${
                      isDark ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    {link.label}
                  </a>
                )
              ))}
              <div className="flex flex-col gap-3 mt-4">
                <button 
                  onClick={() => navigate('/signin')}
                  className={`transition-colors text-sm font-medium ${
                    isDark ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Sign In
                </button>
                <button 
                  onClick={() => navigate('/signup')}
                  className="bg-[#FFA500] text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-[#FF8C00] transition-all"
                >
                  Get Started Free
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { BACKEND_URL } from '../utils/config';

const SignIn = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // Redirect to dashboard if already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Use XMLHttpRequest to avoid fetch interceptors
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BACKEND_URL}/api/auth/signin`, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = 30000; // 30 second timeout
    
    xhr.ontimeout = function() {
      setLoading(false);
      setError('Connection timeout. The server is taking too long to respond. Please try again.');
    };
    
    xhr.onload = function() {
      setLoading(false);
      try {
        const data = JSON.parse(xhr.responseText);
        
        if (xhr.status === 200) {
          // Clear any stale data first before setting new user data
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          
          // Set fresh user data
          localStorage.setItem('token', data.access_token);
          localStorage.setItem('user', JSON.stringify(data.user));
          
          console.log('Login successful for:', data.user?.email, 'ID:', data.user?.id);
          navigate('/dashboard');
        } else if (xhr.status === 401) {
          setError('Invalid email or password. Please try again.');
        } else if (xhr.status === 404) {
          setError('Account not found. Please check your email or sign up.');
        } else {
          setError(data.detail || 'Sign in failed. Please try again.');
        }
      } catch {
        setError('Server error. Please try again.');
      }
    };
    
    xhr.onerror = function() {
      setLoading(false);
      console.error('Network error during signin. Backend URL:', `${BACKEND_URL}/api/auth/signin`);
      setError(`Unable to connect to server (${BACKEND_URL}). Please check your internet connection or try again later.`);
    };
    
    xhr.send(JSON.stringify(formData));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-6 py-12 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#FFA500]/20 via-orange-500/10 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <Zap className="w-8 h-8 text-[#FFA500] fill-[#FFA500]" />
          <span className="text-2xl font-bold">
            <span className="text-white">IGRIS</span>
          </span>
        </Link>

        {/* Card */}
        <div className="bg-[#12121a]/60 backdrop-blur-xl rounded-2xl border border-white/5 p-8">
          <h1 className="text-2xl font-bold text-white text-center mb-2">Welcome back</h1>
          <p className="text-gray-400 text-center mb-8">Sign in to your IGRIS account</p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-6">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#FFA500]/50 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-11 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#FFA500]/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-[#FFA500] hover:text-[#FF8C00] transition-colors">
                Forgot password?
              </Link>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FFA500] hover:bg-[#FF8C00] disabled:bg-[#FFA500]/50 text-white py-3 rounded-xl font-semibold transition-all hover:scale-[1.02] disabled:scale-100 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-gray-500 text-sm">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Sign up link */}
          <p className="text-center text-gray-400">
            Don't have an account?{' '}
            <Link to="/signup" className="text-[#FFA500] hover:text-[#FF8C00] font-medium transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignIn;

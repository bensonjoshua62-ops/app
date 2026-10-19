import React, { useState } from 'react';
import { TrendingUp, Server, Key, Hash, Eye, EyeOff, Loader2, CheckCircle, XCircle, Shield } from 'lucide-react';
import { BACKEND_URL } from '../utils/config';

const MT5ConnectForm = ({ onConnect, onCancel }) => {
  const [formData, setFormData] = useState({
    accountName: '',
    server: '',
    login: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsConnecting(true);
    setError('');
    setSuccess('');

    const token = localStorage.getItem('token');
    
    if (!token) {
      setError('Please login first');
      setIsConnecting(false);
      return;
    }
    
    if (!BACKEND_URL) {
      setError('Backend URL not configured');
      setIsConnecting(false);
      return;
    }
    
    // Use XMLHttpRequest to avoid "body stream already read" error
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BACKEND_URL}/api/metaapi/connect`, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.timeout = 90000; // 90 seconds timeout for faster feedback
    
    xhr.onload = function() {
      setIsConnecting(false);
      try {
        const data = JSON.parse(xhr.responseText);
        
        if (xhr.status === 200 && data.success) {
          setSuccess(data.message || 'MT5 account connected successfully!');
          if (onConnect) {
            // Immediate callback for faster transition
            setTimeout(() => onConnect(data), 300);
          }
        } else {
          // Better error message extraction
          let errorMsg = 'Failed to connect MT5 account';
          if (data.detail) {
            if (data.detail.includes('server') && data.detail.includes('not found')) {
              errorMsg = 'Server not found. Please check the server name (e.g., Exness-MT5Real10, JustMarkets-Live)';
            } else if (data.detail.includes('password') || data.detail.includes('credentials')) {
              errorMsg = 'Invalid credentials. Please check your login and password.';
            } else {
              errorMsg = data.detail;
            }
          } else if (data.error) {
            errorMsg = data.error;
          }
          setError(errorMsg);
        }
      } catch (e) {
        setError('Failed to parse server response. Please try again.');
      }
    };
    
    xhr.onerror = function() {
      setIsConnecting(false);
      setError('Network error. Please check your internet connection and try again.');
    };
    
    xhr.ontimeout = function() {
      setIsConnecting(false);
      setError('Connection timed out. The server might be busy. Please try again.');
    };
    
    xhr.send(JSON.stringify({
      account_name: formData.accountName,
      server: formData.server,
      login: formData.login,
      password: formData.password
    }));
  };

  return (
    <div className="bg-[#12121a] rounded-2xl border border-white/10 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-[#FFA500]/20 flex items-center justify-center">
          <TrendingUp className="w-6 h-6 text-[#FFA500]" />
        </div>
        <div>
          <h3 className="text-white font-semibold text-lg">Connect to MT5</h3>
          <p className="text-gray-400 text-sm">Enter your MetaTrader 5 credentials</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
          <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <p className="text-emerald-400 text-sm">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-gray-400 text-sm block mb-2">Account Name</label>
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={formData.accountName}
              onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
              placeholder="My Trading Account"
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#FFA500]/50"
            />
          </div>
        </div>

        <div>
          <label className="text-gray-400 text-sm block mb-2">Server</label>
          <div className="relative">
            <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={formData.server}
              onChange={(e) => setFormData({ ...formData, server: e.target.value })}
              placeholder="ICMarketsSC-Demo"
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#FFA500]/50"
            />
          </div>
          <p className="text-gray-500 text-xs mt-1">Enter your broker's server name</p>
        </div>

        <div>
          <label className="text-gray-400 text-sm block mb-2">Account Number (Login)</label>
          <div className="relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={formData.login}
              onChange={(e) => setFormData({ ...formData, login: e.target.value })}
              placeholder="12345678"
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#FFA500]/50"
            />
          </div>
        </div>

        <div>
          <label className="text-gray-400 text-sm block mb-2">Password</label>
          <div className="relative">
            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Your MT5 password"
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-12 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#FFA500]/50"
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

        <div className="flex gap-3 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 font-medium transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isConnecting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#FFA500] hover:bg-[#FF8C00] text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <TrendingUp className="w-5 h-5" />
                Connect Account
              </>
            )}
          </button>
        </div>
      </form>

      <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
        <Shield className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        <p className="text-emerald-400 text-xs">
          <strong>Secure Connection:</strong> Your credentials are encrypted and transmitted securely. We never store your password.
        </p>
      </div>
    </div>
  );
};

export default MT5ConnectForm;

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Check, RefreshCw } from 'lucide-react';
import { BACKEND_URL } from '../utils/config';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Email, 2: Code, 3: New Password
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [formData, setFormData] = useState({
    email: '',
    code: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/verification/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to send reset code');
      }

      setSuccess('If this email is registered, you will receive a reset code.');
      setStep(2);
      setCountdown(60);
    } catch (err) {
      setError(err.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;
    
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/verification/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to resend code');
      }

      setSuccess('New reset code sent!');
      setCountdown(60);
    } catch (err) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndProceed = (e) => {
    e.preventDefault();
    if (formData.code.length === 6) {
      setStep(3);
      setError('');
      setSuccess('');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/api/verification/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          code: formData.code,
          new_password: formData.newPassword
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to reset password');
      }

      setSuccess('Password reset successfully! Redirecting to sign in...');
      setTimeout(() => navigate('/signin'), 2000);
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
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
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-8 h-1 rounded-full transition-colors ${
                  s <= step ? 'bg-[#FFA500]' : 'bg-white/10'
                }`}
              />
            ))}
          </div>

          {/* Step 1: Email */}
          {step === 1 && (
            <>
              <Link
                to="/signin"
                className="flex items-center gap-1 text-gray-400 hover:text-white mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </Link>

              <h1 className="text-2xl font-bold text-white text-center mb-2">Forgot password?</h1>
              <p className="text-gray-400 text-center mb-8">
                No worries, we'll send you reset instructions.
              </p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-6">
                  <p className="text-red-400 text-sm text-center">{error}</p>
                </div>
              )}

              <form onSubmit={handleSendCode} className="space-y-5">
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
                      Send Reset Code
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* Step 2: Code Verification */}
          {step === 2 && (
            <>
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-gray-400 hover:text-white mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <h1 className="text-2xl font-bold text-white text-center mb-2">Check your email</h1>
              <p className="text-gray-400 text-center mb-2">
                We sent a code to <span className="text-[#FFA500]">{formData.email}</span>
              </p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-6">
                  <p className="text-red-400 text-sm text-center">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-6">
                  <p className="text-green-400 text-sm text-center">{success}</p>
                </div>
              )}

              <form onSubmit={handleVerifyAndProceed} className="space-y-5 mt-6">
                {/* Reset Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Reset Code</label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-[0.5em] placeholder-gray-500 focus:outline-none focus:border-[#FFA500]/50 transition-colors"
                  />
                </div>

                {/* Resend code */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={countdown > 0 || loading}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#FFA500] disabled:text-gray-600 transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
                  </button>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={formData.code.length !== 6}
                  className="w-full bg-[#FFA500] hover:bg-[#FF8C00] disabled:bg-[#FFA500]/50 text-white py-3 rounded-xl font-semibold transition-all hover:scale-[1.02] disabled:scale-100 flex items-center justify-center gap-2"
                >
                  Continue
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>
            </>
          )}

          {/* Step 3: New Password */}
          {step === 3 && (
            <>
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-1 text-gray-400 hover:text-white mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <h1 className="text-2xl font-bold text-white text-center mb-2">Set new password</h1>
              <p className="text-gray-400 text-center mb-8">
                Your new password must be different from previously used passwords.
              </p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-6">
                  <p className="text-red-400 text-sm text-center">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-6">
                  <p className="text-green-400 text-sm text-center">{success}</p>
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-5">
                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleChange}
                      placeholder="Enter new password"
                      required
                      minLength={6}
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
                  <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm new password"
                      required
                      minLength={6}
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#FFA500]/50 transition-colors"
                    />
                  </div>
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
                      Reset Password
                      <Check className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* Sign in link */}
          <p className="text-center text-gray-400 mt-6">
            Remember your password?{' '}
            <Link to="/signin" className="text-[#FFA500] hover:text-[#FF8C00] font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

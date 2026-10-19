import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock, Eye, EyeOff, User, ArrowRight, Check, ArrowLeft, RefreshCw } from 'lucide-react';
import { BACKEND_URL } from '../utils/config';

const SignUp = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Email, 2: Verification, 3: Complete signup
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    verificationCode: ''
  });

  // Redirect to dashboard if already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      navigate('/dashboard');
    }
  }, [navigate]);

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
      const response = await fetch(`${BACKEND_URL}/api/verification/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, name: formData.name })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to send verification code');
      }

      setSuccess('Verification code sent to your email!');
      setStep(2);
      setCountdown(60); // 60 second cooldown
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('Unable to connect to server. Please check your internet connection.');
      } else {
        setError(err.message || 'Failed to send verification code');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/verification/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, code: formData.verificationCode })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Invalid verification code');
      }

      setSuccess('Email verified! Complete your registration.');
      setStep(3);
    } catch (err) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (countdown > 0) return;
    
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/verification/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, name: formData.name })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to resend code');
      }

      setSuccess('New verification code sent!');
      setCountdown(60);
    } catch (err) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipVerification = () => {
    setStep(3);
    setSuccess('');
  };

  const handleCompleteSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Client-side validation
    if (!formData.name || formData.name.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters)');
      setLoading(false);
      return;
    }

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    if (!formData.password || formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.toLowerCase().trim(),
          password: formData.password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 400) {
          if (data.detail?.includes('already')) {
            throw new Error('This email is already registered. Please sign in instead.');
          } else if (data.detail?.includes('email')) {
            throw new Error('Please enter a valid email address');
          } else if (data.detail?.includes('password')) {
            throw new Error('Password must be at least 6 characters long');
          } else if (data.detail?.includes('name')) {
            throw new Error('Please enter your full name (at least 2 characters)');
          }
        }
        throw new Error(data.detail || 'Sign up failed. Please try again.');
      }

      // New flow: Show success message about pending approval
      if (data.success) {
        setStep(4); // New step for pending approval
        setSuccess(data.message || 'Account created! Please wait for admin approval.');
      } else {
        // Fallback for old flow (auto-login)
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    'AI-powered market analysis',
    'Real-time trading signals',
    'Chat with IGRIS AI assistant',
    'MT5 integration'
  ];

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

          {/* Step 1: Email & Name */}
          {step === 1 && (
            <>
              <h1 className="text-2xl font-bold text-white text-center mb-2">Create your account</h1>
              <p className="text-gray-400 text-center mb-8">Enter your details to get started</p>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-6">
                  <p className="text-red-400 text-sm text-center">{error}</p>
                </div>
              )}

              <form onSubmit={handleSendCode} className="space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Enter your name"
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#FFA500]/50 transition-colors"
                    />
                  </div>
                </div>

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
                      Send Verification Code
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* Step 2: Verification Code */}
          {step === 2 && (
            <>
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-gray-400 hover:text-white mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <h1 className="text-2xl font-bold text-white text-center mb-2">Verify your email</h1>
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

              <form onSubmit={handleVerifyCode} className="space-y-5 mt-6">
                {/* Verification Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Verification Code</label>
                  <input
                    type="text"
                    name="verificationCode"
                    value={formData.verificationCode}
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
                  disabled={loading || formData.verificationCode.length !== 6}
                  className="w-full bg-[#FFA500] hover:bg-[#FF8C00] disabled:bg-[#FFA500]/50 text-white py-3 rounded-xl font-semibold transition-all hover:scale-[1.02] disabled:scale-100 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Verify Email
                      <Check className="w-5 h-5" />
                    </>
                  )}
                </button>

                {/* Skip verification */}
                <button
                  type="button"
                  onClick={handleSkipVerification}
                  className="w-full text-gray-400 hover:text-white py-2 text-sm transition-colors"
                >
                  Skip verification for now
                </button>
              </form>
            </>
          )}

          {/* Step 3: Complete Signup */}
          {step === 3 && (
            <>
              <button
                onClick={() => setStep(step === 3 && formData.verificationCode ? 2 : 1)}
                className="flex items-center gap-1 text-gray-400 hover:text-white mb-4 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>

              <h1 className="text-2xl font-bold text-white text-center mb-2">Complete registration</h1>
              <p className="text-gray-400 text-center mb-8">Set your password to finish</p>

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

              <form onSubmit={handleCompleteSignup} className="space-y-5">
                {/* Email display */}
                <div className="bg-white/5 rounded-xl p-4 flex items-center gap-3">
                  <Mail className="w-5 h-5 text-[#FFA500]" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-white">{formData.email}</p>
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
                      placeholder="Create a password"
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

                {/* Features */}
                <div className="bg-white/5 rounded-xl p-4 space-y-2">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-gray-300">
                      <Check className="w-4 h-4 text-[#FFA500]" />
                      {feature}
                    </div>
                  ))}
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
                      Create Account
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* Step 4: Pending Approval */}
          {step === 4 && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-[#FFA500]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-[#FFA500]" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-3">Account Created!</h1>
              <p className="text-gray-400 mb-6">
                Your account has been created successfully. Please wait for admin approval before you can log in.
              </p>
              <div className="bg-[#FFA500]/10 border border-[#FFA500]/20 rounded-xl p-4 mb-6">
                <p className="text-[#FFA500] text-sm">
                  You will be notified once your account is approved. This usually takes less than 24 hours.
                </p>
              </div>
              <Link 
                to="/signin"
                className="inline-flex items-center gap-2 text-[#FFA500] hover:text-[#FF8C00] font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </Link>
            </div>
          )}

          {/* Divider - only show on steps 1-3 */}
          {step < 4 && (
            <>
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-gray-500 text-sm">or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Sign in link */}
              <p className="text-center text-gray-400">
                Already have an account?{' '}
                <Link to="/signin" className="text-[#FFA500] hover:text-[#FF8C00] font-medium transition-colors">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>

        {/* Terms */}
        <p className="text-center text-gray-500 text-xs mt-6">
          By signing up, you agree to our{' '}
          <a href="#" className="text-gray-400 hover:text-white">Terms of Service</a>{' '}
          and{' '}
          <a href="#" className="text-gray-400 hover:text-white">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
};

export default SignUp;

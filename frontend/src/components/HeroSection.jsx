import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, Zap, Mic, MessageCircle } from 'lucide-react';
import { stats } from '../data/mock';
import GalaxySpiral from './GalaxySpiral';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_forex-buddy-10/artifacts/qq95ijqq_IMG_4116.webp";
const BG_GIF_URL = "https://customer-assets.emergentagent.com/job_mt5-connect-1/artifacts/a46xmhkx_IMG_4126.gif";

const HeroSection = () => {
  const navigate = useNavigate();
  const [isAnimating, setIsAnimating] = useState(false);

  // Animate the mic icon periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 2000);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen pt-32 pb-20 overflow-hidden w-full">
      {/* 3D Galaxy Spiral Background */}
      <div 
        className="absolute left-0 right-0 overflow-hidden top-[100px] md:top-0 md:bottom-0 h-[400px] md:h-full" 
        style={{ zIndex: 0 }}
      >
        <GalaxySpiral className="w-full h-full" />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/20 via-[#0a0a0f]/30 to-[#0a0a0f]/95" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="flex flex-col items-center text-center">
          {/* Announcement badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FFA500]/10 border border-[#FFA500]/20 text-[#FFA500] text-sm mb-8"
          >
            <img src={LOGO_URL} alt="IGRIS" className="w-5 h-5 object-contain" />
            <span>Powered by IGRIS AI Trading Assistant</span>
          </div>

          {/* Main headline */}
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            <span className="text-white">The World's First</span>
            <br />
            <span className="bg-gradient-to-r from-[#FFA500] via-orange-400 to-amber-400 bg-clip-text text-transparent">
              Expert Advisor - Powered Trading Platform
            </span>
          </h1>

          {/* Description */}
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed">
            Advanced machine learning helps reveal market structure and insights inside the app. On this page, explore features, pricing, and how IGRIS works.
          </p>

          {/* ARISE Button - FIRST with glowing border */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <button 
              onClick={() => navigate('/signin')}
              className="group inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white px-8 py-4 rounded-full text-base font-semibold border-2 border-[#FFA500] transition-all hover:scale-105 animate-glow"
            >
              Arise
              <Zap className="w-5 h-5 text-[#FFA500] animate-pulse drop-shadow-[0_0_12px_rgba(255,165,0,0.9)]" />
            </button>
          </div>

          {/* Talk to IGRIS Section - SECOND */}
          <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-[#FFA500]/10 via-[#FF6B00]/5 to-[#FFA500]/10 border border-[#FFA500]/20 backdrop-blur-lg">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Animated Avatar - Record Player Style */}
              <div className="relative record-player">
                {/* Outer glow ring */}
                <div className="absolute inset-[-4px] rounded-full bg-gradient-to-r from-[#FFA500] via-[#FF6B00] to-[#FFA500] opacity-60 blur-sm animate-pulse" />
                {/* Record disc */}
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#FFA500] to-[#FF6B00] flex items-center justify-center shadow-[0_0_40px_rgba(255,165,0,0.5),inset_0_0_20px_rgba(0,0,0,0.3)]">
                  {/* Record grooves */}
                  <div className="absolute inset-2 rounded-full border border-orange-900/30" />
                  <div className="absolute inset-4 rounded-full border border-orange-900/20" />
                  {/* Center label with rotating logo */}
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center shadow-inner">
                    <img 
                      src={LOGO_URL} 
                      alt="IGRIS" 
                      className="w-10 h-10 object-contain animate-spin-slow" 
                      style={{ animationDuration: '8s' }}
                    />
                  </div>
                </div>
                {/* Glowing ring effect */}
                <div className={`absolute inset-0 rounded-full border-2 border-[#FFA500] ${isAnimating ? 'animate-ping' : ''}`} style={{ animationDuration: '1.5s' }} />
                {/* Sound waves */}
                {isAnimating && (
                  <>
                    <div className="absolute -right-2 top-1/2 -translate-y-1/2 flex gap-1">
                      <div className="w-1 h-3 bg-[#FFA500] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1 h-5 bg-[#FFA500] rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
                      <div className="w-1 h-4 bg-[#FFA500] rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                    </div>
                  </>
                )}
              </div>
              
              {/* Text and Mic */}
              <div className="text-center md:text-left">
                <h3 className="text-white text-xl font-semibold mb-2 flex items-center justify-center md:justify-start gap-2">
                  <MessageCircle className="w-5 h-5 text-[#FFA500]" />
                  Talk to IGRIS
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  Use your voice to get instant trading insights and market analysis
                </p>
                <button
                  onClick={() => navigate('/signin')}
                  className={`btn-glass btn-glass-primary inline-flex items-center gap-3 px-6 py-3 rounded-full font-semibold ${isAnimating ? 'btn-glass-pulse' : ''}`}
                >
                  <div className="relative mic-glow">
                    <Mic className="w-5 h-5 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                    <span className="absolute inset-0 rounded-full bg-white/20 blur-md animate-pulse" />
                  </div>
                  Start Voice Trading
                </button>
              </div>
            </div>
          </div>

          {/* Get Started Button - LAST */}
          <div className="mb-16">
            <button 
              onClick={() => navigate('/signup')}
              className="btn-glass btn-glass-primary btn-glass-lg inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full text-base font-semibold"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          {/* Stats row */}
          <div className="w-full max-w-3xl bg-[#12121a]/80 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-gray-500 text-sm">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating elements - hidden on smaller screens, contained within viewport */}
      <div className="absolute top-40 right-10 xl:right-20 hidden lg:block pointer-events-none">
        <div className="bg-[#1a1a25]/80 backdrop-blur-lg rounded-xl p-3 border border-white/10 animate-float">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-gray-300">Enterprise Security</span>
          </div>
        </div>
      </div>

      <div className="absolute top-60 left-10 xl:left-20 hidden lg:block pointer-events-none">
        <div className="bg-[#1a1a25]/80 backdrop-blur-lg rounded-xl p-3 border border-white/10 animate-float-delay">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-violet-400" />
            <span className="text-xs text-gray-300">Global Markets</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-40 left-10 xl:left-32 hidden lg:block pointer-events-none">
        <div className="bg-[#1a1a25]/80 backdrop-blur-lg rounded-xl p-3 border border-white/10 animate-float">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-xs text-gray-300">In-App AI Analysis</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-60 right-10 xl:right-32 hidden lg:block pointer-events-none">
        <div className="bg-emerald-500/20 backdrop-blur-lg rounded-xl p-3 border border-emerald-500/20 animate-float-delay">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 text-sm font-semibold">+18.4%</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;

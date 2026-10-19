import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Sparkles } from 'lucide-react';

const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section id="pricing" className="relative py-24">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] pointer-events-none">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-600/20 via-purple-500/10 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6">
        <div className="bg-[#12121a]/60 backdrop-blur-2xl rounded-3xl border border-white/5 p-8 md:p-16 text-center">
          {/* Badge */}
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm mb-8">
            <Sparkles className="w-4 h-4" />
            Limited Time Offer
          </span>

          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Start Your AI Trading Journey Today
          </h2>
          <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
            Join the revolution in automated trading. Let our AI work for you 24/7, maximizing profits while minimizing risks.
          </p>

          {/* Features list */}
          <div className="flex flex-wrap items-center justify-center gap-6 mb-10">
            {['30-day money-back guarantee', 'Cancel anytime', '24/7 AI support'].map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-gray-300">
                <Check className="w-5 h-5 text-emerald-400" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => navigate('/signup')}
              className="inline-flex items-center justify-center gap-2 bg-[#FFA500] hover:bg-[#FF8C00] text-white px-8 py-4 rounded-full text-base font-semibold transition-all hover:scale-105 hover:shadow-lg hover:shadow-orange-500/25 w-full sm:w-auto"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </button>
            <button 
              onClick={() => navigate('/signup')}
              className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white px-8 py-4 rounded-full text-base font-semibold border border-white/10 transition-all hover:scale-105 w-full sm:w-auto"
            >
              View Pricing Plans
            </button>
          </div>

          <p className="text-gray-500 text-sm mt-8">
            Trusted by over 150,000 traders worldwide
          </p>
        </div>
      </div>
    </section>
  );
};

export default CTASection;

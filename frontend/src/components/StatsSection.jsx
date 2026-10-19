import React from 'react';
import { platformStats } from '../data/mock';

const StatsSection = () => {
  return (
    <section className="relative py-16">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Trusted by Traders Worldwide
          </h2>
          <p className="text-gray-400">
            Join thousands of successful traders who rely on our AI-powered platform daily
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {platformStats.map((stat, index) => (
            <div
              key={index}
              className="bg-[#12121a]/60 backdrop-blur-xl rounded-2xl border border-white/5 p-6 text-center hover:border-white/10 transition-all hover:scale-105"
            >
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">{stat.value}</div>
              <div className="text-gray-500 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;

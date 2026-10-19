import React from 'react';
import { Shield } from 'lucide-react';
import { partners } from '../data/mock';

const PartnersSection = () => {
  return (
    <section className="relative py-16">
      <div className="max-w-7xl mx-auto px-6">
        {/* Security badge */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <Shield className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-400 font-medium">Bank-Level Security</span>
          </div>
          <p className="text-gray-400 max-w-lg mx-auto">
            Your funds and data are protected by enterprise-grade encryption and multi-layer security protocols
          </p>
        </div>

        {/* Partners */}
        <div className="text-center">
          <span className="text-gray-500 text-sm uppercase tracking-wider mb-8 block">Trusted Partners</span>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {partners.map((partner, index) => (
              <div
                key={index}
                className="text-gray-500 hover:text-gray-300 transition-colors text-xl font-semibold opacity-60 hover:opacity-100"
              >
                {partner.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PartnersSection;

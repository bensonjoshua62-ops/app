import React, { useState } from 'react';
import { Play } from 'lucide-react';
import DemoModal from './DemoModal';

const DemoSection = () => {
  const [showDemoModal, setShowDemoModal] = useState(false);

  return (
    <section className="relative py-20">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] pointer-events-none">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-400/10 via-green-400/10 to-cyan-400/5 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6">
        <div className="bg-[#12121a]/60 backdrop-blur-2xl rounded-3xl border border-white/5 p-12 text-center">
          {/* Play button */}
          <button 
            onClick={() => setShowDemoModal(true)}
            className="w-24 h-24 rounded-full bg-violet-600 hover:bg-violet-700 flex items-center justify-center mx-auto mb-8 transition-all hover:scale-110 shadow-lg shadow-violet-500/25 group"
          >
            <Play className="w-10 h-10 text-white fill-white ml-1 group-hover:scale-110 transition-transform" />
          </button>

          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            See IGRIS AI in Action
          </h2>
          <p className="text-gray-400 text-lg mb-8 max-w-lg mx-auto">
            Watch how our AI analyzes markets and executes trades in real-time. No signup required.
          </p>

          <button 
            onClick={() => setShowDemoModal(true)}
            className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all hover:scale-105"
          >
            <Play className="w-5 h-5" />
            Watch 2-Minute Demo
          </button>
        </div>
      </div>

      {/* Demo Modal */}
      <DemoModal isOpen={showDemoModal} onClose={() => setShowDemoModal(false)} />
    </section>
  );
};

export default DemoSection;

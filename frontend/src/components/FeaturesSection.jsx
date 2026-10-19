import React from 'react';
import { ArrowRight, Brain, LineChart, MessageSquare, Link2, Shield, Users, Server, Mic } from 'lucide-react';
import { features } from '../data/mock';

const iconMap = {
  'ai-analysis': Brain,
  'chart': LineChart,
  'prompt': MessageSquare,
  'mt5': Link2,
  'risk': Shield,
  'copy': Users,
  'vps': Server,
  'jessica': Mic
};

const FeatureCard = ({ feature }) => {
  const Icon = iconMap[feature.image] || Brain;
  
  return (
    <div className={`group relative bg-[#12121a]/60 backdrop-blur-xl rounded-2xl border border-white/5 p-6 hover:border-white/10 transition-all hover:scale-[1.02] ${feature.large ? 'md:col-span-2' : ''}`}>
      {/* Badge */}
      {feature.badge && (
        <span className={`absolute top-4 right-4 px-2.5 py-1 rounded-full text-xs font-semibold ${
          feature.badge === 'New' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' :
          'bg-violet-500/20 text-violet-400 border border-violet-500/20'
        }`}>
          {feature.badge}
        </span>
      )}

      {/* Icon */}
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        <Icon className="w-6 h-6 text-orange-400" />
      </div>

      <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
      <p className="text-gray-400 text-sm mb-4 leading-relaxed">{feature.description}</p>

      {/* Highlights */}
      {feature.highlights.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {feature.highlights.map((highlight, index) => (
            <span
              key={index}
              className="px-3 py-1 rounded-full bg-white/5 text-gray-300 text-xs border border-white/5"
            >
              {highlight}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const FeaturesSection = () => {
  return (
    <section id="features" className="relative py-24">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-white">Everything You Need to</span>
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent">
              Trade Smarter
            </span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Industry-leading AI combined with professional trading tools. Built for traders, by traders.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <FeatureCard key={feature.id} feature={feature} />
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-gray-500 text-sm mb-4">← Swipe to explore features →</p>
          <p className="text-gray-400 mb-4">
            Ready to master these features? Start with step-by-step tutorials
          </p>
          <a
            href="https://jcelerita.com/learn"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 font-medium transition-colors group"
          >
            Start Learning
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;

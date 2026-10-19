import React from 'react';
import { tradingData } from '../data/mock';
import { TrendingUp, Activity, BarChart3 } from 'lucide-react';

const TradingInterface = () => {
  return (
    <section id="dashboard" className="relative py-24">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-4">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm mb-4">
            Live Trading Interface
          </span>
        </div>
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Professional Trading Experience
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Preview the in-app experience. Analysis and signals are available once you sign in; some features require a premium plan.
          </p>
        </div>

        {/* Trading cards grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main trading card */}
          <div className="lg:col-span-2 bg-[#12121a]/60 backdrop-blur-xl rounded-2xl border border-white/5 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-xl font-semibold text-white">{tradingData.symbol}</h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    AI Active
                  </span>
                </div>
                <span className="text-gray-500 text-sm">24h High Volume</span>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-white">{tradingData.price}</div>
                <span className="text-emerald-400 text-sm">{tradingData.change} ({tradingData.changePercent})</span>
              </div>
            </div>

            {/* Chart placeholder */}
            <div className="h-48 bg-gradient-to-b from-violet-500/5 to-transparent rounded-xl mb-6 flex items-center justify-center border border-white/5">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-violet-400/50 mx-auto mb-2" />
                <span className="text-gray-500 text-sm">Live Chart Preview</span>
              </div>
            </div>

            {/* Buy/Sell buttons */}
            <div className="grid grid-cols-2 gap-4">
              <button className="py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-all hover:scale-[1.02]">
                Buy
              </button>
              <button className="py-4 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-all hover:scale-[1.02]">
                Sell
              </button>
            </div>
          </div>

          {/* Side panels */}
          <div className="space-y-6">
            {/* Market Analysis */}
            <div className="bg-[#12121a]/60 backdrop-blur-xl rounded-2xl border border-white/5 p-5">
              <h4 className="text-gray-400 text-sm font-medium mb-4">Market Analysis</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm">Trend</span>
                  <span className="text-emerald-400 font-medium">{tradingData.trend}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm">RSI</span>
                  <span className="text-white font-medium">{tradingData.rsi}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm">Volume</span>
                  <span className="text-white font-medium">{tradingData.volume}</span>
                </div>
              </div>
            </div>

            {/* AI Signals */}
            <div className="bg-[#12121a]/60 backdrop-blur-xl rounded-2xl border border-white/5 p-5">
              <h4 className="text-gray-400 text-sm font-medium mb-4">AI Signals (In-App)</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm">Signal</span>
                  <span className="text-emerald-400 font-bold">{tradingData.signal}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm">Confidence</span>
                  <span className="text-white font-medium">{tradingData.confidence}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm">R/R</span>
                  <span className="text-white font-medium">{tradingData.riskReward}</span>
                </div>
              </div>
            </div>

            {/* Risk Management */}
            <div className="bg-[#12121a]/60 backdrop-blur-xl rounded-2xl border border-white/5 p-5">
              <h4 className="text-gray-400 text-sm font-medium mb-4">Risk Management</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm">Position</span>
                  <span className="text-white font-medium">{tradingData.position}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm">Max Loss</span>
                  <span className="text-red-400 font-medium">{tradingData.maxLoss}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm">Potential</span>
                  <span className="text-emerald-400 font-medium">{tradingData.potential}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-[#12121a]/60 backdrop-blur-xl rounded-xl border border-white/5 p-4">
            <span className="text-gray-500 text-xs">Volume</span>
            <div className="text-white font-semibold">{tradingData.volume}</div>
          </div>
          <div className="bg-[#12121a]/60 backdrop-blur-xl rounded-xl border border-white/5 p-4">
            <span className="text-gray-500 text-xs">Sample Metric</span>
            <div className="text-violet-400 font-semibold">Demo</div>
          </div>
          <div className="bg-[#12121a]/60 backdrop-blur-xl rounded-xl border border-white/5 p-4">
            <span className="text-gray-500 text-xs">24h High</span>
            <div className="text-white font-semibold">{tradingData.high24h}</div>
          </div>
          <div className="bg-[#12121a]/60 backdrop-blur-xl rounded-xl border border-white/5 p-4">
            <span className="text-gray-500 text-xs">24h Low</span>
            <div className="text-white font-semibold">{tradingData.low24h}</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TradingInterface;

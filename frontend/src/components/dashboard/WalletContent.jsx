import React from 'react';
import { Wallet, ArrowUpRight, ArrowDownRight, Clock, AlertTriangle } from 'lucide-react';

const WalletContent = ({ isDark }) => {
  return (
    <div className="space-y-6">
      <div className={`rounded-2xl border p-6 ${isDark ? 'bg-[#12121a]/60 border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Wallet Balance</h2>
          <Wallet className="w-6 h-6 text-[#FFA500]" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
            <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Available Balance</p>
            <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>$0.00</p>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
            <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Pending</p>
            <p className={`text-2xl font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>$0.00</p>
          </div>
          <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
            <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Total Earned</p>
            <p className={`text-2xl font-bold text-emerald-400`}>$0.00</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button className={`flex items-center justify-center gap-3 p-4 rounded-xl border transition-colors ${isDark ? 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-600'}`}>
          <ArrowDownRight className="w-5 h-5" />
          <span className="font-semibold">Deposit Funds</span>
        </button>
        <button className={`flex items-center justify-center gap-3 p-4 rounded-xl border transition-colors ${isDark ? 'bg-violet-500/10 border-violet-500/20 hover:bg-violet-500/20 text-violet-400' : 'bg-violet-50 border-violet-200 hover:bg-violet-100 text-violet-600'}`}>
          <ArrowUpRight className="w-5 h-5" />
          <span className="font-semibold">Withdraw Funds</span>
        </button>
      </div>

      <div className={`rounded-2xl border p-6 ${isDark ? 'bg-[#12121a]/60 border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Transaction History</h2>
          <Clock className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
        </div>
        
        <div className="text-center py-12">
          <AlertTriangle className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-amber-500/50' : 'text-amber-400'}`} />
          <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Coming Soon</h3>
          <p className={`max-w-md mx-auto ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Wallet functionality is currently under development. You'll be able to deposit, withdraw, and track your trading funds here.
          </p>
        </div>
      </div>
    </div>
  );
};

export default WalletContent;

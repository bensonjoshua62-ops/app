import React from 'react';
import { TrendingUp, TrendingDown, RefreshCw, History, Loader2 } from 'lucide-react';
import LotSizeCard from './LotSizeCard';

const MT5Content = ({
  isDark,
  mt5Balance,
  mt5Accounts,
  fetchMT5Accounts,
  userLotSize,
  setUserLotSize,
  saveUserLotSize,
  lotSizeSaving,
  tradeHistory,
  tradeHistoryLoading,
  fetchTradeHistory,
  setShowMT5Connect
}) => {
  return (
    <div className="space-y-6 relative">
      {/* Background GIF */}
      <div 
        className="absolute inset-0 -z-10 opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'url(https://customer-assets.emergentagent.com/job_forex-buddy-10/artifacts/l0yeeamz_IMG_4126.gif)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'blur(1px)'
        }}
      />
      
      {/* MT5 Balance Card */}
      <div className={`rounded-2xl border p-6 backdrop-blur-sm ${isDark ? 'bg-gradient-to-br from-[#FFA500]/20 to-amber-600/10 border-[#FFA500]/20' : 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200'}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDark ? 'bg-[#FFA500]/20' : 'bg-orange-100'}`}>
              <TrendingUp className="w-6 h-6 text-[#FFA500]" />
            </div>
            <div>
              <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                MT5 {(mt5Balance.connected || mt5Accounts.length > 0) && <span className="text-emerald-400 text-sm font-normal">(Connected)</span>}
              </h3>
              {(mt5Balance.connected || mt5Accounts.length > 0) ? (
                <p className={`text-sm ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  ✓ Account linked securely
                </p>
              ) : (
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Not connected
                </p>
              )}
            </div>
          </div>
          {(mt5Balance.connected || mt5Accounts.length > 0) && (
            <button
              onClick={() => fetchMT5Accounts()}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white' : 'bg-white hover:bg-gray-100 text-gray-500 hover:text-gray-700'}`}
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          )}
        </div>
        
        {(mt5Balance.connected || mt5Accounts.length > 0) ? (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className={`text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Balance</p>
              <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {mt5Balance.currency} {mt5Balance.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className={`text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Equity</p>
              <p className="text-2xl font-bold text-emerald-400">
                {mt5Balance.currency} {mt5Balance.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className={`mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Connect your MT5 account to see real-time balance</p>
            <button
              onClick={() => setShowMT5Connect(true)}
              className="px-4 py-2 rounded-lg bg-[#FFA500] hover:bg-[#FF8C00] text-white font-medium transition-colors"
            >
              Connect MT5 Account
            </button>
          </div>
        )}
      </div>

      {/* Trade History Section */}
      {(mt5Balance.connected || mt5Accounts.length > 0) && (
        <>
          {/* Lot Size Settings */}
          <LotSizeCard 
            userLotSize={userLotSize}
            setUserLotSize={setUserLotSize}
            saveUserLotSize={saveUserLotSize}
            lotSizeSaving={lotSizeSaving}
            isDark={isDark}
          />

          {/* Trade History */}
          <div className={`rounded-2xl border p-6 backdrop-blur-sm ${isDark ? 'bg-[#12121a]/60 border-white/5' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-violet-500/20' : 'bg-violet-100'}`}>
                  <History className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Trade History</h3>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Your recent trading activity</p>
                </div>
              </div>
              <button
                onClick={() => mt5Accounts.length > 0 && fetchTradeHistory(mt5Accounts[0].metaapi_account_id)}
                disabled={tradeHistoryLoading}
                className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}
              >
                <RefreshCw className={`w-5 h-5 ${tradeHistoryLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {tradeHistoryLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
              </div>
            ) : tradeHistory.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tradeHistory.map((trade, index) => (
                  <div 
                    key={trade.id || index}
                    className={`rounded-xl border p-4 transition-colors ${isDark ? 'bg-[#0F0F0F] border-white/5 hover:border-white/10' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          trade.type?.toLowerCase().includes('buy') 
                            ? 'bg-emerald-500/20' 
                            : 'bg-red-500/20'
                        }`}>
                          {trade.type?.toLowerCase().includes('buy') ? (
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                        <div>
                          <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{trade.symbol}</p>
                          <p className={`text-xs font-medium ${
                            trade.type?.toLowerCase().includes('buy') 
                              ? 'text-emerald-400' 
                              : 'text-red-400'
                          }`}>
                            {trade.type?.toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${(trade.profit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {(trade.profit || 0) >= 0 ? '+' : ''}${(trade.profit || 0).toFixed(2)}
                        </p>
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{trade.volume} lots</p>
                      </div>
                    </div>
                    <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {trade.open_time ? new Date(trade.open_time).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <History className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>No trade history yet</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MT5Content;

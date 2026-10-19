import React from 'react';
import {
  TrendingUp, Activity, Brain, Shield, Clock, ChevronRight,
  ArrowUpRight, ArrowDownRight, Loader2
} from 'lucide-react';

const OverviewContent = ({
  isDark,
  mt5Balance,
  setActiveTab,
  openPositions,
  positionsLoading,
  aiSignals,
  globalRiskScore,
  maxPositions,
  trades
}) => {
  // Recent activity from trades
  const recentActivity = trades.slice(0, 3).map(trade => ({
    type: trade.type?.toLowerCase().includes('buy') ? 'buy' : 'sell',
    pair: trade.symbol || 'N/A',
    amount: `${trade.volume || 0} lots`,
    price: `$${trade.open_price?.toFixed(2) || '0.00'}`,
    time: trade.open_time ? new Date(trade.open_time).toLocaleString() : 'N/A',
    status: 'completed'
  }));

  return (
    <>
      {/* MT5 Connection Banner */}
      {!mt5Balance.connected && (
        <div className="mb-6 bg-gradient-to-r from-[#FFA500]/20 to-amber-600/20 rounded-2xl border border-[#FFA500]/30 p-4 lg:p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#FFA500]/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-[#FFA500]" />
              </div>
              <div>
                <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Connect Your MT5 Account</h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Link your MetaTrader 5 account to see real-time balance and trades</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('mt5')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FFA500] hover:bg-[#FF8C00] text-white font-medium transition-colors"
            >
              <TrendingUp className="w-4 h-4" />
              Connect MT5
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
        {/* MT5 Balance Card */}
        <div className="sm:col-span-2 bg-gradient-to-br from-[#FFA500]/20 to-amber-600/10 rounded-2xl border border-[#FFA500]/20 p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <span className={`text-sm lg:text-base ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>MT5 Balance</span>
            <TrendingUp className="w-5 h-5 text-[#FFA500]" />
          </div>
          {mt5Balance.connected ? (
            <>
              <div className={`text-2xl lg:text-4xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {mt5Balance.currency} {mt5Balance.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <Activity className="w-4 h-4" />
                <span className="font-medium text-sm lg:text-base">Equity: {mt5Balance.currency} {mt5Balance.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </>
          ) : (
            <>
              <div className={`text-2xl lg:text-4xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>$0.00</div>
              <div className={`flex items-center gap-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                <Activity className="w-4 h-4" />
                <span className="font-medium text-sm lg:text-base">Connect MT5 to view balance</span>
              </div>
            </>
          )}
        </div>

        <div className={`rounded-2xl border p-4 lg:p-6 ${isDark ? 'bg-[#12121a]/60 border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-4">
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>IGRIS Status</span>
            <Brain className={`w-5 h-5 ${mt5Balance.connected ? 'text-emerald-400' : 'text-gray-500'}`} />
          </div>
          <div className={`text-xl lg:text-2xl font-bold mb-1 ${mt5Balance.connected ? 'text-emerald-400' : 'text-gray-500'}`}>
            {mt5Balance.connected ? 'Active' : 'Inactive'}
          </div>
          <p className={`text-xs lg:text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            {mt5Balance.connected ? 'Analyzing 150+ pairs' : 'Connect MT5 to activate'}
          </p>
        </div>

        <div className={`rounded-2xl border p-4 lg:p-6 ${isDark ? 'bg-[#12121a]/60 border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-4">
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Risk Management</span>
            <Shield className={`w-5 h-5 ${globalRiskScore === 'Low' ? 'text-emerald-400' : globalRiskScore === 'High' ? 'text-red-400' : 'text-amber-400'}`} />
          </div>
          <div className={`text-xl lg:text-2xl font-bold mb-1 ${globalRiskScore === 'Low' ? 'text-emerald-400' : globalRiskScore === 'High' ? 'text-red-400' : 'text-amber-400'}`}>
            {globalRiskScore}
          </div>
          <p className={`text-xs lg:text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            Max {maxPositions} positions
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Open Positions */}
        <div className={`lg:col-span-2 rounded-2xl border p-4 lg:p-6 ${isDark ? 'bg-[#12121a]/60 border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-4 lg:mb-6">
            <h2 className={`text-base lg:text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Open Positions</h2>
            {mt5Balance.connected && openPositions.length > 0 && (
              <button className="text-[#FFA500] text-sm hover:text-[#FF8C00] flex items-center gap-1">
                View all <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
          {!mt5Balance.connected ? (
            <div className="text-center py-8">
              <TrendingUp className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>No positions to display</p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Connect your MT5 account to see open positions</p>
            </div>
          ) : positionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-[#FFA500] animate-spin" />
            </div>
          ) : openPositions.length === 0 ? (
            <div className="text-center py-8">
              <Activity className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>No open positions</p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Your open trades will appear here</p>
            </div>
          ) : (
            <div className="space-y-3 lg:space-y-4">
              {openPositions.map((position, index) => (
                <div key={index} className={`flex items-center justify-between p-3 lg:p-4 rounded-xl transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-50 hover:bg-gray-100'}`}>
                  <div className="flex items-center gap-3 lg:gap-4">
                    <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center text-white font-bold text-xs lg:text-sm ${position.type?.toLowerCase().includes('buy') ? 'bg-gradient-to-br from-emerald-500 to-green-500' : 'bg-gradient-to-br from-red-500 to-rose-500'}`}>
                      {position.symbol?.charAt(0) || 'P'}
                    </div>
                    <div>
                      <p className={`font-medium text-sm lg:text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>{position.symbol || 'N/A'}</p>
                      <p className={`text-xs lg:text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{position.volume || 0} lots</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium text-sm lg:text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>${position.current_price?.toFixed(2) || '0.00'}</p>
                    <p className={`text-xs lg:text-sm flex items-center justify-end gap-1 ${(position.profit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {(position.profit || 0) >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {(position.profit || 0) >= 0 ? '+' : ''}${position.profit?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Signals */}
        <div className={`rounded-2xl border p-4 lg:p-6 ${isDark ? 'bg-[#12121a]/60 border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-4 lg:mb-6">
            <h2 className={`text-base lg:text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>AI Signals</h2>
            {aiSignals.length > 0 ? (
              <span className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">Live</span>
            ) : (
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>Waiting</span>
            )}
          </div>
          {aiSignals.length === 0 ? (
            <div className="text-center py-8">
              <Brain className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>No signals yet</p>
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>AI signals from MT5 EA will appear here</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 lg:space-y-4">
                {aiSignals.slice(0, 3).map((signal, index) => (
                  <div key={index} className={`p-3 lg:p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{signal.pair}</span>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${signal.signal === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {signal.signal}
                      </span>
                    </div>
                    <div className={`w-full rounded-full h-1.5 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
                      <div
                        className={`h-full rounded-full ${signal.confidence >= 80 ? 'bg-emerald-500' : signal.confidence >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${signal.confidence}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs mt-2">
                      <span className={isDark ? 'text-gray-500' : 'text-gray-500'}>Confidence: {signal.confidence}%</span>
                      <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>R/R {signal.risk_reward}</span>
                    </div>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => setActiveTab('signals')}
                className="w-full mt-4 py-2 rounded-lg bg-violet-500/10 text-violet-400 text-sm font-medium hover:bg-violet-500/20 transition-colors"
              >
                View All Signals
              </button>
            </>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className={`mt-4 lg:mt-6 rounded-2xl border p-4 lg:p-6 ${isDark ? 'bg-[#12121a]/60 border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <h2 className={`text-base lg:text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Recent Activity</h2>
          <Clock className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
        </div>
        <div className="space-y-3 lg:space-y-4">
          {recentActivity.length > 0 ? recentActivity.map((activity, index) => (
            <div key={index} className={`flex items-center justify-between p-3 lg:p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-3 lg:gap-4">
                <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center ${activity.type === 'buy' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                  {activity.type === 'buy' ? <ArrowUpRight className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-400" /> : <ArrowDownRight className="w-4 h-4 lg:w-5 lg:h-5 text-red-400" />}
                </div>
                <div>
                  <p className={`font-medium text-sm lg:text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>{activity.type === 'buy' ? 'Bought' : 'Sold'} {activity.pair}</p>
                  <p className={`text-xs lg:text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{activity.amount} @ {activity.price}</p>
                </div>
              </div>
              <span className={`text-xs lg:text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{activity.time}</span>
            </div>
          )) : (
            <div className="text-center py-8">
              <Clock className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>No recent activity</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default OverviewContent;

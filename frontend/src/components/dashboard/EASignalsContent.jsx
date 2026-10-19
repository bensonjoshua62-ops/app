import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, RefreshCw, TrendingUp, TrendingDown, Check, 
  Trash2, Loader2, Mail 
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { BACKEND_URL } from '../../utils/config';

const EASignalsContent = ({ 
  user,
  eaSignals, 
  eaSignalsLoading, 
  deletingSignalId,
  handleEASignalsRefresh,
  deleteEASignal,
  globalRiskScore = 'Medium'
}) => {
  const { isDark } = useTheme();
  const [sendingEmailId, setSendingEmailId] = useState(null);
  const [emailSentId, setEmailSentId] = useState(null);
  
  // Auto-click tracking refs
  const emailedSignalsRef = useRef(new Set());
  const prevSignalsRef = useRef([]);
  const initialLoadRef = useRef(true);

  // AUTO-CLICK: Automatically send email when new signal detected
  useEffect(() => {
    if (!user?.is_admin || !eaSignals || eaSignals.length === 0) return;
    
    // Skip auto-click on initial page load
    if (initialLoadRef.current) {
      eaSignals.forEach(s => emailedSignalsRef.current.add(s.id));
      prevSignalsRef.current = [...eaSignals];
      initialLoadRef.current = false;
      console.log('[AUTO-CLICK] Initial load - marked', eaSignals.length, 'signals as seen');
      return;
    }
    
    const prevIds = new Set(prevSignalsRef.current.map(s => s.id));
    
    eaSignals.forEach(signal => {
      if (signal.id && !prevIds.has(signal.id) && !emailedSignalsRef.current.has(signal.id)) {
        console.log('[AUTO-CLICK] New signal detected:', signal.symbol);
        emailedSignalsRef.current.add(signal.id);
        autoSendEmail(signal.id);
      }
    });
    
    prevSignalsRef.current = [...eaSignals];
  }, [eaSignals, user?.is_admin]);

  // AUTO-CLICK: Silent email send (no alerts)
  const autoSendEmail = (signalId) => {
    const token = localStorage.getItem('token');
    if (!token || !BACKEND_URL) return;

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BACKEND_URL}/api/signals/${signalId}/send-email`, true);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = 60000;

    xhr.onload = function() {
      if (xhr.status === 200) {
        try {
          const data = JSON.parse(xhr.responseText);
          console.log('[AUTO-CLICK] ✅ Email sent:', data.emails_sent, 'users, Failed:', data.emails_failed);
        } catch (e) {
          console.log('[AUTO-CLICK] ✅ Email sent');
        }
      } else {
        console.log('[AUTO-CLICK] ❌ Failed:', xhr.status);
      }
    };

    xhr.onerror = function() {
      console.log('[AUTO-CLICK] ❌ Network error');
    };

    xhr.send();
  };

  // Manual send signal to email (with alerts)
  const sendSignalEmail = async (signalId) => {
    try {
      setSendingEmailId(signalId);
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('❌ Not logged in. Please refresh and try again.');
        return;
      }
      
      if (!BACKEND_URL) {
        alert('❌ Backend URL not configured.');
        return;
      }
      
      const url = `${BACKEND_URL}/api/signals/${signalId}/send-email`;
      
      // Use XMLHttpRequest to avoid fetch body stream issues
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url, true);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('Content-Type', 'application/json');
      
      xhr.onload = function() {
        setSendingEmailId(null);
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status === 200 && data.success) {
            setEmailSentId(signalId);
            alert(`✅ Email sent!\n\nSent: ${data.emails_sent} users\nFailed: ${data.emails_failed} users`);
            setTimeout(() => setEmailSentId(null), 3000);
          } else {
            alert(`❌ Failed: ${data.detail || data.message || 'Unknown error'}`);
          }
        } catch (e) {
          alert(`❌ Error parsing response: ${e.message}`);
        }
      };
      
      xhr.onerror = function() {
        setSendingEmailId(null);
        alert('❌ Network error. Please check your connection and try again.');
      };
      
      xhr.ontimeout = function() {
        setSendingEmailId(null);
        alert('❌ Request timed out. Please try again.');
      };
      
      xhr.timeout = 30000; // 30 second timeout
      xhr.send();
      
    } catch (error) {
      console.error('Email send error:', error);
      alert(`❌ Error: ${error.message}`);
      setSendingEmailId(null);
    }
  };
  
  // Calculate confidence based on risk score
  // Low Risk = High Confidence, High Risk = Low Confidence
  const getConfidence = () => {
    switch (globalRiskScore) {
      case 'Low':
        return { value: 85, label: 'High', color: 'text-emerald-400', bg: 'bg-emerald-500/20' };
      case 'High':
        return { value: 45, label: 'Low', color: 'text-red-400', bg: 'bg-red-500/20' };
      default: // Medium
        return { value: 65, label: 'Medium', color: 'text-amber-400', bg: 'bg-amber-500/20' };
    }
  };
  
  const confidence = getConfidence();

  return (
    <div className="space-y-6">
      <div className={`bg-gradient-to-r from-[#FFA500]/20 to-emerald-600/20 rounded-2xl border border-[#FFA500]/20 p-6`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#FFA500]/20 flex items-center justify-center">
              <Activity className="w-6 h-6 text-[#FFA500]" />
            </div>
            <div>
              <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>EA Signals Live Feed</h2>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Real-time signals from MT5 Expert Advisor • Auto-refreshes every 10s</p>
            </div>
          </div>
          <button
            onClick={handleEASignalsRefresh}
            disabled={eaSignalsLoading}
            className="btn-glass btn-glass-secondary btn-glass-sm flex items-center gap-2 whitespace-nowrap"
          >
            <RefreshCw className={`w-4 h-4 ${eaSignalsLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {eaSignalsLoading && eaSignals.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-[#FFA500] animate-spin" />
        </div>
      ) : eaSignals.length === 0 ? (
        <div className={`rounded-2xl border p-8 text-center ${isDark ? 'bg-[#12121a]/60 border-white/5' : 'bg-white border-gray-200'}`}>
          <Activity className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
          <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>No Signals Yet</h3>
          <p className={`max-w-md mx-auto mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Signals from your MT5 Expert Advisor will appear here automatically when trades are executed.
          </p>
          {/* Only show webhook info for admin users */}
          {user?.is_admin && (
            <div className={`mt-4 p-4 rounded-xl text-left ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
              <p className={`text-sm font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Webhook URL:</p>
              <code className={`text-xs break-all ${isDark ? 'text-[#FFA500]' : 'text-orange-600'}`}>
                https://mt5-connect-1.emergent.host/api/signals/webhook
              </code>
              <p className={`text-sm font-medium mt-3 mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>API Key:</p>
              <code className={`text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                IGRIS_MVP_SECRET_KEY_2024
              </code>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {eaSignals.map((signal, index) => (
            <SignalCard 
              key={signal.id || index}
              signal={signal}
              isDark={isDark}
              user={user}
              deletingSignalId={deletingSignalId}
              deleteEASignal={deleteEASignal}
              confidence={confidence}
              sendSignalEmail={sendSignalEmail}
              sendingEmailId={sendingEmailId}
              emailSentId={emailSentId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const SignalCard = ({ signal, isDark, user, deletingSignalId, deleteEASignal, confidence, sendSignalEmail, sendingEmailId, emailSentId }) => {
  const isSending = sendingEmailId === signal.id;
  const wasSent = emailSentId === signal.id;
  
  return (
    <div className={`rounded-2xl border p-5 ${
      signal.status === 'CLOSED' ? (isDark ? 'bg-violet-900/20 border-violet-500/30' : 'bg-violet-50 border-violet-200') :
      signal.status === 'UPDATED' ? (isDark ? 'bg-amber-900/20 border-amber-500/30' : 'bg-amber-50 border-amber-200') :
      (isDark ? 'bg-[#12121a]/60 border-white/5' : 'bg-white border-gray-200')
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            signal.status === 'CLOSED' ? 'bg-violet-500/20' :
            signal.type === 'BUY' || signal.type === 'LONG' ? 'bg-emerald-500/20' : 
            signal.type === 'CLOSE' ? 'bg-violet-500/20' : 'bg-red-500/20'
          }`}>
            {signal.status === 'CLOSED' || signal.type === 'CLOSE' ? (
              <Check className="w-5 h-5 text-violet-400" />
            ) : signal.type === 'BUY' || signal.type === 'LONG' ? (
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-400" />
            )}
          </div>
          <div>
            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{signal.symbol}</h3>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${
                signal.type === 'BUY' || signal.type === 'LONG' ? 'text-emerald-400' : 
                signal.type === 'CLOSE' ? 'text-violet-400' : 'text-red-400'
              }`}>{signal.type}</span>
              {signal.status && signal.status !== 'NEW' && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  signal.status === 'CLOSED' ? 'bg-violet-500/20 text-violet-400' :
                  signal.status === 'UPDATED' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {signal.status}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Confidence Badge */}
          <div className={`px-2 py-1 rounded-lg ${confidence.bg} flex items-center gap-1`}>
            <span className={`text-xs font-bold ${confidence.color}`}>{confidence.value}%</span>
          </div>
          <span className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
            {signal.bot || 'EA'}
          </span>
          {user?.is_admin && (
            <>
              {/* Send Email Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  sendSignalEmail(signal.id);
                }}
                disabled={isSending}
                className={`p-1.5 rounded-lg transition-colors z-10 ${
                  wasSent 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : isSending 
                    ? 'bg-blue-500/20 text-blue-400 cursor-wait' 
                    : 'hover:bg-blue-500/20 text-gray-400 hover:text-blue-400'
                }`}
                title={wasSent ? "Email sent!" : "Send to all users via email"}
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : wasSent ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
              </button>
              {/* Delete Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  deleteEASignal(signal.id);
                }}
                disabled={deletingSignalId === signal.id}
                className={`p-1.5 rounded-lg transition-colors z-10 ${
                  deletingSignalId === signal.id 
                    ? 'bg-red-500/20 text-red-400 cursor-wait' 
                    : 'hover:bg-red-500/20 text-gray-400 hover:text-red-400'
                }`}
                title="Delete signal"
              >
                {deletingSignalId === signal.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </>
          )}
        </div>
      </div>
      
      {signal.message && (
        <p className={`text-sm mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{signal.message}</p>
      )}
      
      <div className="grid grid-cols-3 gap-3">
        <div className={`rounded-lg p-3 text-center ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
          <p className={`text-xs mb-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Entry</p>
          <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {signal.entry ? Number(signal.entry).toFixed(5) : 'N/A'}
          </p>
        </div>
        <div className="bg-emerald-500/10 rounded-lg p-3 text-center">
          <p className="text-emerald-400 text-xs mb-1">TP</p>
          <p className="text-emerald-400 font-semibold text-sm">
            {signal.tp ? Number(signal.tp).toFixed(5) : 'N/A'}
          </p>
        </div>
        <div className="bg-red-500/10 rounded-lg p-3 text-center">
          <p className="text-red-400 text-xs mb-1">SL</p>
          <p className="text-red-400 font-semibold text-sm">
            {signal.sl ? Number(signal.sl).toFixed(5) : 'N/A'}
          </p>
        </div>
      </div>
      
      {/* Additional MT5 Info Row */}
      <div className="grid grid-cols-2 gap-3 mt-3">
        {signal.volume > 0 && (
          <div className={`rounded-lg p-2 text-center ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Volume</p>
            <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {signal.volume} lots
            </p>
          </div>
        )}
        {signal.ticket > 0 && (
          <div className={`rounded-lg p-2 text-center ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Ticket</p>
            <p className={`font-semibold text-sm ${isDark ? 'text-[#FFA500]' : 'text-orange-600'}`}>
              #{signal.ticket}
            </p>
          </div>
        )}
      </div>
      
      {signal.profit !== 0 && signal.profit !== undefined && signal.profit !== null && (
        <div className={`mt-3 p-2 rounded-lg text-center ${(signal.profit || 0) >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
          <span className={`font-bold ${(signal.profit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            P/L: {(signal.profit || 0) >= 0 ? '+' : ''}${Number(signal.profit || 0).toFixed(2)}
          </span>
        </div>
      )}
      
      {signal.close_price && (
        <div className="mt-3 p-2 rounded-lg text-center bg-violet-500/10">
          <span className="text-violet-400 font-medium text-sm">
            Closed @ {Number(signal.close_price).toFixed(5)}
          </span>
        </div>
      )}
      
      {signal.time && (
        <p className={`text-xs mt-3 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
          {new Date(signal.time).toLocaleString()}
        </p>
      )}
    </div>
  );
};

export default EASignalsContent;

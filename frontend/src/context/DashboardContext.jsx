import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { BACKEND_URL } from '../utils/config';

const DashboardContext = createContext(null);

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

export const DashboardProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [trades, setTrades] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mt5Accounts, setMt5Accounts] = useState([]);
  const [mt5Balance, setMt5Balance] = useState({ balance: 0, equity: 0, currency: 'USD', connected: false });
  const [showMT5Connect, setShowMT5Connect] = useState(false);
  const [metaApiConfigured, setMetaApiConfigured] = useState(false);
  const [tradeHistory, setTradeHistory] = useState([]);
  const [tradeHistoryLoading, setTradeHistoryLoading] = useState(false);
  const [openPositions, setOpenPositions] = useState([]);
  const [aiSignals, setAiSignals] = useState([]);
  const [positionsLoading, setPositionsLoading] = useState(false);
  
  // Wallet state
  const [walletEnabled, setWalletEnabled] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletData, setWalletData] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);
  
  // Profile and Security state
  const [profilePicture, setProfilePicture] = useState(null);
  const [profileName, setProfileName] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [securitySettings, setSecuritySettings] = useState({
    two_factor_enabled: false,
    login_notifications: true,
    trade_notifications: true
  });
  
  // Admin state
  const [adminEmail, setAdminEmail] = useState('');
  const [globalRiskScore, setGlobalRiskScore] = useState('Medium');
  
  // EA Signals state
  const [eaSignals, setEaSignals] = useState([]);
  const [eaSignalsLoading, setEaSignalsLoading] = useState(false);
  const [deletingSignalId, setDeletingSignalId] = useState(null);
  const eaSignalsIntervalRef = useRef(null);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSessionId, setChatSessionId] = useState(null);
  const [chartImage, setChartImage] = useState(null);
  const chartImageRef = useRef(null);
  
  // Email templates state
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [paymentSettings, setPaymentSettings] = useState({});
  const [pendingSubscriptions, setPendingSubscriptions] = useState([]);

  // Fetch user data
  const fetchUser = useCallback(async () => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/notifications?limit=10`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  }, []);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/notifications/unread-count`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, []);

  // Fetch EA signals
  const fetchEASignals = useCallback(async () => {
    setEaSignalsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/signals`);
      if (response.ok) {
        const data = await response.json();
        setEaSignals(data.signals || []);
      }
    } catch (error) {
      console.error('Failed to fetch EA signals:', error);
    } finally {
      setEaSignalsLoading(false);
    }
  }, []);

  // Fetch global risk score
  const fetchGlobalRiskScore = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/subscriptions/risk-score`);
      if (response.ok) {
        const data = await response.json();
        setGlobalRiskScore(data.risk_score || 'Medium');
      }
    } catch (error) {
      console.error('Failed to fetch risk score:', error);
    }
  }, []);

  // Delete EA signal
  const deleteEASignal = useCallback(async (signalId) => {
    if (!window.confirm('Are you sure you want to delete this signal?')) return;
    
    setDeletingSignalId(signalId);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/signals/${signalId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        setEaSignals(prev => prev.filter(s => s.id !== signalId));
      } else {
        let errorMsg = 'Failed to delete signal';
        try {
          const text = await response.text();
          if (text) {
            const data = JSON.parse(text);
            errorMsg = data.detail || data.message || errorMsg;
          }
        } catch (parseError) {
          console.error('Error parsing response:', parseError);
        }
        alert(errorMsg);
      }
    } catch (error) {
      console.error('Failed to delete signal:', error);
      alert('Failed to delete signal: Network error');
    } finally {
      setDeletingSignalId(null);
    }
  }, []);

  // Handle EA signals refresh
  const handleEASignalsRefresh = useCallback(() => {
    if (eaSignalsIntervalRef.current) {
      clearInterval(eaSignalsIntervalRef.current);
    }
    fetchEASignals();
    eaSignalsIntervalRef.current = setInterval(fetchEASignals, 10000);
  }, [fetchEASignals]);

  // Load initial data
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchUnreadCount();
      fetchGlobalRiskScore();
    }
  }, [user, fetchNotifications, fetchUnreadCount, fetchGlobalRiskScore]);

  // EA Signals auto-refresh
  useEffect(() => {
    if (activeTab === 'easignals') {
      fetchEASignals();
      eaSignalsIntervalRef.current = setInterval(fetchEASignals, 10000);
    }
    return () => {
      if (eaSignalsIntervalRef.current) {
        clearInterval(eaSignalsIntervalRef.current);
      }
    };
  }, [activeTab, fetchEASignals]);

  const value = {
    BACKEND_URL,
    user, setUser,
    activeTab, setActiveTab,
    loading, setLoading,
    sidebarOpen, setSidebarOpen,
    trades, setTrades,
    allUsers, setAllUsers,
    notifications, setNotifications,
    unreadCount, setUnreadCount,
    showNotifications, setShowNotifications,
    mt5Accounts, setMt5Accounts,
    mt5Balance, setMt5Balance,
    showMT5Connect, setShowMT5Connect,
    metaApiConfigured, setMetaApiConfigured,
    tradeHistory, setTradeHistory,
    tradeHistoryLoading, setTradeHistoryLoading,
    openPositions, setOpenPositions,
    aiSignals, setAiSignals,
    positionsLoading, setPositionsLoading,
    walletEnabled, setWalletEnabled,
    walletConnected, setWalletConnected,
    walletData, setWalletData,
    walletLoading, setWalletLoading,
    profilePicture, setProfilePicture,
    profileName, setProfileName,
    profileSaving, setProfileSaving,
    securitySettings, setSecuritySettings,
    adminEmail, setAdminEmail,
    globalRiskScore, setGlobalRiskScore,
    eaSignals, setEaSignals,
    eaSignalsLoading, setEaSignalsLoading,
    deletingSignalId, setDeletingSignalId,
    chatMessages, setChatMessages,
    chatInput, setChatInput,
    chatLoading, setChatLoading,
    chatSessionId, setChatSessionId,
    chartImage, setChartImage,
    chartImageRef,
    emailTemplates, setEmailTemplates,
    subscriptionPlans, setSubscriptionPlans,
    paymentSettings, setPaymentSettings,
    pendingSubscriptions, setPendingSubscriptions,
    // Methods
    fetchUser,
    fetchNotifications,
    fetchUnreadCount,
    fetchEASignals,
    fetchGlobalRiskScore,
    deleteEASignal,
    handleEASignalsRefresh
  };

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};

export default DashboardContext;

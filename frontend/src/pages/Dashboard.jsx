import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Zap, LayoutDashboard, LineChart, Wallet, Settings, LogOut, Bell,
  TrendingUp, TrendingDown, Activity, BarChart3, ArrowUpRight,
  ArrowDownRight, RefreshCw, ChevronRight, Brain, Shield, Clock,
  Menu, X, User, Lock, Eye, EyeOff, Save, Download, Globe,
  History, Users, Trash2, Plus, MessageCircle, Send, Bot, Key, Check, Mail,
  Home, Server, Hash, Loader2, CheckCircle, XCircle, Image as ImageIcon,
  DollarSign, Camera, AlertTriangle, FileText, Play, Sun, Moon, UserX, UserCheck,
  Mic, MicOff, Square, AlertCircle
} from 'lucide-react';
import MobileNavBar from '../components/MobileNavBar';
import TradingViewWidget from '../components/TradingViewWidget';
import MT5ConnectForm from '../components/MT5ConnectForm';
import EASignalsContent from '../components/dashboard/EASignalsContent';
import PromptTradingContent from '../components/dashboard/PromptTradingContent';
import ChartContent from '../components/dashboard/ChartContent';
import MT5Content from '../components/dashboard/MT5Content';
import SettingsContent from '../components/dashboard/SettingsContent';
import LotSizeCard from '../components/dashboard/LotSizeCard';
import { useTheme } from '../context/ThemeContext';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_forex-buddy-10/artifacts/qq95ijqq_IMG_4116.webp";
import { BACKEND_URL } from '../utils/config';

const Dashboard = () => {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
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
  const [userLotSize, setUserLotSize] = useState(0.01);
  const [lotSizeSaving, setLotSizeSaving] = useState(false);
  
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
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const profilePicRef = useRef(null);

  // EA Signals state
  const [eaSignals, setEaSignals] = useState([]);
  const [eaSignalsLoading, setEaSignalsLoading] = useState(false);
  const [deletingSignalId, setDeletingSignalId] = useState(null);

  // Admin state
  const [adminEmail, setAdminEmail] = useState('');
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [cronStatus, setCronStatus] = useState({ running: false, jobs: [] });
  const [adminEmailSaving, setAdminEmailSaving] = useState(false);
  const [globalRiskScore, setGlobalRiskScore] = useState('Medium');
  const [maxPositions, setMaxPositions] = useState(10);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [userSubscription, setUserSubscription] = useState(null);
  const [paymentSettings, setPaymentSettings] = useState(null);
  const [pendingSubscriptions, setPendingSubscriptions] = useState([]);
  
  // Chat state for Prompt Trading
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSessionId, setChatSessionId] = useState(null);
  const [chartImage, setChartImage] = useState(null);
  const chartImageRef = useRef(null);
  
  // Support FAQ state
  const [openFaq, setOpenFaq] = useState(null);
  
  // Browser notification state
  const [browserNotifPermission, setBrowserNotifPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const lastNotificationCountRef = useRef(0);

  // Request browser notification permission
  const requestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') {
      alert('Your browser does not support notifications');
      return;
    }
    
    try {
      const permission = await Notification.requestPermission();
      setBrowserNotifPermission(permission);
      if (permission === 'granted') {
        // Show a test notification
        new Notification('IGRIS Notifications Enabled! 🔔', {
          body: 'You will now receive trading alerts and updates.',
          icon: LOGO_URL,
          badge: LOGO_URL
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  // Show browser notification
  const showBrowserNotification = (title, body, data = {}) => {
    if (browserNotifPermission !== 'granted') return;
    
    try {
      const notification = new Notification(title, {
        body: body,
        icon: LOGO_URL,
        badge: LOGO_URL,
        tag: data.id || 'igris-notification',
        requireInteraction: false,
        silent: false
      });
      
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      
      // Auto close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  };

  // Admin functions
  const saveAdminEmail = async () => {
    if (!adminEmail) return;
    setAdminEmailSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/admin/email?email=${encodeURIComponent(adminEmail)}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        alert('Admin email saved successfully!');
      } else {
        alert('Failed to save admin email');
      }
    } catch (error) {
      console.error('Failed to save admin email:', error);
      alert('Failed to save admin email');
    } finally {
      setAdminEmailSaving(false);
    }
  };

  const sendTestEmail = async () => {
    setTestEmailSending(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/admin/test-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          // Don't pass recipient - backend will use saved admin email
        })
      });
      const data = await response.json();
      if (data.success) {
        const recipientMsg = data.recipient ? ` to ${data.recipient}` : '';
        alert(`Test email sent${recipientMsg}!`);
      } else {
        alert(data.message || 'Failed to send test email. Check SMTP configuration in Email Templates.');
      }
    } catch (error) {
      console.error('Failed to send test email:', error);
      alert('Failed to send test email. Check your configuration.');
    } finally {
      setTestEmailSending(false);
    }
  };

  const fetchCronStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/admin/cron-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCronStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch cron status:', error);
    }
  };

  // Wallet functions
  const fetchWalletStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/wallet/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setWalletEnabled(data.enabled);
      }
    } catch (error) {
      console.error('Failed to fetch wallet status:', error);
    }
  };

  const fetchWalletData = async () => {
    setWalletLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/wallet`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setWalletConnected(data.connected);
        setWalletData(data.wallet);
      }
    } catch (error) {
      console.error('Failed to fetch wallet:', error);
    } finally {
      setWalletLoading(false);
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask or another Web3 wallet');
      return;
    }

    try {
      setWalletLoading(true);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts[0];
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/wallet/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          address: address,
          chain: chainId === '0x1' ? 'ethereum' : 'polygon',
          wallet_type: 'metamask'
        })
      });

      if (response.ok) {
        fetchWalletData();
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setWalletLoading(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${BACKEND_URL}/api/wallet/disconnect`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setWalletConnected(false);
      setWalletData(null);
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  };

  const toggleWalletFeature = async (enabled) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${BACKEND_URL}/api/wallet/admin/toggle?enabled=${enabled}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setWalletEnabled(enabled);
    } catch (error) {
      console.error('Failed to toggle wallet:', error);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      navigate('/signin');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setProfileName(parsedUser.name || '');
      setLoading(false);
      
      // Fetch all data in parallel (background, non-blocking)
      fetchTrades();
      fetchMT5Accounts();
      checkMetaApiStatus();
      fetchAiSignals();
      fetchWalletStatus();
      fetchUserProfile();
      fetchNotifications();
      
      if (parsedUser.is_admin) {
        fetchAllUsers();
      }
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/signin');
    }
  }, [navigate]);

  // Fetch admin email when emailsettings tab is accessed
  useEffect(() => {
    if (activeTab === 'emailsettings' && user?.is_admin) {
      fetchAdminEmail();
    }
  }, [activeTab, user?.is_admin]);

  // Fetch cron status when systemstatus tab is accessed
  useEffect(() => {
    if (activeTab === 'systemstatus' && user?.is_admin) {
      fetchCronStatus();
    }
  }, [activeTab, user?.is_admin]);

  // Fetch global risk score on load
  useEffect(() => {
    fetchGlobalRiskScore();
    fetchUserSubscription();
  }, []);

  // Request browser notification permission on first load (if not decided)
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      // Show a prompt after 3 seconds
      const timer = setTimeout(() => {
        // Don't auto-prompt, user will click the button
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Fetch admin data when admin tabs accessed
  useEffect(() => {
    if (user?.is_admin) {
      if (activeTab === 'emailtemplates') {
        fetchEmailTemplates();
      } else if (activeTab === 'planspayments') {
        fetchSubscriptionPlans();
        fetchPaymentSettings();
        fetchPendingSubscriptions();
      } else if (activeTab === 'risksettings') {
        fetchGlobalRiskScore();
      }
    }
  }, [activeTab, user?.is_admin]);

  // Fetch EA signals once when tab is accessed (no auto-refresh)
  useEffect(() => {
    if (activeTab === 'easignals') {
      fetchEASignals();
    }
  }, [activeTab]);

  // Fetch notifications once on mount (no polling - uses browser cache)
  useEffect(() => {
    if (!user) return;
    
    // Fetch once on mount
    fetchNotifications();
  }, [user]);

  // Auto-refresh MT5 balance and trade history every 30 seconds
  useEffect(() => {
    if (!user || mt5Accounts.length === 0) return;
    
    const accountId = mt5Accounts[0]?.metaapi_account_id;
    if (!accountId) return;

    // Set up interval for auto-refresh
    const refreshInterval = setInterval(() => {
      // Silently refresh balance and trade history in background
      fetchMT5Balance(accountId);
      fetchTradeHistory(accountId);
      fetchRecentActivity();
      fetchOpenPositions(accountId);
    }, 30000); // Every 30 seconds

    return () => clearInterval(refreshInterval);
  }, [user, mt5Accounts]);

  const fetchGlobalRiskScore = async () => {
    try {
      // Use public endpoint - no auth required for users to see risk management settings
      const response = await fetch(`${BACKEND_URL}/api/subscriptions/risk-score`);
      if (response.ok) {
        const data = await response.json();
        setGlobalRiskScore(data.risk_score || 'Medium');
        setMaxPositions(data.max_positions || 10);
      }
    } catch (error) {
      console.error('Failed to fetch risk management settings:', error);
    }
  };

  const fetchEASignals = async () => {
    setEaSignalsLoading(true);
    try {
      // Public endpoint - no auth required for live feed
      const response = await fetch(`${BACKEND_URL}/api/signals`);
      if (response.ok) {
        const data = await response.json();
        setEaSignals(data.signals || []);
      } else {
        console.error('Failed to fetch signals:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch EA signals:', error);
    } finally {
      setEaSignalsLoading(false);
    }
  };

  // Manual refresh handler for EA Signals button click
  const handleEASignalsRefresh = () => {
    fetchEASignals();
  };

  // Delete EA Signal (Admin only)
  const deleteEASignal = async (signalId) => {
    console.log('Delete button clicked for signal:', signalId);
    
    if (!window.confirm('Are you sure you want to delete this signal?')) {
      console.log('Delete cancelled by user');
      return;
    }
    
    setDeletingSignalId(signalId);
    
    try {
      const token = localStorage.getItem('token');
      console.log('Sending delete request for:', signalId);
      
      const response = await fetch(`${BACKEND_URL}/api/signals/${signalId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Delete response status:', response.status);
      
      if (response.ok) {
        // Remove from local state immediately
        setEaSignals(prev => prev.filter(s => s.id !== signalId));
        console.log('Signal deleted successfully');
      } else {
        // Try to read error response
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
        console.error('Delete failed:', errorMsg);
        alert(errorMsg);
      }
    } catch (error) {
      console.error('Failed to delete signal:', error);
      alert('Failed to delete signal: Network error');
    } finally {
      setDeletingSignalId(null);
    }
  };

  const fetchEmailTemplates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/email-templates/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setEmailTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Failed to fetch email templates:', error);
    }
  };

  const fetchSubscriptionPlans = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/subscriptions/admin/plans`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSubscriptionPlans(data.plans || []);
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    }
  };

  const fetchPaymentSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/subscriptions/admin/payment-settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPaymentSettings(data.settings || {});
      }
    } catch (error) {
      console.error('Failed to fetch payment settings:', error);
    }
  };

  const fetchPendingSubscriptions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/subscriptions/admin/subscriptions?status=pending_approval`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPendingSubscriptions(data.subscriptions || []);
      }
    } catch (error) {
      console.error('Failed to fetch pending subscriptions:', error);
    }
  };

  const fetchUserSubscription = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/subscriptions/my-subscription`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUserSubscription(data.subscription);
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    }
  };

  const fetchAdminEmail = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/admin/email`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.email) {
          setAdminEmail(data.email);
        }
      }
    } catch (error) {
      console.error('Failed to fetch admin email:', error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Set profile picture if exists
        if (data.profile?.profile_picture) {
          setProfilePicture(data.profile.profile_picture);
        }
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const checkMetaApiStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/metaapi/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMetaApiConfigured(data.configured);
      }
    } catch (error) {
      console.error('Failed to check MetaAPI status:', error);
    }
  };

  const fetchMT5Accounts = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch accounts and balance in parallel for faster loading
      const [accountsResponse, balanceResponse] = await Promise.all([
        fetch(`${BACKEND_URL}/api/metaapi/accounts`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${BACKEND_URL}/api/metaapi/user/balance`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      
      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        setMt5Accounts(accountsData.accounts || []);
        
        // If there's an account, fetch additional data
        if (accountsData.accounts && accountsData.accounts.length > 0) {
          const accountId = accountsData.accounts[0].metaapi_account_id;
          // Fetch these in parallel too
          Promise.all([
            fetchTradeHistory(accountId),
            fetchOpenPositions(accountId),
            fetchRecentActivity(),
            fetchUserLotSize()
          ]).catch(console.error);
        }
      }
      
      // Set balance from cached data (fast response)
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        if (balanceData.connected) {
          setMt5Balance({
            connected: true,
            balance: balanceData.balance || 0,
            equity: balanceData.equity || 0,
            currency: balanceData.currency || 'USD'
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch MT5 accounts:', error);
    }
  };

  const fetchUserLotSize = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/metaapi/lot-size`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUserLotSize(data.lot_size || 0.01);
      }
    } catch (error) {
      console.error('Failed to fetch lot size:', error);
    }
  };

  const saveUserLotSize = async (newLotSize) => {
    setLotSizeSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/metaapi/lot-size`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ lot_size: newLotSize })
      });
      if (response.ok) {
        setUserLotSize(newLotSize);
        alert('✅ Lot size updated successfully!');
      }
    } catch (error) {
      console.error('Failed to save lot size:', error);
      alert('❌ Failed to save lot size');
    }
    setLotSizeSaving(false);
  };

  const [balanceRefreshing, setBalanceRefreshing] = useState(false);

  // Silent balance refresh (doesn't show loading spinner)
  const silentRefreshBalance = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/metaapi/user/balance`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.connected) {
          setMt5Balance(prev => ({
            ...prev,
            balance: data.balance,
            equity: data.equity,
            currency: data.currency,
            connected: true,
            last_updated: data.last_updated
          }));
        }
      }
    } catch (error) {
      // Silent fail - don't log errors for auto-refresh
    }
  };

  // Auto-refresh balance every 30 seconds when connected (reduced from 1s for performance)
  useEffect(() => {
    if (mt5Balance.connected || mt5Accounts.length > 0) {
      // Initial silent refresh after 5 seconds
      const initialTimeout = setTimeout(() => {
        silentRefreshBalance();
      }, 5000);
      
      // Then refresh every 30 seconds
      const intervalId = setInterval(() => {
        silentRefreshBalance();
      }, 30000);
      
      return () => {
        clearTimeout(initialTimeout);
        clearInterval(intervalId);
      };
    }
  }, [mt5Balance.connected, mt5Accounts.length]);

  const refreshBalance = async () => {
    setBalanceRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/metaapi/refresh-balance`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Balance refresh response:', data);
        if (data.success && (data.balance > 0 || data.accounts?.length > 0)) {
          setMt5Balance({
            connected: true,
            balance: data.balance,
            equity: data.equity,
            currency: data.currency
          });
        } else if (data.balance === 0) {
          // Balance is 0 - might need to wait for MetaAPI sync
          console.log('Balance returned 0, MetaAPI might still be syncing...');
          // Try fetching accounts to get stored balance
          fetchMT5Accounts();
        }
      } else {
        const errorData = await response.json();
        console.error('Balance refresh failed:', errorData);
      }
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    }
    setBalanceRefreshing(false);
  };

  const fetchMT5Balance = async (accountId) => {
    try {
      const token = localStorage.getItem('token');
      // First try the user balance endpoint (uses cached data from DB)
      const userBalanceResponse = await fetch(`${BACKEND_URL}/api/metaapi/user/balance`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (userBalanceResponse.ok) {
        const data = await userBalanceResponse.json();
        if (data.connected) {
          setMt5Balance(data);
          return;
        }
      }
      
      // Fallback to account-specific endpoint (real-time from MetaAPI)
      const response = await fetch(`${BACKEND_URL}/api/metaapi/account/${accountId}/balance`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMt5Balance(data);
      }
    } catch (error) {
      console.error('Failed to fetch MT5 balance:', error);
    }
  };

  const handleMT5Connect = async (result) => {
    setShowMT5Connect(false);
    // Refresh all MT5 data after successful connection
    fetchMT5Accounts();
    fetchRecentActivity();
    
    // Force a balance refresh after connection
    if (result && result.success) {
      alert('✅ MT5 account connected successfully! You will receive a confirmation email.');
      // Wait a moment then force refresh balance
      setTimeout(() => {
        refreshBalance();
      }, 2000);
    }
  };

  const handleDisconnectMT5 = async (accountId) => {
    if (!confirm('Are you sure you want to disconnect this MT5 account?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/metaapi/account/${accountId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        alert('✅ MT5 account disconnected successfully.');
        // Refresh MT5 data
        fetchMT5Accounts();
        setMt5Balance({ connected: false, balance: 0, equity: 0, currency: 'USD' });
        setTradeHistory([]);
      } else {
        alert(`❌ Failed to disconnect: ${data.detail || data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      alert('❌ Failed to disconnect account. Please try again.');
    }
  };

  const fetchTradeHistory = async (accountId) => {
    setTradeHistoryLoading(true);
    try {
      const token = localStorage.getItem('token');
      // Use new user-level endpoint for combined trade history
      const response = await fetch(`${BACKEND_URL}/api/metaapi/user/trade-history?limit=20`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTradeHistory(data.trades || []);
      }
    } catch (error) {
      console.error('Failed to fetch trade history:', error);
    } finally {
      setTradeHistoryLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    // Recent activity is now derived from trades state
    // This function is kept for compatibility but does nothing
    // The recentActivity is computed from trades.slice(0, 3)
  };

  const fetchOpenPositions = async (accountId) => {
    setPositionsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/metaapi/account/${accountId}/positions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setOpenPositions(data.positions || []);
      }
    } catch (error) {
      console.error('Failed to fetch open positions:', error);
    } finally {
      setPositionsLoading(false);
    }
  };

  const fetchAiSignals = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/signals`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAiSignals(data.signals || []);
      }
    } catch (error) {
      console.error('Failed to fetch AI signals:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No token found for notifications fetch');
        return;
      }
      
      // Use browser cache for better performance
      const [notifResponse, countResponse] = await Promise.all([
        fetch(`${BACKEND_URL}/api/notifications?limit=10`, {
          method: 'GET',
          headers: { 
            'Authorization': `Bearer ${token}`
          }
        }),
        fetch(`${BACKEND_URL}/api/notifications/unread-count`, {
          method: 'GET',
          headers: { 
            'Authorization': `Bearer ${token}`
          }
        })
      ]);
      
      if (notifResponse.ok) {
        const data = await notifResponse.json();
        setNotifications(data || []);
        
        // Check for new notifications and show browser notification
        if (data && data.length > 0) {
          const newUnread = data.filter(n => !n.read).length;
          if (newUnread > lastNotificationCountRef.current && lastNotificationCountRef.current > 0) {
            // New notification arrived - show browser notification
            const latestNotif = data.find(n => !n.read);
            if (latestNotif && browserNotifPermission === 'granted') {
              showBrowserNotification(
                latestNotif.title || 'New IGRIS Alert',
                latestNotif.message || 'You have a new notification',
                { id: latestNotif.id }
              );
            }
          }
          lastNotificationCountRef.current = newUnread;
        }
      }
      
      if (countResponse.ok) {
        const countData = await countResponse.json();
        setUnreadCount(countData.count || 0);
      }
    } catch (error) {
      // Silent fail for background fetch
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${BACKEND_URL}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${BACKEND_URL}/api/notifications/read-all`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const clearAllNotifications = async () => {
    if (!window.confirm('Are you sure you want to clear all notifications?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/notifications/clear-all`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  };

  const fetchAllNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/notifications/all?limit=100`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to fetch all notifications:', error);
    }
  };

  const fetchTrades = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/trades`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setTrades(data);
      }
    } catch (error) {
      console.error('Failed to fetch trades:', error);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/auth/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAllUsers(data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  // Mock dashboard data
  const portfolioData = {
    totalValue: '$124,532.45',
    change: '+$2,345.67',
    changePercent: '+1.92%',
    isPositive: true
  };

  // Recent activity from trades
  const recentActivity = trades.slice(0, 3).map(trade => ({
    type: trade.type?.toLowerCase().includes('buy') ? 'buy' : 'sell',
    pair: trade.symbol || 'N/A',
    amount: `${trade.volume || 0} lots`,
    price: `$${trade.open_price?.toFixed(2) || '0.00'}`,
    time: trade.open_time ? new Date(trade.open_time).toLocaleString() : 'N/A',
    status: 'completed'
  }));

  // Regular user menu items - updated with new sections
  const userMenuItems = [
    { icon: Home, label: 'Home', id: 'overview' },
    { icon: TrendingUp, label: 'MT5', id: 'mt5' },
    { icon: Brain, label: 'IGRIS AI', id: 'prompttrading' },
    { icon: LineChart, label: 'Chart', id: 'chart' },
    { icon: Activity, label: 'EA Signals', id: 'easignals' },
    { icon: Wallet, label: 'Wallet', id: 'wallet' },
    { icon: DollarSign, label: 'Subscription', id: 'subscription' },
    { icon: MessageCircle, label: 'Support', id: 'support' },
    { icon: Settings, label: 'Settings', id: 'settings' }
  ];

  // Admin-only menu items
  const adminMenuItems = [
    { icon: History, label: 'MT5 Trades', id: 'mt5trades' },
    { icon: Mail, label: 'Email Templates', id: 'emailtemplates' },
    { icon: DollarSign, label: 'Plans & Payments', id: 'planspayments' },
    { icon: Shield, label: 'Risk Settings', id: 'risksettings' },
    { icon: Server, label: 'System Status', id: 'systemstatus' },
    { icon: Key, label: 'API Settings', id: 'api' },
    { icon: Users, label: 'Manage Users', id: 'users' }
  ];

  const sidebarItems = user?.is_admin 
    ? [...userMenuItems, ...adminMenuItems]
    : userMenuItems;

  const getPageTitle = () => {
    const titles = {
      'overview': 'Dashboard',
      'mt5': 'MT5 Account',
      'prompttrading': 'IGRIS AI',
      'chart': 'Chart & IGRIS',
      'easignals': 'EA Signals',
      'wallet': 'Wallet',
      'support': 'Support & FAQ',
      'settings': 'Settings',
      'signals': 'AI Signals',
      'portfolio': 'Portfolio',
      'mt5trades': 'MT5 Trades',
      'emailtemplates': 'Email Templates',
      'planspayments': 'Plans & Payments',
      'risksettings': 'Risk Settings',
      'systemstatus': 'System Status',
      'api': 'API Settings',
      'users': 'Manage Users',
      'subscription': 'Subscription'
    };
    return titles[activeTab] || 'Dashboard';
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${isDark ? 'bg-[#0a0a0f]' : 'bg-gray-100'}`}>
        <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  // Overview Content
  const OverviewContent = () => {
    const isConnected = mt5Balance.connected || mt5Accounts.length > 0;
    
    return (
    <>
      {/* MT5 Connection Banner */}
      {!isConnected && (
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
            <div className="flex items-center gap-2">
              {isConnected && (
                <>
                  <button
                    onClick={refreshBalance}
                    disabled={balanceRefreshing}
                    className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500'} disabled:opacity-50`}
                    title="Refresh balance"
                  >
                    <RefreshCw className={`w-4 h-4 ${balanceRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs">Connected</span>
                </>
              )}
              <TrendingUp className="w-5 h-5 text-[#FFA500]" />
            </div>
          </div>
          {isConnected ? (
            <>
              <div className={`text-2xl lg:text-4xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {mt5Balance.currency} {mt5Balance.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Activity className="w-4 h-4" />
                  <span className="font-medium text-sm lg:text-base">Equity: {mt5Balance.currency} {mt5Balance.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                {mt5Balance.last_updated && (
                  <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    Updated: {new Date(mt5Balance.last_updated).toLocaleTimeString()}
                  </span>
                )}
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
            <Brain className={`w-5 h-5 ${isConnected ? 'text-emerald-400' : 'text-gray-500'}`} />
          </div>
          <div className={`text-xl lg:text-2xl font-bold mb-1 ${isConnected ? 'text-emerald-400' : 'text-gray-500'}`}>
            {isConnected ? 'Active' : 'Inactive'}
          </div>
          <p className={`text-xs lg:text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            {isConnected ? 'Analyzing 150+ pairs' : 'Connect MT5 to activate'}
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
        <div className={`lg:col-span-2 rounded-2xl border p-4 lg:p-6 ${isDark ? 'bg-[#12121a]/60 border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
          <div className="flex items-center justify-between mb-4 lg:mb-6">
            <h2 className={`text-base lg:text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Open Positions</h2>
            {isConnected && openPositions.length > 0 && (
              <button className="text-[#FFA500] text-sm hover:text-[#FF8C00] flex items-center gap-1">
                View all <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
          {!isConnected ? (
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

      <div className={`mt-4 lg:mt-6 rounded-2xl border p-4 lg:p-6 ${isDark ? 'bg-[#12121a]/60 border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <h2 className={`text-base lg:text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Recent Activity</h2>
          <Clock className={`w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
        </div>
        <div className="space-y-3 lg:space-y-4">
          {recentActivity.map((activity, index) => (
            <div key={index} className={`flex items-center justify-between p-3 lg:p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-3 lg:gap-4">
                <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center ${activity.type === 'buy' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                  {activity.type === 'buy' ? <ArrowUpRight className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-400" /> : <ArrowDownRight className="w-4 h-4 lg:w-5 lg:h-5 text-red-400" />}
                </div>
                <div>
                  <p className="text-white font-medium text-sm lg:text-base">{activity.type === 'buy' ? 'Bought' : 'Sold'} {activity.pair}</p>
                  <p className="text-gray-500 text-xs lg:text-sm">{activity.amount} @ {activity.price}</p>
                </div>
              </div>
              <span className="text-gray-500 text-xs lg:text-sm">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
  };

  // AI Signals Content with IGRIS Chat
  const SignalsContent = () => {
    const [chatOpen, setChatOpen] = useState(false);
    const [messages, setMessages] = useState([
      { role: 'assistant', content: "Hello! I'm IGRIS, your AI trading assistant. Ask me about market analysis, trading signals, risk management, or upload a chart image for analysis!" }
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const chatEndRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
      if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, [messages]);

    const handleImageSelect = (e) => {
      const file = e.target.files[0];
      if (file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          alert('Please select an image file');
          return;
        }
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert('Image size must be less than 5MB');
          return;
        }
        
        const reader = new FileReader();
        reader.onloadend = () => {
          setSelectedImage(reader.result); // Base64 data URL
          setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
      }
    };

    const removeImage = () => {
      setSelectedImage(null);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    const handleSendMessage = async () => {
      if ((!inputMessage.trim() && !selectedImage) || isLoading) return;
      
      const userMessage = inputMessage;
      const userImage = selectedImage;
      
      // Add user message to chat
      const newUserMessage = { 
        role: 'user', 
        content: userMessage || 'Analyze this image',
        image: userImage
      };
      setMessages(prev => [...prev, newUserMessage]);
      setInputMessage('');
      setSelectedImage(null);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setIsLoading(true);
      
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BACKEND_URL}/api/settings/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            message: userMessage,
            image: userImage
          })
        });

        const data = await response.json();
        
        if (response.ok) {
          setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
        } else {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: data.detail || "I'm sorry, I encountered an error. Please try again." 
          }]);
        }
      } catch (error) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: "I'm having trouble connecting. Please check your internet connection and try again." 
        }]);
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="space-y-6">
        {/* Chat with IGRIS Button */}
        <div className="bg-gradient-to-r from-[#FFA500]/20 to-amber-600/20 rounded-2xl border border-[#FFA500]/20 p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#FFA500]/20 flex items-center justify-center">
                <Bot className="w-6 h-6 text-[#FFA500]" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Chat with IGRIS</h3>
                <p className="text-gray-400 text-sm">Ask questions or upload charts for AI analysis</p>
              </div>
            </div>
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FFA500] hover:bg-[#FF8C00] text-white font-medium transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              {chatOpen ? 'Close Chat' : 'Open Chat'}
            </button>
          </div>

          {/* Chat Interface */}
          {chatOpen && (
            <div className="mt-4 bg-[#0a0a0f] rounded-xl border border-white/10 overflow-hidden">
              <div className="h-80 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-xl ${
                      msg.role === 'user' 
                        ? 'bg-[#FFA500] text-white' 
                        : 'bg-white/10 text-gray-200'
                    }`}>
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-2 mb-1">
                          <Bot className="w-4 h-4 text-[#FFA500]" />
                          <span className="text-[#FFA500] text-xs font-medium">IGRIS</span>
                        </div>
                      )}
                      {msg.image && (
                        <img 
                          src={msg.image} 
                          alt="Uploaded" 
                          className="max-w-full h-auto rounded-lg mb-2 max-h-40 object-contain"
                        />
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white/10 text-gray-200 p-3 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <Bot className="w-4 h-4 text-[#FFA500]" />
                        <span className="text-[#FFA500] text-xs font-medium">IGRIS</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-[#FFA500] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-[#FFA500] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-[#FFA500] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              
              {/* Image Preview */}
              {imagePreview && (
                <div className="px-4 py-2 border-t border-white/10 bg-white/5">
                  <div className="relative inline-block">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="h-20 w-auto rounded-lg object-contain"
                    />
                    <button
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-xs"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
              
              <div className="p-4 border-t border-white/10">
                <div className="flex gap-2">
                  {/* Hidden file input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    accept="image/*"
                    className="hidden"
                  />
                  {/* Image upload button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Upload image for analysis"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={selectedImage ? "Add a message about the image..." : "Ask IGRIS about trading signals..."}
                    disabled={isLoading}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#FFA500]/50 disabled:opacity-50"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isLoading || (!inputMessage.trim() && !selectedImage)}
                    className="p-2 rounded-lg bg-[#FFA500] hover:bg-[#FF8C00] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-gray-500 text-xs mt-2">
                  Upload trading charts, screenshots, or any image for AI analysis
                </p>
              </div>
            </div>
          )}
        </div>

        {/* AI Signals Grid */}
        <div className="bg-[#12121a]/60 rounded-2xl border border-white/5 p-4 lg:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">AI Trading Signals</h2>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-medium flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {aiSignals.map((signal, index) => (
              <div key={index} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-violet-500/30 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-white font-semibold text-lg">{signal.pair}</span>
                  <span className={`px-3 py-1 rounded-lg text-sm font-bold ${signal.signal === 'LONG' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {signal.signal}
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-500">Confidence</span>
                      <span className="text-white font-medium">{signal.confidence}%</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <div
                        className={`h-full rounded-full transition-all ${signal.confidence >= 80 ? 'bg-emerald-500' : signal.confidence >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${signal.confidence}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-white/5">
                      <p className="text-gray-500 text-xs">Entry</p>
                      <p className="text-white font-medium text-sm">{signal.entry}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                      <p className="text-gray-500 text-xs">TP</p>
                      <p className="text-emerald-400 font-medium text-sm">{signal.tp}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-red-500/10">
                      <p className="text-gray-500 text-xs">SL</p>
                      <p className="text-red-400 font-medium text-sm">{signal.sl}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-white/5">
                    <span className="text-gray-500 text-sm">R/R Ratio</span>
                    <span className="text-violet-400 font-medium">{signal.riskReward}</span>
                  </div>
                </div>

                <button className="w-full mt-4 py-2 rounded-lg bg-violet-500/20 text-violet-400 font-medium hover:bg-violet-500/30 transition-colors">
                  Execute Trade
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Portfolio Content
  const PortfolioContent = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#12121a]/60 rounded-2xl border border-white/5 p-4 lg:p-6">
          <p className="text-gray-400 text-sm mb-2">Total Value</p>
          <p className="text-2xl font-bold text-white">{portfolioData.totalValue}</p>
        </div>
        <div className="bg-[#12121a]/60 rounded-2xl border border-white/5 p-4 lg:p-6">
          <p className="text-gray-400 text-sm mb-2">24h Change</p>
          <p className="text-2xl font-bold text-emerald-400">{portfolioData.change}</p>
        </div>
        <div className="bg-[#12121a]/60 rounded-2xl border border-white/5 p-4 lg:p-6">
          <p className="text-gray-400 text-sm mb-2">Total Positions</p>
          <p className="text-2xl font-bold text-white">{positions.length}</p>
        </div>
      </div>

      <div className="bg-[#12121a]/60 rounded-2xl border border-white/5 p-4 lg:p-6">
        <h2 className="text-lg font-semibold text-white mb-6">All Positions</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-gray-400 text-sm font-medium pb-4">Asset</th>
                <th className="text-left text-gray-400 text-sm font-medium pb-4">Amount</th>
                <th className="text-left text-gray-400 text-sm font-medium pb-4">Value</th>
                <th className="text-left text-gray-400 text-sm font-medium pb-4">P&L</th>
                <th className="text-right text-gray-400 text-sm font-medium pb-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position, index) => (
                <tr key={index} className="border-b border-white/5">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold text-sm">
                        {position.symbol.split('/')[0].charAt(0)}
                      </div>
                      <span className="text-white font-medium">{position.symbol}</span>
                    </div>
                  </td>
                  <td className="py-4 text-white">{position.amount}</td>
                  <td className="py-4 text-white">{position.value}</td>
                  <td className={`py-4 ${position.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {position.pnl} ({position.pnlPercent})
                  </td>
                  <td className="py-4 text-right">
                    <button className="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition-colors">
                      Close
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // MT5 Trades Content (Admin Only)
  const MT5TradesContent = () => (
    <div className="space-y-6">
      <div className="bg-[#12121a]/60 rounded-2xl border border-white/5 p-4 lg:p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">MT5 Trade History</h2>
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Connected
          </span>
        </div>

        <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Download className="w-5 h-5 text-violet-400 mt-0.5" />
            <div>
              <p className="text-white font-medium mb-1">Download MT5 Expert Advisor</p>
              <p className="text-gray-400 text-sm mb-3">Install the IGRIS EA to automatically send your MT5 trades</p>
              <a 
                href={`${BACKEND_URL}/api/download/ea`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                Download IGRIS_EA.mq5
              </a>
            </div>
          </div>
        </div>

        {trades.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">No MT5 trades yet</p>
            <p className="text-gray-500 text-sm">Install the EA on your MT5 to start tracking trades</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-gray-400 text-sm font-medium pb-4">Symbol</th>
                  <th className="text-left text-gray-400 text-sm font-medium pb-4">Type</th>
                  <th className="text-left text-gray-400 text-sm font-medium pb-4">Volume</th>
                  <th className="text-left text-gray-400 text-sm font-medium pb-4">Open Price</th>
                  <th className="text-left text-gray-400 text-sm font-medium pb-4">Close Price</th>
                  <th className="text-left text-gray-400 text-sm font-medium pb-4">Profit</th>
                  <th className="text-left text-gray-400 text-sm font-medium pb-4">Time</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade, index) => (
                  <tr key={index} className="border-b border-white/5">
                    <td className="py-4 text-white font-medium">{trade.symbol}</td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${trade.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                        {trade.type}
                      </span>
                    </td>
                    <td className="py-4 text-gray-300">{trade.volume}</td>
                    <td className="py-4 text-gray-300">{trade.open_price}</td>
                    <td className="py-4 text-gray-300">{trade.close_price || '-'}</td>
                    <td className={`py-4 ${trade.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {trade.profit >= 0 ? '+' : ''}{trade.profit?.toFixed(2) || '0.00'}
                    </td>
                    <td className="py-4 text-gray-500 text-sm">{new Date(trade.open_time).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // API Settings Content (Admin Only) - WITH OPENAI KEY AND SMTP
  const APISettingsContent = () => {
    const [showApiKey, setShowApiKey] = useState(false);
    const [openaiKey, setOpenaiKey] = useState('');
    const [hasOpenaiKey, setHasOpenaiKey] = useState(false);
    const [hasEmergentKey, setHasEmergentKey] = useState(false);
    const [activeSource, setActiveSource] = useState('none');
    const [savedKey, setSavedKey] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [loadingApiKeys, setLoadingApiKeys] = useState(true);
    
    // SMTP settings status
    const [emailConfigured, setEmailConfigured] = useState(false);

    // MetaAPI settings
    const [metaApiToken, setMetaApiToken] = useState('');
    const [metaApiConfiguredLocal, setMetaApiConfiguredLocal] = useState(false);
    const [savingMetaApi, setSavingMetaApi] = useState(false);
    const [savedMetaApi, setSavedMetaApi] = useState(false);
    
    // CopyFactory settings
    const [copyFactoryStrategyId, setCopyFactoryStrategyId] = useState('');
    const [copyFactoryConfigured, setCopyFactoryConfigured] = useState(false);
    const [savingCopyFactory, setSavingCopyFactory] = useState(false);
    const [savedCopyFactory, setSavedCopyFactory] = useState(false);
    const [loadingCopyFactory, setLoadingCopyFactory] = useState(true);
    
    const userApiKey = user?.id || 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
    
    // Use ref to prevent multiple fetches
    const hasFetched = useRef(false);

    useEffect(() => {
      if (!hasFetched.current) {
        hasFetched.current = true;
        fetchApiKeys();
        fetchEmailSettings();
        fetchMetaApiSettings();
        fetchCopyFactorySettings();
      }
    }, []);

    const fetchApiKeys = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BACKEND_URL}/api/settings/api-keys`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setSavedKey(data.openai_api_key || '');
          setHasOpenaiKey(data.has_openai_key || false);
          setHasEmergentKey(data.has_emergent_key || false);
          setActiveSource(data.active_source || 'none');
        }
      } catch (error) {
        console.error('Failed to fetch API keys:', error);
      } finally {
        setLoadingApiKeys(false);
      }
    };

    const fetchEmailSettings = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BACKEND_URL}/api/email-templates/config/smtp`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setEmailConfigured(data.config?.is_configured || false);
        }
      } catch (error) {
        console.error('Failed to fetch SMTP settings:', error);
      }
    };

    const fetchMetaApiSettings = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BACKEND_URL}/api/metaapi/admin/settings`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setMetaApiConfiguredLocal(data.is_configured || false);
        }
      } catch (error) {
        console.error('Failed to fetch MetaAPI settings:', error);
      }
    };

    const handleSaveMetaApiToken = async () => {
      setSavingMetaApi(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BACKEND_URL}/api/metaapi/admin/settings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ api_token: metaApiToken })
        });

        if (response.ok) {
          setSavedMetaApi(true);
          setMetaApiToken('');
          fetchMetaApiSettings();
          setTimeout(() => setSavedMetaApi(false), 3000);
        }
      } catch (error) {
        console.error('Failed to save MetaAPI token:', error);
      }
      setSavingMetaApi(false);
    };

    const fetchCopyFactorySettings = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BACKEND_URL}/api/admin/copyfactory-settings`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setCopyFactoryConfigured(data.configured || false);
          if (data.strategy_id) {
            setCopyFactoryStrategyId(data.strategy_id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch CopyFactory settings:', error);
      } finally {
        setLoadingCopyFactory(false);
      }
    };

    const handleSaveCopyFactorySettings = async () => {
      if (!copyFactoryStrategyId.trim()) {
        alert('Please enter a Strategy ID');
        return;
      }
      setSavingCopyFactory(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BACKEND_URL}/api/admin/copyfactory-settings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ strategy_id: copyFactoryStrategyId.trim() })
        });

        const data = await response.json();
        console.log('CopyFactory save response:', response.status, data);
        
        if (response.ok && data.success) {
          setSavedCopyFactory(true);
          setCopyFactoryConfigured(true);
          setTimeout(() => setSavedCopyFactory(false), 3000);
          alert('✅ CopyFactory settings saved successfully!');
        } else {
          alert(`❌ Failed to save: ${data.detail || data.message || data.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Failed to save CopyFactory settings:', error);
        alert(`❌ Network error: ${error.message || 'Failed to connect to server'}`);
      }
      setSavingCopyFactory(false);
    };

    const handleSaveOpenAIKey = async () => {
      setSaving(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BACKEND_URL}/api/settings/api-keys`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ openai_api_key: openaiKey })
        });

        if (response.ok) {
          setSaved(true);
          setOpenaiKey('');
          fetchApiKeys();
          setTimeout(() => setSaved(false), 3000);
        }
      } catch (error) {
        console.error('Failed to save API key:', error);
      }
      setSaving(false);
    };

    const handleClearOpenAIKey = async () => {
      setSaving(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BACKEND_URL}/api/settings/api-keys`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ openai_api_key: '' })
        });

        if (response.ok) {
          fetchApiKeys();
        }
      } catch (error) {
        console.error('Failed to clear API key:', error);
      }
      setSaving(false);
    };

    return (
      <div className="space-y-6">
        {/* LLM API Settings */}
        <div className="bg-gradient-to-br from-emerald-600/10 to-teal-600/10 rounded-2xl border border-emerald-500/20 p-4 lg:p-6">
          <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <Brain className="w-5 h-5 text-emerald-400" />
            AI Chat Configuration (IGRIS)
          </h2>
          <p className="text-gray-400 text-sm mb-6">Configure which LLM key to use for the IGRIS AI chat feature.</p>
          
          <div className="space-y-4 max-w-xl">
            {/* Current Status */}
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              activeSource === 'admin' ? 'bg-emerald-500/10 border border-emerald-500/20' :
              activeSource === 'emergent' ? 'bg-[#FFA500]/10 border border-[#FFA500]/20' :
              'bg-red-500/10 border border-red-500/20'
            }`}>
              <Check className={`w-5 h-5 ${
                activeSource === 'admin' ? 'text-emerald-400' :
                activeSource === 'emergent' ? 'text-[#FFA500]' :
                'text-red-400'
              }`} />
              <span className={`text-sm ${
                activeSource === 'admin' ? 'text-emerald-400' :
                activeSource === 'emergent' ? 'text-[#FFA500]' :
                'text-red-400'
              }`}>
                {activeSource === 'admin' && `Using your OpenAI API key: ${savedKey}`}
                {activeSource === 'emergent' && 'Using Emergent LLM key (default)'}
                {activeSource === 'none' && 'No LLM key configured - chat disabled'}
              </span>
            </div>

            {hasEmergentKey && (
              <div className="p-3 rounded-lg bg-[#FFA500]/5 border border-[#FFA500]/20">
                <p className="text-[#FFA500] text-sm">
                  <strong>Emergent LLM key is available.</strong> You can use this as default or add your own OpenAI key below.
                </p>
              </div>
            )}
            
            <div>
              <label className="text-gray-400 text-sm block mb-2">
                {hasOpenaiKey ? 'Update OpenAI API Key (Optional)' : 'Enter OpenAI API Key (Optional)'}
              </label>
              <input 
                type="password" 
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-... (leave empty to use Emergent key)"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-emerald-500/50" 
              />
              <p className="text-gray-500 text-xs mt-2">
                Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">OpenAI Dashboard</a>
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleSaveOpenAIKey}
                disabled={saving || !openaiKey.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : saved ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saved ? 'Saved!' : 'Save OpenAI Key'}
              </button>
              
              {hasOpenaiKey && (
                <button
                  onClick={handleClearOpenAIKey}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 font-medium transition-colors disabled:opacity-50"
                >
                  Use Emergent Key Instead
                </button>
              )}
            </div>
          </div>
        </div>

        {/* SMTP Email Settings for Notifications */}
        <div className="bg-gradient-to-br from-[#FFA500]/10 to-amber-600/10 rounded-2xl border border-[#FFA500]/20 p-4 lg:p-6">
          <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <Mail className="w-5 h-5 text-[#FFA500]" />
            Email Notifications (SMTP)
          </h2>
          <p className="text-gray-400 text-sm mb-6">SMTP email settings are configured in the Email Templates section. Go there to set up your SMTP server.</p>
          
          <div className="space-y-4 max-w-xl">
            {emailConfigured ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Check className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-400 text-sm">SMTP is configured and active</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Mail className="w-5 h-5 text-amber-400" />
                <span className="text-amber-400 text-sm">SMTP not configured - email notifications disabled</span>
              </div>
            )}
            
            <button
              onClick={() => setActiveTab('emailtemplates')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FFA500] hover:bg-[#FF8C00] text-white font-medium transition-colors"
            >
              <Settings className="w-4 h-4" />
              Configure SMTP in Email Templates
            </button>
            
            <div className={`p-3 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                <strong>Supported SMTP providers:</strong><br/>
                Gmail (smtp.gmail.com:587), Outlook (smtp.office365.com:587), SendGrid (smtp.sendgrid.net:587), Mailgun, and more.
              </p>
            </div>
          </div>
        </div>

        {/* MetaAPI Settings */}
        <div className="bg-gradient-to-br from-blue-600/10 to-cyan-600/10 rounded-2xl border border-blue-500/20 p-4 lg:p-6">
          <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            MT5 Connection API (Admin Only)
          </h2>
          <p className="text-gray-400 text-sm mb-6">Configure the secure API to allow users to connect their MT5 accounts.</p>
          
          <div className="space-y-4 max-w-xl">
            {metaApiConfiguredLocal ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Check className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-400 text-sm">MT5 Connection API is configured and active</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Server className="w-5 h-5 text-amber-400" />
                <span className="text-amber-400 text-sm">API not configured - MT5 connections disabled</span>
              </div>
            )}
            
            <div>
              <label className="text-gray-400 text-sm block mb-2">API Token</label>
              <input 
                type="password" 
                value={metaApiToken}
                onChange={(e) => setMetaApiToken(e.target.value)}
                placeholder="Enter your API token"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-blue-500/50" 
              />
              <p className="text-gray-500 text-xs mt-2">
                Get your token from <a href="https://app.metaapi.cloud/token" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">the API Dashboard</a>
              </p>
            </div>
            
            <button
              onClick={handleSaveMetaApiToken}
              disabled={savingMetaApi || !metaApiToken.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingMetaApi ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : savedMetaApi ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {savedMetaApi ? 'Saved!' : 'Save API Token'}
            </button>

            <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <h4 className="text-blue-400 font-medium text-sm mb-2">Setup Guide:</h4>
              <ol className="text-gray-300 text-xs space-y-1 list-decimal list-inside">
                <li>Create a free account at the <a href="https://metaapi.cloud" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">API provider</a></li>
                <li>Go to Settings → API Access Tokens</li>
                <li>Create a new token with "Full access" permissions</li>
                <li>Copy the token and paste it above</li>
              </ol>
            </div>
          </div>
        </div>

        {/* CopyFactory Settings */}
        <div className="bg-gradient-to-br from-purple-600/10 to-pink-600/10 rounded-2xl border border-purple-500/20 p-4 lg:p-6">
          <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" />
            Copy Trading Strategy (Admin Only)
          </h2>
          <p className="text-gray-400 text-sm mb-6">Configure the master strategy for automatic trade copying.</p>
          
          <div className="space-y-4 max-w-xl">
            {loadingCopyFactory ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10">
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                <span className="text-gray-400 text-sm">Loading settings...</span>
              </div>
            ) : copyFactoryConfigured ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <Check className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-400 text-sm">Copy Trading Strategy is configured (ID: {copyFactoryStrategyId})</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <XCircle className="w-5 h-5 text-red-400" />
                <span className="text-red-400 text-sm">Strategy not configured - Copy Trading disabled for all users!</span>
              </div>
            )}
            
            <div>
              <label className="text-gray-400 text-sm block mb-2">Master Strategy ID</label>
              <input 
                type="text" 
                value={copyFactoryStrategyId}
                onChange={(e) => setCopyFactoryStrategyId(e.target.value)}
                placeholder="Enter strategy ID (e.g., BGpv)"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-purple-500/50" 
              />
              <p className="text-gray-500 text-xs mt-2">
                The Strategy ID from your CopyFactory provider account
              </p>
            </div>
            
            <button
              onClick={handleSaveCopyFactorySettings}
              disabled={savingCopyFactory || !copyFactoryStrategyId.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingCopyFactory ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : savedCopyFactory ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {savedCopyFactory ? 'Saved!' : 'Save Strategy ID'}
            </button>

            <div className="mt-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <h4 className="text-purple-400 font-medium text-sm mb-2">⚠️ Important:</h4>
              <p className="text-gray-300 text-xs">
                This Strategy ID links user accounts to your master trading account. Without this, 
                the "Activate" button in MT5 section will fail. Make sure you have created a provider 
                strategy in your CopyFactory account first.
              </p>
            </div>
          </div>
        </div>

        {/* MT5 Integration Settings */}
        <div className="bg-[#12121a]/60 rounded-2xl border border-white/5 p-4 lg:p-6">
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Globe className="w-5 h-5" />
            MT5 Integration
          </h2>
          
          <div className="space-y-6 max-w-2xl">
            <div>
              <label className="text-gray-400 text-sm block mb-2">Your API Key (for MT5 EA)</label>
              <div className="relative">
                <input 
                  type={showApiKey ? 'text' : 'password'} 
                  value={userApiKey}
                  readOnly
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-4 pr-24 py-3 text-white font-mono text-sm" 
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button 
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
              </div>
              <p className="text-gray-500 text-xs mt-2">Use this key in your MT5 EA configuration</p>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
              <h4 className="text-amber-400 font-medium mb-2">MT5 EA Setup Instructions</h4>
              <ol className="text-gray-300 text-sm space-y-2 list-decimal list-inside">
                <li>Download the IGRIS_EA.mq5 file from MT5 Trades section</li>
                <li>Open MetaTrader 5 and go to File → Open Data Folder</li>
                <li>Navigate to MQL5 → Experts folder</li>
                <li>Copy the IGRIS_EA.mq5 file into this folder</li>
                <li>Restart MetaTrader 5 or refresh the Navigator panel</li>
                <li>Drag the IGRIS EA onto any chart</li>
                <li>In the EA settings, paste your API Key</li>
                <li>Set the Server URL to: <code className="bg-white/10 px-2 py-0.5 rounded">{BACKEND_URL}</code></li>
                <li>Enable "Allow WebRequest for listed URLs" in Tools → Options → Expert Advisors</li>
                <li>Add the server URL to the allowed list</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Demo Video Settings */}
        <DemoVideoSettingsCard />
      </div>
    );
  };

  // Demo Video Settings Card Component
  const DemoVideoSettingsCard = () => {
    const [demoVideoUrl, setDemoVideoUrl] = useState('');
    const [savingDemoVideo, setSavingDemoVideo] = useState(false);
    const [savedDemoVideo, setSavedDemoVideo] = useState(false);

    useEffect(() => {
      fetchDemoVideoSettings();
    }, []);

    const fetchDemoVideoSettings = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/settings/demo-video`);
        if (response.ok) {
          const data = await response.json();
          setDemoVideoUrl(data.video_url || '');
        }
      } catch (error) {
        console.error('Failed to fetch demo video settings:', error);
      }
    };

    const handleSaveDemoVideo = async () => {
      setSavingDemoVideo(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BACKEND_URL}/api/settings/demo-video`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ video_url: demoVideoUrl })
        });

        if (response.ok) {
          setSavedDemoVideo(true);
          setTimeout(() => setSavedDemoVideo(false), 3000);
        }
      } catch (error) {
        console.error('Failed to save demo video URL:', error);
      }
      setSavingDemoVideo(false);
    };

    return (
      <div className={`rounded-2xl border p-4 lg:p-6 ${isDark ? 'bg-[#12121a]/60 border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-violet-500/20' : 'bg-violet-100'}`}>
            <Play className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Demo Video Settings</h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Configure the demo video shown on the homepage</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Video URL (YouTube, Vimeo, or direct video link)
            </label>
            <input
              type="text"
              value={demoVideoUrl}
              onChange={(e) => setDemoVideoUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
              className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:border-violet-500/50 ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
            />
            <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Supported: YouTube, Vimeo, or direct video URLs (.mp4, .webm)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveDemoVideo}
              disabled={savingDemoVideo}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 text-white font-medium transition-colors disabled:opacity-50"
            >
              {savingDemoVideo ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : savedDemoVideo ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {savedDemoVideo ? 'Saved!' : 'Save Video URL'}
            </button>
            {demoVideoUrl && (
              <a
                href={demoVideoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
              >
                <Globe className="w-4 h-4" />
                Preview
              </a>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Manage Users Content (Admin Only)
  const ManageUsersContent = () => {
    const [showAddUser, setShowAddUser] = useState(false);
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', is_admin: false });
    const [addingUser, setAddingUser] = useState(false);

    const handleAddUser = async () => {
      setAddingUser(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BACKEND_URL}/api/auth/admin/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(newUser)
        });

        if (response.ok) {
          setShowAddUser(false);
          setNewUser({ name: '', email: '', password: '', is_admin: false });
          fetchAllUsers();
        } else {
          const data = await response.json();
          alert(data.detail || 'Failed to add user');
        }
      } catch (error) {
        alert('Failed to add user');
      }
      setAddingUser(false);
    };

    const handleDeleteUser = async (userId) => {
      if (!window.confirm('Are you sure you want to delete this user? This cannot be undone.')) return;

      try {
        const token = localStorage.getItem('token');
        
        // Use XMLHttpRequest to avoid fetch body stream issues
        const xhr = new XMLHttpRequest();
        xhr.open('DELETE', `${BACKEND_URL}/api/auth/admin/users/${userId}`, true);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        
        xhr.onload = function() {
          if (xhr.status === 200) {
            alert('✅ User deleted successfully');
            fetchAllUsers();
          } else {
            try {
              const data = JSON.parse(xhr.responseText);
              alert(`❌ Failed: ${data.detail || 'Could not delete user'}`);
            } catch {
              alert('❌ Failed to delete user');
            }
          }
        };
        
        xhr.onerror = function() {
          alert('❌ Network error. Please try again.');
        };
        
        xhr.send();
      } catch (error) {
        alert(`❌ Error: ${error.message}`);
      }
    };

    const handleToggleUserAccess = async (userId, currentStatus) => {
      const newStatus = !currentStatus;
      const action = newStatus ? 'grant access to' : 'revoke access from';
      
      if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;

      try {
        const token = localStorage.getItem('token');
        
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', `${BACKEND_URL}/api/auth/admin/users/${userId}/access`, true);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        xhr.onload = function() {
          if (xhr.status === 200) {
            alert(`✅ User access ${newStatus ? 'granted' : 'revoked'} successfully`);
            fetchAllUsers();
          } else {
            try {
              const data = JSON.parse(xhr.responseText);
              alert(`❌ Failed: ${data.detail || 'Could not update user access'}`);
            } catch {
              alert('❌ Failed to update user access');
            }
          }
        };
        
        xhr.onerror = function() {
          alert('❌ Network error. Please try again.');
        };
        
        xhr.send(JSON.stringify({ is_active: newStatus }));
      } catch (error) {
        alert(`❌ Error: ${error.message}`);
      }
    };

    const handleApproveUser = async (userId, approve) => {
      const action = approve ? 'approve' : 'reject';
      if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BACKEND_URL}/api/auth/admin/users/${userId}/approve`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ approved: approve })
        });

        if (response.ok) {
          alert(`✅ User ${approve ? 'approved' : 'rejected'} successfully`);
          fetchAllUsers();
        } else {
          const data = await response.json();
          alert(`❌ Failed: ${data.detail || 'Could not update user'}`);
        }
      } catch (error) {
        alert(`❌ Error: ${error.message}`);
      }
    };

    const handleToggleProStatus = async (userId, makePro) => {
      const action = makePro ? 'upgrade to Pro' : 'downgrade to Free';
      if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BACKEND_URL}/api/auth/admin/users/${userId}/pro-status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ is_pro: makePro })
        });

        if (response.ok) {
          alert(`✅ User ${makePro ? 'upgraded to Pro' : 'downgraded to Free'} successfully`);
          fetchAllUsers();
        } else {
          const data = await response.json();
          alert(`❌ Failed: ${data.detail || 'Could not update user'}`);
        }
      } catch (error) {
        alert(`❌ Error: ${error.message}`);
      }
    };

    return (
      <div className="space-y-6">
        <div className="bg-[#12121a]/60 rounded-2xl border border-white/5 p-4 lg:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              Manage Users
            </h2>
            <button
              onClick={() => setShowAddUser(!showAddUser)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 text-white font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add User
            </button>
          </div>

          {showAddUser && (
            <div className="bg-white/5 rounded-xl p-4 mb-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm block mb-2">Name</label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-2">Email</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                    placeholder="Email address"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-sm block mb-2">Password</label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                    placeholder="Password"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newUser.is_admin}
                      onChange={(e) => setNewUser({ ...newUser, is_admin: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-gray-300">Admin privileges</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddUser}
                  disabled={addingUser}
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-colors disabled:opacity-50"
                >
                  {addingUser ? 'Adding...' : 'Add User'}
                </button>
                <button
                  onClick={() => setShowAddUser(false)}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-gray-400 text-sm font-medium pb-4">User</th>
                  <th className="text-left text-gray-400 text-sm font-medium pb-4">Email</th>
                  <th className="text-left text-gray-400 text-sm font-medium pb-4">Role</th>
                  <th className="text-left text-gray-400 text-sm font-medium pb-4">Status</th>
                  <th className="text-left text-gray-400 text-sm font-medium pb-4">Created</th>
                  <th className="text-right text-gray-400 text-sm font-medium pb-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map((u, index) => (
                  <tr key={index} className="border-b border-white/5">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-white font-medium">{u.name}</span>
                      </div>
                    </td>
                    <td className="py-4 text-gray-300">{u.email}</td>
                    <td className="py-4">
                      <div className="flex flex-wrap gap-1">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${u.is_admin ? 'bg-violet-500/20 text-violet-400' : u.is_pro ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-500/20 text-gray-400'}`}>
                          {u.is_admin ? 'Admin' : u.is_pro ? 'Pro' : 'Free'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 py-1 rounded text-xs font-medium inline-block w-fit ${u.is_active !== false ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          {u.is_active !== false ? 'Active' : 'Disabled'}
                        </span>
                        {!u.is_admin && u.approved === false && (
                          <span className="px-2 py-1 rounded text-xs font-medium bg-amber-500/20 text-amber-400 inline-block w-fit">
                            Pending Approval
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 text-gray-500 text-sm">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {u.email !== 'admin@igris.com' && (
                          <>
                            {/* Approve button for pending users */}
                            {!u.is_admin && u.approved === false && (
                              <button
                                onClick={() => handleApproveUser(u.id, true)}
                                className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                                title="Approve User"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            {/* Pro toggle button */}
                            {!u.is_admin && (
                              <button
                                onClick={() => handleToggleProStatus(u.id, !u.is_pro)}
                                className={`p-2 rounded-lg transition-colors ${
                                  u.is_pro 
                                    ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' 
                                    : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                                }`}
                                title={u.is_pro ? 'Remove Pro Status' : 'Make Pro User'}
                              >
                                <Zap className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleToggleUserAccess(u.id, u.is_active !== false)}
                              className={`p-2 rounded-lg transition-colors ${
                                u.is_active !== false 
                                  ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' 
                                  : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                              }`}
                              title={u.is_active !== false ? 'Revoke Access' : 'Grant Access'}
                            >
                              {u.is_active !== false ? (
                                <UserX className="w-4 h-4" />
                              ) : (
                                <UserCheck className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Settings Content
  const handleProfilePictureChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result;
      setProfilePicture(base64);
      
      try {
        const token = localStorage.getItem('token');
        await fetch(`${BACKEND_URL}/api/profile/picture`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ image_data: base64 })
        });
        alert('Profile picture updated!');
      } catch (error) {
        console.error('Failed to upload profile picture:', error);
      }
    };
    reader.readAsDataURL(file);
  };

  const saveProfileSettings = async () => {
    if (!profileName.trim()) {
      alert('Please enter a name');
      return;
    }
    setProfileSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: profileName })
      });
      if (response.ok) {
        // Update local storage
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        userData.name = profileName;
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        alert('Profile saved successfully!');
      } else {
        alert('Failed to save profile');
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('Failed to save profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const updateSecuritySetting = async (key, value) => {
    setSecuritySettings(prev => ({ ...prev, [key]: value }));
    try {
      const token = localStorage.getItem('token');
      await fetch(`${BACKEND_URL}/api/profile/security`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ [key]: value })
      });
    } catch (error) {
      console.error('Failed to update security setting:', error);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.new !== passwordData.confirm) {
      alert('Passwords do not match');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/profile/security`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          current_password: passwordData.current,
          new_password: passwordData.new
        })
      });
      if (response.ok) {
        setShowPasswordModal(false);
        setPasswordData({ current: '', new: '', confirm: '' });
        alert('Password updated successfully');
      } else {
        const data = await response.json();
        alert(data.detail || 'Failed to update password');
      }
    } catch (error) {
      console.error('Failed to change password:', error);
    }
  };

  const SettingsContent = () => (
    <div className="space-y-6">
      {/* Profile Picture Section */}
      <div className={`rounded-2xl border p-4 lg:p-6 ${isDark ? 'bg-[#12121a]/60 border-white/5' : 'bg-white border-gray-200'}`}>
        <h2 className={`text-lg font-semibold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          <Camera className="w-5 h-5" />
          Profile Picture
        </h2>
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-[#FFA500] to-amber-600 flex items-center justify-center">
              {profilePicture ? (
                <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-3xl font-bold">{user?.name?.charAt(0) || 'U'}</span>
              )}
            </div>
            <button
              onClick={() => profilePicRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#FFA500] hover:bg-[#FF8C00] flex items-center justify-center text-white shadow-lg transition-colors"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              ref={profilePicRef}
              type="file"
              accept="image/*"
              onChange={handleProfilePictureChange}
              className="hidden"
            />
          </div>
          <div>
            <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{user?.name}</p>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{user?.email}</p>
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              {user?.is_admin ? 'Administrator' : 'Trader'}
            </p>
          </div>
        </div>
      </div>

      {/* Profile Settings */}
      <div className={`rounded-2xl border p-4 lg:p-6 ${isDark ? 'bg-[#12121a]/60 border-white/5' : 'bg-white border-gray-200'}`}>
        <h2 className={`text-lg font-semibold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          <User className="w-5 h-5" />
          Profile Settings
        </h2>
        <div className="space-y-4 max-w-lg">
          <div>
            <label className={`text-sm block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Full Name</label>
            <input 
              type="text" 
              value={profileName || user?.name || ''}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Enter your name"
              className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:border-[#FFA500]/50 ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
            />
          </div>
          <div>
            <label className={`text-sm block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Email</label>
            <input 
              type="email" 
              defaultValue={user?.email} 
              disabled
              className={`w-full px-4 py-3 rounded-xl border cursor-not-allowed opacity-50 ${isDark ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-500'}`}
            />
          </div>
          <button 
            onClick={saveProfileSettings}
            disabled={profileSaving}
            className="px-4 py-2 bg-[#FFA500] text-white rounded-lg hover:bg-[#FF8C00] disabled:opacity-50 flex items-center gap-2"
          >
            {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {profileSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Security Settings */}
      <div className={`rounded-2xl border p-4 lg:p-6 ${isDark ? 'bg-[#12121a]/60 border-white/5' : 'bg-white border-gray-200'}`}>
        <h2 className={`text-lg font-semibold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          <Shield className="w-5 h-5" />
          Security Settings
        </h2>
        <div className="space-y-4">
          <div className={`flex items-center justify-between p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
            <div>
              <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Two-Factor Authentication</p>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Add an extra layer of security</p>
            </div>
            <button
              onClick={() => updateSecuritySetting('two_factor_enabled', !securitySettings.two_factor_enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                securitySettings.two_factor_enabled ? 'bg-[#FFA500]' : isDark ? 'bg-gray-600' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                securitySettings.two_factor_enabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
          
          <div className={`flex items-center justify-between p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
            <div>
              <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Login Notifications</p>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Get notified on new login attempts</p>
            </div>
            <button
              onClick={() => updateSecuritySetting('login_notifications', !securitySettings.login_notifications)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                securitySettings.login_notifications ? 'bg-[#FFA500]' : isDark ? 'bg-gray-600' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                securitySettings.login_notifications ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <div className={`flex items-center justify-between p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
            <div>
              <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Trade Notifications</p>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Get notified on trade executions</p>
            </div>
            <button
              onClick={() => updateSecuritySetting('trade_notifications', !securitySettings.trade_notifications)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                securitySettings.trade_notifications ? 'bg-[#FFA500]' : isDark ? 'bg-gray-600' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                securitySettings.trade_notifications ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>
      </div>

      {/* Account Actions */}
      <div className={`rounded-2xl border p-4 lg:p-6 ${isDark ? 'bg-[#12121a]/60 border-white/5' : 'bg-white border-gray-200'}`}>
        <h2 className={`text-lg font-semibold mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          <Lock className="w-5 h-5" />
          Account Actions
        </h2>
        <div className="space-y-3 max-w-lg">
          <button 
            onClick={() => setShowPasswordModal(true)}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-colors ${isDark ? 'border-white/10 text-white hover:bg-white/5' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}
          >
            <Key className="w-4 h-4" />
            Change Password
          </button>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`rounded-2xl border w-full max-w-md ${isDark ? 'bg-[#12121a] border-white/10' : 'bg-white border-gray-200'}`}>
            <div className={`p-6 border-b flex items-center justify-between ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Change Password</h2>
              <button onClick={() => setShowPasswordModal(false)} className={`${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={`text-sm block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Current Password</label>
                <input 
                  type="password"
                  value={passwordData.current}
                  onChange={(e) => setPasswordData({...passwordData, current: e.target.value})}
                  className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:border-[#FFA500]/50 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                />
              </div>
              <div>
                <label className={`text-sm block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>New Password</label>
                <input 
                  type="password"
                  value={passwordData.new}
                  onChange={(e) => setPasswordData({...passwordData, new: e.target.value})}
                  className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:border-[#FFA500]/50 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                />
              </div>
              <div>
                <label className={`text-sm block mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Confirm Password</label>
                <input 
                  type="password"
                  value={passwordData.confirm}
                  onChange={(e) => setPasswordData({...passwordData, confirm: e.target.value})}
                  className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:border-[#FFA500]/50 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                />
              </div>
              <button 
                onClick={handlePasswordChange}
                className="w-full px-4 py-3 bg-[#FFA500] text-white rounded-xl hover:bg-[#FF8C00] transition-colors flex items-center justify-center gap-2"
              >
                <Key className="w-4 h-4" />
                Update Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // MT5 Account Content with background GIF
  const MT5Content = () => (
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
              onClick={() => { fetchMT5Accounts(); refreshBalance(); }}
              disabled={balanceRefreshing}
              className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white' : 'bg-white hover:bg-gray-100 text-gray-500 hover:text-gray-700'}`}
              title="Refresh balance and accounts"
            >
              <RefreshCw className={`w-5 h-5 ${balanceRefreshing ? 'animate-spin' : ''}`} />
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
              <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <History className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Trade History</h3>
                <p className="text-gray-400 text-sm">Your recent trading activity</p>
              </div>
            </div>
            <button
              onClick={() => mt5Accounts.length > 0 && fetchTradeHistory(mt5Accounts[0].metaapi_account_id)}
              disabled={tradeHistoryLoading}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
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
                  className="bg-[#0F0F0F] rounded-xl border border-white/5 p-4 hover:border-white/10 transition-colors"
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
                        <p className="text-white font-semibold">{trade.symbol}</p>
                        <p className={`text-xs font-medium ${
                          trade.type?.toLowerCase().includes('buy') 
                            ? 'text-emerald-400' 
                            : 'text-red-400'
                        }`}>
                          {trade.type?.toUpperCase() || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      trade.profit >= 0 
                        ? 'bg-emerald-500/20 text-emerald-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {trade.profit >= 0 ? '+' : ''}{trade.profit?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-gray-500">Volume</p>
                      <p className="text-white">{trade.volume || '0.00'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Entry Price</p>
                      <p className="text-white">{trade.open_price?.toFixed(5) || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Close Price</p>
                      <p className="text-white">{trade.close_price?.toFixed(5) || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Swap</p>
                      <p className="text-white">{trade.swap?.toFixed(2) || '0.00'}</p>
                    </div>
                  </div>
                  
                  {trade.close_time && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <p className="text-gray-500 text-xs">
                        Closed: {new Date(trade.close_time).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-1">No trade history found</p>
              <p className="text-gray-500 text-sm">Your completed trades will appear here</p>
            </div>
          )}
        </div>
        </>
      )}

      {/* Connected Accounts */}
      {mt5Accounts.length > 0 && (
        <div className={`rounded-2xl border p-6 backdrop-blur-sm ${isDark ? 'bg-[#12121a]/60 border-white/5' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Connected Accounts</h3>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-600'}`}>
                Copy Trading Active
              </span>
            </div>
          </div>
          <div className="space-y-3">
            {mt5Accounts.map((account, index) => (
              <div key={index} className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{account.account_name}</p>
                      <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{account.server_name} - #{account.mt5_login}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDisconnectMT5(account.metaapi_account_id);
                      }}
                      className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400' : 'bg-red-100 hover:bg-red-200 text-red-500'}`}
                      title="Disconnect account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Subscriber Status */}
                <div className={`mt-3 pt-3 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Status</p>
                      <p className="text-emerald-400 text-sm font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                        {account.is_subscriber ? 'Subscriber' : 'Connected'}
                      </p>
                    </div>
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Copy Trading</p>
                      <p className={`text-sm font-medium ${account.is_subscriber ? 'text-emerald-400' : isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                        {account.is_subscriber ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Lot Size</p>
                      <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{userLotSize}</p>
                    </div>
                    <div className={`p-2 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                      <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Connected</p>
                      <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {account.created_at ? new Date(account.created_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Activate Copy Trading Button - shown when not subscribed */}
                {!account.is_subscriber && (
                  <div className={`mt-3 p-3 rounded-lg ${isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className={`text-sm font-medium ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>Copy Trading Not Active</p>
                          <p className={`text-xs mt-1 ${isDark ? 'text-amber-400/70' : 'text-amber-600/70'}`}>
                            Click to activate automatic trade copying from the master strategy
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            const token = localStorage.getItem('token');
                            const response = await fetch(`${BACKEND_URL}/api/metaapi/copyfactory/resubscribe`, {
                              method: 'POST',
                              headers: { 'Authorization': `Bearer ${token}` }
                            });
                            const data = await response.json();
                            console.log('Resubscribe response:', response.status, data);
                            if (response.ok && data.success) {
                              alert('✅ Copy Trading activated successfully!');
                              fetchMT5Accounts();
                            } else {
                              const errorMsg = data.detail || data.error || data.message || JSON.stringify(data);
                              alert(`❌ Failed to activate: ${errorMsg}`);
                            }
                          } catch (error) {
                            console.error('Activation error:', error);
                            alert(`❌ Failed to activate copy trading: ${error.message || 'Network error'}`);
                          }
                        }}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${isDark ? 'bg-amber-500 hover:bg-amber-600 text-black' : 'bg-amber-500 hover:bg-amber-600 text-white'}`}
                      >
                        Activate
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Copy Trading Info */}
                {account.is_subscriber && (
                  <div className={`mt-3 p-3 rounded-lg ${isDark ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200'}`}>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className={`text-sm font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Auto Copy Trading Enabled</p>
                        <p className={`text-xs mt-1 ${isDark ? 'text-emerald-400/70' : 'text-emerald-600/70'}`}>
                          Trades from master strategy will be automatically copied to your account with lot size {userLotSize}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connect New Account - Only show if no account connected */}
      {mt5Accounts.length === 0 && (
        showMT5Connect ? (
          <MT5ConnectForm 
            onConnect={handleMT5Connect}
            onCancel={() => setShowMT5Connect(false)}
          />
        ) : (
          <div className="bg-[#12121a]/60 rounded-2xl border border-white/5 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold text-lg">Connect MT5 Account</h3>
                <p className="text-gray-400 text-sm">Link your MetaTrader 5 account securely</p>
              </div>
              <button
                onClick={() => setShowMT5Connect(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FFA500] hover:bg-[#FF8C00] text-white font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Connect Account
              </button>
            </div>
            
            {!metaApiConfigured && (
              <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-amber-400 text-sm">
                  <strong>Note:</strong> MT5 connection is not configured. Please contact admin to enable this feature.
                </p>
              </div>
            )}
          </div>
        )
      )}

      {/* Show info if account already connected */}
      {mt5Accounts.length > 0 && (
        <div className="bg-[#12121a]/60 rounded-2xl border border-white/5 p-4">
          <p className="text-gray-400 text-sm text-center">
            You can only have one MT5 account connected. Disconnect the current account to connect a different one.
          </p>
        </div>
      )}
    </div>
  );

  // Chart Content with TradingView and IGRIS Chat
  const ChartContent = () => {
    const [chatOpen, setChatOpen] = useState(false);
    const [messages, setMessages] = useState([
      { role: 'assistant', content: "Hello! I'm IGRIS, your AI trading assistant. Ask me about the chart, market analysis, or upload a chart image for analysis!" }
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const chatEndRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
      if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, [messages]);

    const handleImageSelect = (e) => {
      const file = e.target.files[0];
      if (file) {
        if (!file.type.startsWith('image/')) {
          alert('Please select an image file');
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          alert('Image size must be less than 5MB');
          return;
        }
        
        const reader = new FileReader();
        reader.onloadend = () => {
          setSelectedImage(reader.result);
          setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
      }
    };

    const removeImage = () => {
      setSelectedImage(null);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    const handleSendMessage = async () => {
      if ((!inputMessage.trim() && !selectedImage) || isLoading) return;
      
      const userMessage = inputMessage;
      const userImage = selectedImage;
      
      const newUserMessage = { 
        role: 'user', 
        content: userMessage || 'Analyze this chart',
        image: userImage
      };
      setMessages(prev => [...prev, newUserMessage]);
      setInputMessage('');
      setSelectedImage(null);
      setImagePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setIsLoading(true);
      
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BACKEND_URL}/api/settings/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            message: userMessage || 'Please analyze this trading chart image.',
            image: userImage || null
          })
        });

        const data = await response.json();
        
        if (response.ok) {
          setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
        } else {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: data.detail || "I'm sorry, I encountered an error. Please try again." 
          }]);
        }
      } catch (error) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: "I'm having trouble connecting. Please check your internet connection and try again." 
        }]);
      } finally {
        setIsLoading(false);
      }
    };

    return (
      <div className="space-y-6">
        {/* TradingView Chart - Full height */}
        <div className="bg-[#0F0F0F] rounded-2xl border border-white/5 overflow-hidden" style={{ height: '600px', minHeight: '500px' }}>
          <TradingViewWidget />
        </div>

        {/* IGRIS Chat */}
        <div className="bg-gradient-to-r from-[#FFA500]/20 to-amber-600/20 rounded-2xl border border-[#FFA500]/20 p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#FFA500]/20 flex items-center justify-center">
                <Bot className="w-6 h-6 text-[#FFA500]" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">Chat with IGRIS</h3>
                <p className="text-gray-400 text-sm">Ask questions or upload charts for AI analysis</p>
              </div>
            </div>
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FFA500] hover:bg-[#FF8C00] text-white font-medium transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              {chatOpen ? 'Close Chat' : 'Open Chat'}
            </button>
          </div>

          {chatOpen && (
            <div className="mt-4 bg-[#0a0a0f] rounded-xl border border-white/10 overflow-hidden">
              <div className="h-80 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-xl ${
                      msg.role === 'user' 
                        ? 'bg-[#FFA500] text-white' 
                        : 'bg-white/10 text-gray-200'
                    }`}>
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-2 mb-1">
                          <Bot className="w-4 h-4 text-[#FFA500]" />
                          <span className="text-[#FFA500] text-xs font-medium">IGRIS</span>
                        </div>
                      )}
                      {msg.image && (
                        <img 
                          src={msg.image} 
                          alt="Uploaded" 
                          className="max-w-full h-auto rounded-lg mb-2 max-h-40 object-contain"
                        />
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white/10 text-gray-200 p-3 rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <Bot className="w-4 h-4 text-[#FFA500]" />
                        <span className="text-[#FFA500] text-xs font-medium">IGRIS</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-[#FFA500] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-[#FFA500] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-[#FFA500] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              
              {imagePreview && (
                <div className="px-4 py-2 border-t border-white/10 bg-white/5">
                  <div className="relative inline-block">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="h-20 w-auto rounded-lg object-contain"
                    />
                    <button
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-xs"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
              
              <div className="p-4 border-t border-white/10">
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                    title="Upload chart image"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={selectedImage ? "Add a message about the chart..." : "Ask IGRIS about the chart..."}
                    disabled={isLoading}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#FFA500]/50 disabled:opacity-50"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isLoading || (!inputMessage.trim() && !selectedImage)}
                    className="p-2 rounded-lg bg-[#FFA500] hover:bg-[#FF8C00] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-gray-500 text-xs mt-2">
                  Upload trading charts for AI analysis or ask questions about the market
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Wallet Content
  const WalletContent = () => (
    <div className="space-y-6">
      {/* Admin Controls */}
      {user?.is_admin && (
        <div className="bg-[#12121a]/60 rounded-2xl border border-white/5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold text-lg">Wallet Feature Control</h3>
              <p className="text-gray-400 text-sm">Enable or disable wallet for all users</p>
            </div>
            <button
              onClick={() => toggleWalletFeature(!walletEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                walletEnabled ? 'bg-[#FFA500]' : 'bg-gray-600'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                walletEnabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>
      )}

      {!walletEnabled && !user?.is_admin ? (
        <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/10 rounded-2xl border border-purple-500/20 p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-6">
            <Wallet className="w-10 h-10 text-purple-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Wallet Integration</h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            The wallet feature is currently disabled by the administrator.
          </p>
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300">
            <Clock className="w-5 h-5" />
            <span className="font-medium">Coming Soon</span>
          </div>
        </div>
      ) : !walletConnected ? (
        <div className="wallet-glass p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-violet-500/20 flex items-center justify-center mx-auto mb-6">
            <Wallet className="w-10 h-10 text-violet-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Connect your crypto wallet to view balances and manage your assets directly from IGRIS.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto mb-6">
            <button
              onClick={connectWallet}
              disabled={walletLoading}
              className="btn-glass btn-glass-primary flex items-center justify-center gap-2"
            >
              <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" className="w-5 h-5" />
              MetaMask
            </button>
            <button
              disabled
              className="btn-glass btn-glass-secondary opacity-50 cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span className="text-blue-400">W</span>
              WalletConnect
            </button>
            <button
              disabled
              className="btn-glass btn-glass-secondary opacity-50 cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span className="text-blue-500">C</span>
              Coinbase
            </button>
          </div>
          
          <p className="text-gray-500 text-sm">
            More wallet options coming soon
          </p>
        </div>
      ) : (
        <>
          {/* Connected Wallet Info */}
          <div className="wallet-glass p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Connected Wallet</h3>
                  <p className="text-gray-400 text-sm font-mono">
                    {walletData?.address?.slice(0, 6)}...{walletData?.address?.slice(-4)}
                  </p>
                </div>
              </div>
              <button
                onClick={disconnectWallet}
                className="btn-glass btn-glass-danger btn-glass-sm"
              >
                Disconnect
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-sm mb-1">Network</p>
                <p className="text-white font-semibold capitalize">{walletData?.chain || 'Ethereum'}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-sm mb-1">Type</p>
                <p className="text-white font-semibold capitalize">{walletData?.wallet_type || 'MetaMask'}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-sm mb-1">Status</p>
                <p className="text-emerald-400 font-semibold">Connected</p>
              </div>
              <div className="bg-white/5 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-sm mb-1">Connected</p>
                <p className="text-white font-semibold text-sm">
                  {walletData?.connected_at ? new Date(walletData.connected_at).toLocaleDateString() : 'Today'}
                </p>
              </div>
            </div>
          </div>

          {/* Token Balances */}
          <div className="bg-[#12121a]/60 rounded-2xl border border-white/5 p-6">
            <h3 className="text-white font-semibold text-lg mb-4">Token Balances</h3>
            <p className="text-gray-400 text-sm mb-4">
              Connect to a blockchain to view your real-time token balances.
            </p>
            <div className="text-center py-8">
              <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">Balance data loading from blockchain...</p>
            </div>
          </div>

          {/* Transaction History */}
          <div className="bg-[#12121a]/60 rounded-2xl border border-white/5 p-6">
            <h3 className="text-white font-semibold text-lg mb-4">Transaction History</h3>
            <div className="text-center py-8">
              <History className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">No transactions to display</p>
            </div>
          </div>
        </>
      )}
    </div>
  );

  // EA Signals Content Component
  // EA Signals Content - Using extracted component
  const EASignalsContentWrapper = () => (
    <EASignalsContent 
      user={user}
      eaSignals={eaSignals}
      eaSignalsLoading={eaSignalsLoading}
      deletingSignalId={deletingSignalId}
      handleEASignalsRefresh={handleEASignalsRefresh}
      deleteEASignal={deleteEASignal}
      globalRiskScore={globalRiskScore}
    />
  );

  // Support & FAQ Content
  const SupportContent = () => {
    const faqs = [
      { question: "How do I connect my MT5 account?", answer: "Go to MT5 section, click 'Connect Account', and enter your credentials." },
      { question: "How do EA signals work?", answer: "Install the IGRIS EA on MT5. It sends signals automatically to your dashboard." },
      { question: "What is IGRIS AI?", answer: "Describe your strategy in plain English and IGRIS AI will help find opportunities." },
      { question: "How do I upload a chart?", answer: "Click the image icon in IGRIS AI or Chart section to upload." },
      { question: "Is my data secure?", answer: "Yes, all data is encrypted and never shared with third parties." }
    ];

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-violet-600/20 to-purple-600/20 rounded-2xl border border-violet-500/20 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Support & FAQ</h2>
              <p className="text-gray-400 text-sm">Get help and find answers</p>
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <p className="text-gray-300 mb-2">Contact admin at:</p>
            <a href="mailto:support@igris.com" className="text-[#FFA500] font-semibold">support@igris.com</a>
          </div>
        </div>
        <div className="bg-[#12121a]/60 rounded-2xl border border-white/5 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">FAQ</h3>
          {faqs.map((faq, i) => (
            <div key={i} className="border border-white/5 rounded-xl mb-2">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between p-4 text-left">
                <span className="text-white">{faq.question}</span>
                <ChevronRight className={`w-5 h-5 text-gray-400 ${openFaq === i ? 'rotate-90' : ''}`} />
              </button>
              {openFaq === i && <p className="px-4 pb-4 text-gray-400">{faq.answer}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Email Settings Content (Admin)

  const EmailSettingsContent = () => {
    const [emailLogs, setEmailLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(false);

    const fetchEmailLogs = async () => {
      setLogsLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BACKEND_URL}/api/admin/email-logs`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setEmailLogs(data.logs || []);
        }
      } catch (error) {
        console.error('Failed to fetch email logs:', error);
      } finally {
        setLogsLoading(false);
      }
    };

    useEffect(() => {
      fetchEmailLogs();
    }, []);

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 rounded-2xl border border-blue-500/20 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Mail className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Email Settings</h2>
              <p className="text-gray-400 text-sm">Manage templates and test deliverability</p>
            </div>
          </div>
        </div>
        <div className="bg-[#12121a]/60 rounded-2xl border border-white/5 p-6">
          <h3 className="text-white font-semibold mb-4">Admin Email</h3>
          <div className="flex gap-3">
            <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@example.com" className="flex-1 glass-input px-4 py-2 text-white" />
            <button 
              onClick={saveAdminEmail}
              disabled={adminEmailSaving}
              className="btn-glass btn-glass-primary btn-glass-sm flex items-center gap-2"
            >
              {adminEmailSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>
        <div className="bg-[#12121a]/60 rounded-2xl border border-white/5 p-6">
          <h3 className="text-white font-semibold mb-4">Test Email Deliverability</h3>
          <p className="text-gray-400 text-sm mb-4">
            Send a test email using SMTP. If SMTP is not configured, emails will be logged to the database for testing purposes.
          </p>
          <button 
            onClick={async () => {
              await sendTestEmail();
              // Refresh logs after sending test email
              setTimeout(fetchEmailLogs, 1000);
            }}
            disabled={testEmailSending} 
            className="btn-glass btn-glass-success btn-glass-sm flex items-center gap-2"
          >
            {testEmailSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send Test Email
          </button>
        </div>
        
        {/* Email Logs Section */}
        <div className="bg-[#12121a]/60 rounded-2xl border border-white/5 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Email Logs (Testing)</h3>
            <button 
              onClick={fetchEmailLogs}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${logsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <p className="text-gray-500 text-xs mb-4">
            When SMTP is not configured, test emails are logged here instead of being sent.
          </p>
          {emailLogs.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="w-10 h-10 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No email logs yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {emailLogs.map((log, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium text-sm">{log.subject}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${log.status === 'sent' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {log.status === 'sent' ? 'Sent' : 'Logged'}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs">To: {log.to_email}</p>
                  <p className="text-gray-500 text-xs">{log.sent_at ? new Date(log.sent_at).toLocaleString() : 'N/A'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // System Status Content (Admin)

  const SystemStatusContent = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-600/20 to-green-600/20 rounded-2xl border border-emerald-500/20 p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <Server className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">System Status</h2>
            <p className="text-gray-400 text-sm">Monitor cron jobs and health</p>
          </div>
        </div>
      </div>
      <div className="bg-[#12121a]/60 rounded-2xl border border-white/5 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">Cron Scheduler</h3>
          <div className={`px-3 py-1 rounded-full ${cronStatus.running ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
            {cronStatus.running ? 'Running' : 'Stopped'}
          </div>
        </div>
        {cronStatus.jobs?.map((job, i) => (
          <div key={i} className="p-3 rounded-xl bg-white/5 mb-2 flex justify-between">
            <span className="text-white">{job.name || job.id}</span>
            <span className="text-gray-400 text-sm">{job.next_run ? new Date(job.next_run).toLocaleString() : 'N/A'}</span>
          </div>
        ))}
      </div>
    </div>
  );

  // Email Templates Content (Admin)
  const EmailTemplatesContent = () => {
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [templateHtml, setTemplateHtml] = useState('');
    const [templateEnabled, setTemplateEnabled] = useState(true);
    const [savingTemplate, setSavingTemplate] = useState(false);
    const [smtpConfig, setSmtpConfig] = useState(null);
    const [smtpHost, setSmtpHost] = useState('');
    const [smtpPort, setSmtpPort] = useState('587');
    const [smtpUser, setSmtpUser] = useState('');
    const [smtpPassword, setSmtpPassword] = useState('');
    const [smtpSenderEmail, setSmtpSenderEmail] = useState('');
    const [smtpSenderName, setSmtpSenderName] = useState('IGRIS Trading');
    const [smtpUseTls, setSmtpUseTls] = useState(true);
    const [savingConfig, setSavingConfig] = useState(false);
    const [testingConnection, setTestingConnection] = useState(false);

    useEffect(() => {
      fetchSmtpConfig();
    }, []);

    const fetchSmtpConfig = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BACKEND_URL}/api/email-templates/config/smtp`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setSmtpConfig(data.config);
          if (data.config) {
            setSmtpHost(data.config.host || '');
            setSmtpPort(data.config.port?.toString() || '587');
            setSmtpUser(data.config.user || '');
            setSmtpSenderEmail(data.config.sender_email || '');
            setSmtpSenderName(data.config.sender_name || 'IGRIS Trading');
            setSmtpUseTls(data.config.use_tls !== false);
          }
        }
      } catch (error) {
        console.error('Failed to fetch SMTP config:', error);
      }
    };

    const saveSmtpConfig = async () => {
      if (!smtpHost || !smtpUser || !smtpPassword || !smtpSenderEmail) {
        alert('Please fill in all required SMTP fields');
        return;
      }
      setSavingConfig(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BACKEND_URL}/api/email-templates/config/smtp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            host: smtpHost,
            port: parseInt(smtpPort),
            user: smtpUser,
            password: smtpPassword,
            sender_email: smtpSenderEmail,
            sender_name: smtpSenderName,
            use_tls: smtpUseTls
          })
        });
        if (response.ok) {
          alert('SMTP configuration saved!');
          setSmtpPassword('');
          fetchSmtpConfig();
        } else {
          const data = await response.json();
          alert(data.detail || 'Failed to save configuration');
        }
      } catch (error) {
        console.error('Failed to save SMTP config:', error);
        alert('Failed to save configuration');
      } finally {
        setSavingConfig(false);
      }
    };

    const testSmtpConnection = async () => {
      setTestingConnection(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BACKEND_URL}/api/email-templates/config/smtp/test`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        alert(data.message || (data.success ? 'Connection successful!' : 'Connection failed'));
      } catch (error) {
        console.error('Failed to test connection:', error);
        alert('Failed to test connection');
      } finally {
        setTestingConnection(false);
      }
    };

    const saveTemplate = async () => {
      if (!selectedTemplate) return;
      setSavingTemplate(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BACKEND_URL}/api/email-templates/${selectedTemplate.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            html_content: templateHtml,
            enabled: templateEnabled
          })
        });
        if (response.ok) {
          alert('Template saved!');
          fetchEmailTemplates();
        }
      } catch (error) {
        console.error('Failed to save template:', error);
      } finally {
        setSavingTemplate(false);
      }
    };

    const sendTestEmail = async (templateId) => {
      const recipient = prompt('Enter email address for test:');
      if (!recipient) return;
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BACKEND_URL}/api/email-templates/test`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            template_id: templateId,
            recipient_email: recipient
          })
        });
        const data = await response.json();
        alert(data.message || 'Test email sent!');
      } catch (error) {
        console.error('Failed to send test:', error);
        alert('Failed to send test email');
      }
    };

    return (
      <div className="space-y-6">
        {/* SMTP Configuration */}
        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-[#12121a]/60 border-white/5' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-4">
            <Mail className="w-6 h-6 text-violet-400" />
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>SMTP Email Configuration</h3>
          </div>
          <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Configure SMTP settings to send email notifications. Select a provider below for quick setup.
          </p>
          
          {/* Quick Provider Select */}
          <div className="mb-6">
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Quick Provider Setup</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setSmtpHost('smtp.gmail.com');
                  setSmtpPort('587');
                  setSmtpUseTls(true);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  smtpHost === 'smtp.gmail.com' 
                    ? 'bg-red-500 text-white' 
                    : isDark ? 'bg-white/10 text-gray-300 hover:bg-white/20' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📧 Gmail
              </button>
              <button
                onClick={() => {
                  setSmtpHost('smtp.sendgrid.net');
                  setSmtpPort('587');
                  setSmtpUseTls(true);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  smtpHost === 'smtp.sendgrid.net' 
                    ? 'bg-blue-500 text-white' 
                    : isDark ? 'bg-white/10 text-gray-300 hover:bg-white/20' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📤 SendGrid
              </button>
              <button
                onClick={() => {
                  setSmtpHost('smtp.office365.com');
                  setSmtpPort('587');
                  setSmtpUseTls(true);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  smtpHost === 'smtp.office365.com' 
                    ? 'bg-blue-600 text-white' 
                    : isDark ? 'bg-white/10 text-gray-300 hover:bg-white/20' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                📬 Outlook/Office365
              </button>
              <button
                onClick={() => {
                  setSmtpHost('smtp.mailgun.org');
                  setSmtpPort('587');
                  setSmtpUseTls(true);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  smtpHost === 'smtp.mailgun.org' 
                    ? 'bg-orange-500 text-white' 
                    : isDark ? 'bg-white/10 text-gray-300 hover:bg-white/20' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🔫 Mailgun
              </button>
              <button
                onClick={() => {
                  setSmtpHost('');
                  setSmtpPort('587');
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  smtpHost && !['smtp.gmail.com', 'smtp.sendgrid.net', 'smtp.office365.com', 'smtp.mailgun.org'].includes(smtpHost)
                    ? 'bg-violet-500 text-white' 
                    : isDark ? 'bg-white/10 text-gray-300 hover:bg-white/20' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                ⚙️ Custom
              </button>
            </div>
            <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              {smtpHost === 'smtp.gmail.com' && '💡 Gmail requires an App Password. Go to Google Account → Security → 2-Step Verification → App Passwords.'}
              {smtpHost === 'smtp.sendgrid.net' && '💡 SendGrid requires an API Key as the password. Create one at sendgrid.com/api-keys'}
              {smtpHost === 'smtp.office365.com' && '💡 Use your full email as username and account password.'}
              {smtpHost === 'smtp.mailgun.org' && '💡 Get SMTP credentials from your Mailgun domain settings.'}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={`block text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>SMTP Host *</label>
              <input
                type="text"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.gmail.com"
                className={`w-full px-3 py-2 rounded-lg ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} border`}
              />
            </div>
            <div>
              <label className={`block text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>SMTP Port *</label>
              <input
                type="number"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                placeholder="587"
                className={`w-full px-3 py-2 rounded-lg ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} border`}
              />
            </div>
            <div>
              <label className={`block text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>SMTP Username *</label>
              <input
                type="text"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder="your-email@gmail.com"
                className={`w-full px-3 py-2 rounded-lg ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} border`}
              />
            </div>
            <div>
              <label className={`block text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>SMTP Password *</label>
              <input
                type="password"
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                placeholder="Enter password or app password"
                className={`w-full px-3 py-2 rounded-lg ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} border`}
              />
            </div>
            <div>
              <label className={`block text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Sender Email *</label>
              <input
                type="email"
                value={smtpSenderEmail}
                onChange={(e) => setSmtpSenderEmail(e.target.value)}
                placeholder="noreply@yourdomain.com"
                className={`w-full px-3 py-2 rounded-lg ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} border`}
              />
            </div>
            <div>
              <label className={`block text-sm mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Sender Name</label>
              <input
                type="text"
                value={smtpSenderName}
                onChange={(e) => setSmtpSenderName(e.target.value)}
                placeholder="IGRIS Trading"
                className={`w-full px-3 py-2 rounded-lg ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} border`}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2 mb-4">
            <input
              type="checkbox"
              id="smtpTls"
              checked={smtpUseTls}
              onChange={(e) => setSmtpUseTls(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="smtpTls" className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Use TLS (recommended for port 587)
            </label>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={saveSmtpConfig}
              disabled={savingConfig}
              className="px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 disabled:opacity-50 flex items-center gap-2"
            >
              {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save SMTP Settings
            </button>
            <button
              onClick={testSmtpConnection}
              disabled={testingConnection || !smtpConfig?.is_configured}
              className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-2"
            >
              {testingConnection ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Test Connection
            </button>
            {smtpConfig?.is_configured && (
              <span className={`text-sm ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                ✓ SMTP configured ({smtpConfig.host})
              </span>
            )}
          </div>
          
          <div className={`mt-4 p-3 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              <strong>Gmail:</strong> smtp.gmail.com:587 (use App Password)<br/>
              <strong>Outlook:</strong> smtp.office365.com:587<br/>
              <strong>SendGrid:</strong> smtp.sendgrid.net:587
            </p>
          </div>
        </div>

        {/* Templates List */}
        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-[#12121a]/60 border-white/5' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Email Templates ({emailTemplates.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {emailTemplates.map((template) => (
              <div
                key={template.id}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedTemplate?.id === template.id 
                    ? 'border-violet-500 bg-violet-500/10' 
                    : isDark ? 'border-white/5 bg-white/5 hover:bg-white/10' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => {
                  setSelectedTemplate(template);
                  setTemplateHtml(template.html_content || '');
                  setTemplateEnabled(template.enabled !== false);
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{template.name}</span>
                  <span className={`px-2 py-0.5 rounded text-xs ${template.enabled !== false ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
                    {template.enabled !== false ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{template.description}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); sendTestEmail(template.id); }}
                  className="mt-2 text-sm text-violet-400 hover:text-violet-300"
                >
                  Send Test →
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Template Editor */}
        {selectedTemplate && (
          <div className={`rounded-2xl border p-6 ${isDark ? 'bg-[#12121a]/60 border-white/5' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Edit: {selectedTemplate.name}</h3>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={templateEnabled}
                  onChange={(e) => setTemplateEnabled(e.target.checked)}
                  className="rounded"
                />
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Enabled</span>
              </label>
            </div>
            <div className="mb-4">
              <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Variables: {selectedTemplate.variables?.map(v => `{{${v}}}`).join(', ')}
              </p>
            </div>
            <textarea
              value={templateHtml}
              onChange={(e) => setTemplateHtml(e.target.value)}
              rows={15}
              className={`w-full px-4 py-3 rounded-lg font-mono text-sm ${isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'} border`}
              placeholder="Enter HTML template..."
            />
            <button
              onClick={saveTemplate}
              disabled={savingTemplate}
              className="mt-4 px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 disabled:opacity-50 flex items-center gap-2"
            >
              {savingTemplate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Template
            </button>
          </div>
        )}
      </div>
    );
  };

  // Plans & Payments Content (Admin)
  const PlansPaymentsContent = () => {
    const [editingPlan, setEditingPlan] = useState(null);
    const [showAddPlan, setShowAddPlan] = useState(false);
    const [savingPlan, setSavingPlan] = useState(false);
    const [newPlan, setNewPlan] = useState({
      name: '',
      price: 0,
      currency: 'USD',
      interval: 'month',
      description: '',
      features: [''],
      is_active: true,
      popular: false
    });
    const [showPaymentSettings, setShowPaymentSettings] = useState(false);
    const [localPaymentSettings, setLocalPaymentSettings] = useState({
      stripe_enabled: false,
      paypal_enabled: false,
      razorpay_enabled: false,
      manual_enabled: false,
      manual_bank_name: '',
      manual_account_number: '',
      manual_account_name: '',
      manual_instructions: ''
    });

    useEffect(() => {
      if (paymentSettings) {
        setLocalPaymentSettings({...localPaymentSettings, ...paymentSettings});
      }
    }, [paymentSettings]);

    const handleEditPlan = (plan) => {
      setEditingPlan({
        ...plan,
        features: plan.features || ['']
      });
      setShowAddPlan(false);
    };

    const handleAddFeature = (isEditing = false) => {
      if (isEditing && editingPlan) {
        setEditingPlan({
          ...editingPlan,
          features: [...(editingPlan.features || []), '']
        });
      } else {
        setNewPlan({
          ...newPlan,
          features: [...(newPlan.features || []), '']
        });
      }
    };

    const handleFeatureChange = (index, value, isEditing = false) => {
      if (isEditing && editingPlan) {
        const newFeatures = [...editingPlan.features];
        newFeatures[index] = value;
        setEditingPlan({ ...editingPlan, features: newFeatures });
      } else {
        const newFeatures = [...newPlan.features];
        newFeatures[index] = value;
        setNewPlan({ ...newPlan, features: newFeatures });
      }
    };

    const handleRemoveFeature = (index, isEditing = false) => {
      if (isEditing && editingPlan) {
        const newFeatures = editingPlan.features.filter((_, i) => i !== index);
        setEditingPlan({ ...editingPlan, features: newFeatures.length ? newFeatures : [''] });
      } else {
        const newFeatures = newPlan.features.filter((_, i) => i !== index);
        setNewPlan({ ...newPlan, features: newFeatures.length ? newFeatures : [''] });
      }
    };

    const savePlan = async (planData, isNew = false) => {
      setSavingPlan(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BACKEND_URL}/api/subscriptions/admin/plans`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            ...planData,
            id: isNew ? null : planData.id,
            features: planData.features.filter(f => f.trim() !== '')
          })
        });

        if (response.ok) {
          alert(isNew ? 'Plan created successfully!' : 'Plan updated successfully!');
          setEditingPlan(null);
          setShowAddPlan(false);
          setNewPlan({
            name: '',
            price: 0,
            currency: 'USD',
            interval: 'month',
            description: '',
            features: [''],
            is_active: true,
            popular: false
          });
          fetchSubscriptionPlans();
        } else {
          const error = await response.json();
          alert(`Failed to save plan: ${error.detail || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Failed to save plan:', error);
        alert('Failed to save plan');
      }
      setSavingPlan(false);
    };

    const deletePlan = async (planId) => {
      if (!confirm('Are you sure you want to delete this plan?')) return;
      
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BACKEND_URL}/api/subscriptions/admin/plans/${planId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          alert('Plan deleted successfully!');
          fetchSubscriptionPlans();
        }
      } catch (error) {
        console.error('Failed to delete plan:', error);
      }
    };

    const togglePlanStatus = async (planId) => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BACKEND_URL}/api/subscriptions/admin/plans/${planId}/toggle`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          fetchSubscriptionPlans();
        }
      } catch (error) {
        console.error('Failed to toggle plan:', error);
      }
    };

    const savePaymentSettings = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BACKEND_URL}/api/subscriptions/admin/payment-settings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            payment_methods: [],
            ...localPaymentSettings
          })
        });
        if (response.ok) {
          alert('Payment settings saved!');
          fetchPaymentSettings();
        }
      } catch (error) {
        console.error('Failed to save:', error);
      }
    };

    const approveSubscription = async (subId, approved) => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BACKEND_URL}/api/subscriptions/admin/approve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            subscription_id: subId,
            approved: approved
          })
        });
        if (response.ok) {
          alert(approved ? 'Subscription approved!' : 'Subscription rejected');
          fetchPendingSubscriptions();
        }
      } catch (error) {
        console.error('Failed to approve:', error);
      }
    };

    return (
      <div className="space-y-6">
        {/* Pending Approvals */}
        {pendingSubscriptions.length > 0 && (
          <div className={`rounded-2xl border p-6 ${isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
              Pending Approvals ({pendingSubscriptions.length})
            </h3>
            {pendingSubscriptions.map((sub) => (
              <div key={sub.id} className={`p-4 rounded-xl mb-2 ${isDark ? 'bg-white/5' : 'bg-white'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{sub.user_name || sub.user_email}</p>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{sub.plan_name} - ${sub.price}/{sub.interval}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => approveSubscription(sub.id, true)}
                      className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => approveSubscription(sub.id, false)}
                      className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Subscription Plans */}
        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-[#12121a]/60 border-white/5' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Subscription Plans</h3>
            <button
              onClick={() => { setShowAddPlan(true); setEditingPlan(null); }}
              className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Plan
            </button>
          </div>

          {/* Add/Edit Plan Form */}
          {(showAddPlan || editingPlan) && (
            <div className={`mb-6 p-4 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
              <h4 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {editingPlan ? 'Edit Plan' : 'Create New Plan'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Plan Name</label>
                  <input
                    type="text"
                    value={editingPlan ? editingPlan.name : newPlan.name}
                    onChange={(e) => editingPlan ? setEditingPlan({...editingPlan, name: e.target.value}) : setNewPlan({...newPlan, name: e.target.value})}
                    placeholder="e.g., Pro Plan"
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingPlan ? editingPlan.price : newPlan.price}
                    onChange={(e) => editingPlan ? setEditingPlan({...editingPlan, price: parseFloat(e.target.value) || 0}) : setNewPlan({...newPlan, price: parseFloat(e.target.value) || 0})}
                    placeholder="99.00"
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Currency</label>
                  <select
                    value={editingPlan ? editingPlan.currency : newPlan.currency}
                    onChange={(e) => editingPlan ? setEditingPlan({...editingPlan, currency: e.target.value}) : setNewPlan({...newPlan, currency: e.target.value})}
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200'}`}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="NGN">NGN (₦)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="AUD">AUD (A$)</option>
                    <option value="CAD">CAD (C$)</option>
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Duration / Interval</label>
                  <select
                    value={editingPlan ? editingPlan.interval : newPlan.interval}
                    onChange={(e) => editingPlan ? setEditingPlan({...editingPlan, interval: e.target.value}) : setNewPlan({...newPlan, interval: e.target.value})}
                    className={`w-full px-3 py-2 rounded-lg border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200'}`}
                  >
                    <option value="week">Weekly</option>
                    <option value="month">Monthly</option>
                    <option value="quarter">Quarterly (3 months)</option>
                    <option value="year">Yearly</option>
                    <option value="lifetime">Lifetime</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Description</label>
                <textarea
                  value={editingPlan ? editingPlan.description || '' : newPlan.description}
                  onChange={(e) => editingPlan ? setEditingPlan({...editingPlan, description: e.target.value}) : setNewPlan({...newPlan, description: e.target.value})}
                  placeholder="Describe what this plan offers..."
                  rows={2}
                  className={`w-full px-3 py-2 rounded-lg border resize-none ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200'}`}
                />
              </div>

              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Features</label>
                <div className="space-y-2">
                  {(editingPlan ? editingPlan.features : newPlan.features).map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => handleFeatureChange(index, e.target.value, !!editingPlan)}
                        placeholder={`Feature ${index + 1}`}
                        className={`flex-1 px-3 py-2 rounded-lg border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200'}`}
                      />
                      <button
                        onClick={() => handleRemoveFeature(index, !!editingPlan)}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => handleAddFeature(!!editingPlan)}
                    className="flex items-center gap-2 text-sm text-[#FFA500] hover:text-[#FF8C00]"
                  >
                    <Plus className="w-4 h-4" /> Add Feature
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPlan ? editingPlan.is_active : newPlan.is_active}
                    onChange={(e) => editingPlan ? setEditingPlan({...editingPlan, is_active: e.target.checked}) : setNewPlan({...newPlan, is_active: e.target.checked})}
                    className="rounded"
                  />
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPlan ? editingPlan.popular : newPlan.popular}
                    onChange={(e) => editingPlan ? setEditingPlan({...editingPlan, popular: e.target.checked}) : setNewPlan({...newPlan, popular: e.target.checked})}
                    className="rounded"
                  />
                  <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Mark as Popular</span>
                </label>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => savePlan(editingPlan || newPlan, !editingPlan)}
                  disabled={savingPlan}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {savingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingPlan ? 'Update Plan' : 'Create Plan'}
                </button>
                <button
                  onClick={() => { setShowAddPlan(false); setEditingPlan(null); }}
                  className={`px-4 py-2 rounded-lg ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {subscriptionPlans.map((plan) => (
              <div key={plan.id} className={`p-4 rounded-xl border relative ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'}`}>
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  <button
                    onClick={() => handleEditPlan(plan)}
                    className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
                    title="Edit Plan"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => togglePlanStatus(plan.id)}
                    className={`p-1.5 rounded-lg transition-colors ${plan.is_active ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-gray-400 hover:bg-gray-500/10'}`}
                    title={plan.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {plan.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => deletePlan(plan.id)}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Delete Plan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{plan.name}</span>
                  {plan.popular && <span className="px-2 py-0.5 bg-violet-500 text-white text-xs rounded">Popular</span>}
                </div>
                <p className={`text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {plan.currency === 'USD' ? '$' : plan.currency === 'EUR' ? '€' : plan.currency === 'GBP' ? '£' : plan.currency === 'NGN' ? '₦' : plan.currency === 'INR' ? '₹' : plan.currency}{plan.price}
                  <span className="text-sm font-normal text-gray-400">/{plan.interval}</span>
                </p>
                {plan.description && (
                  <p className={`text-sm mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{plan.description}</p>
                )}
                <ul className="space-y-1 mb-4">
                  {plan.features?.slice(0, 4).map((f, i) => (
                    <li key={i} className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>✓ {f}</li>
                  ))}
                  {plan.features?.length > 4 && (
                    <li className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>+{plan.features.length - 4} more features</li>
                  )}
                </ul>
                <span className={`text-xs ${plan.is_active ? 'text-emerald-400' : 'text-gray-400'}`}>
                  {plan.is_active ? '● Active' : '○ Inactive'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Settings */}
        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-[#12121a]/60 border-white/5' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Payment Settings</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {['stripe', 'paypal', 'razorpay', 'manual'].map((method) => (
                <label key={method} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={localPaymentSettings[`${method}_enabled`]}
                    onChange={(e) => setLocalPaymentSettings({...localPaymentSettings, [`${method}_enabled`]: e.target.checked})}
                  />
                  <span className={`capitalize ${isDark ? 'text-white' : 'text-gray-900'}`}>{method}</span>
                </label>
              ))}
            </div>
            
            {localPaymentSettings.manual_enabled && (
              <div className={`p-4 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                <h4 className={`font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>Manual Payment Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    placeholder="Bank Name"
                    value={localPaymentSettings.manual_bank_name}
                    onChange={(e) => setLocalPaymentSettings({...localPaymentSettings, manual_bank_name: e.target.value})}
                    className={`px-3 py-2 rounded-lg ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200'} border`}
                  />
                  <input
                    placeholder="Account Number"
                    value={localPaymentSettings.manual_account_number}
                    onChange={(e) => setLocalPaymentSettings({...localPaymentSettings, manual_account_number: e.target.value})}
                    className={`px-3 py-2 rounded-lg ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200'} border`}
                  />
                  <input
                    placeholder="Account Name"
                    value={localPaymentSettings.manual_account_name}
                    onChange={(e) => setLocalPaymentSettings({...localPaymentSettings, manual_account_name: e.target.value})}
                    className={`px-3 py-2 rounded-lg ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200'} border`}
                  />
                  <input
                    placeholder="Instructions"
                    value={localPaymentSettings.manual_instructions}
                    onChange={(e) => setLocalPaymentSettings({...localPaymentSettings, manual_instructions: e.target.value})}
                    className={`px-3 py-2 rounded-lg ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200'} border`}
                  />
                </div>
              </div>
            )}
            
            <button
              onClick={savePaymentSettings}
              className="px-4 py-2 bg-violet-500 text-white rounded-lg hover:bg-violet-600 flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Save Payment Settings
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Risk Settings Content (Admin)
  const RiskSettingsContent = () => {
    const [localRiskScore, setLocalRiskScore] = useState(globalRiskScore);
    const [localMaxPositions, setLocalMaxPositions] = useState(maxPositions);
    const [saving, setSaving] = useState(false);

    const saveRiskSettings = async () => {
      setSaving(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BACKEND_URL}/api/subscriptions/admin/risk-settings`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            risk_score: localRiskScore,
            max_positions: localMaxPositions
          })
        });
        if (response.ok) {
          setGlobalRiskScore(localRiskScore);
          setMaxPositions(localMaxPositions);
          alert('Risk management settings updated for all users!');
        }
      } catch (error) {
        console.error('Failed to save:', error);
      } finally {
        setSaving(false);
      }
    };

    return (
      <div className="space-y-6">
        <div className={`rounded-2xl border p-6 ${isDark ? 'bg-[#12121a]/60 border-white/5' : 'bg-white border-gray-200'}`}>
          <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Risk Management Settings</h3>
          <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Configure risk management settings visible to all users. These settings affect the portfolio risk indicator and position limits shown on user dashboards.
          </p>
          
          {/* Risk Level */}
          <div className="mb-6">
            <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Risk Level
            </label>
            <div className="flex gap-4">
              {['Low', 'Medium', 'High'].map((level) => (
                <button
                  key={level}
                  onClick={() => setLocalRiskScore(level)}
                  className={`px-6 py-3 rounded-xl font-medium transition-all ${
                    localRiskScore === level
                      ? level === 'Low' ? 'bg-emerald-500 text-white'
                      : level === 'High' ? 'bg-red-500 text-white'
                      : 'bg-amber-500 text-white'
                      : isDark ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Max Positions */}
          <div className="mb-6">
            <label className={`block text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Maximum Open Positions
            </label>
            <p className={`text-sm mb-3 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Set the maximum number of positions users can have open at once.
            </p>
            <div className="flex gap-3">
              {[5, 10, 15, 20, 25, 30].map((num) => (
                <button
                  key={num}
                  onClick={() => setLocalMaxPositions(num)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    localMaxPositions === num
                      ? 'bg-[#FFA500] text-white'
                      : isDark ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Custom:</span>
              <input
                type="number"
                min="1"
                max="100"
                value={localMaxPositions}
                onChange={(e) => setLocalMaxPositions(parseInt(e.target.value) || 10)}
                className={`w-24 px-3 py-2 rounded-lg border text-center ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
              />
              <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>positions</span>
            </div>
          </div>

          <button
            onClick={saveRiskSettings}
            disabled={saving}
            className="px-4 py-2 bg-[#FFA500] text-white rounded-lg hover:bg-[#FF8C00] disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Risk Management Settings
          </button>
        </div>
      </div>
    );
  };

  // Subscription Content (User)
  const SubscriptionContent = () => {
    const [plans, setPlans] = useState([]);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [manualInfo, setManualInfo] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [selectedMethod, setSelectedMethod] = useState(null);
    const [subscribing, setSubscribing] = useState(false);

    useEffect(() => {
      fetchPlans();
      fetchPaymentMethods();
    }, []);

    const fetchPlans = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/subscriptions/plans`);
        if (response.ok) {
          const data = await response.json();
          setPlans(data.plans || []);
        }
      } catch (error) {
        console.error('Failed to fetch plans:', error);
      }
    };

    const fetchPaymentMethods = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/subscriptions/payment-methods`);
        if (response.ok) {
          const data = await response.json();
          setPaymentMethods(data.methods || []);
          setManualInfo(data.manual);
        }
      } catch (error) {
        console.error('Failed to fetch methods:', error);
      }
    };

    const handleSubscribe = async () => {
      if (!selectedPlan || !selectedMethod) {
        alert('Please select a plan and payment method');
        return;
      }
      setSubscribing(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BACKEND_URL}/api/subscriptions/subscribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            plan_id: selectedPlan.id,
            payment_method: selectedMethod
          })
        });
        const data = await response.json();
        if (data.success) {
          alert(data.message);
          fetchUserSubscription();
        } else {
          alert(data.detail || 'Failed to subscribe');
        }
      } catch (error) {
        console.error('Failed to subscribe:', error);
      } finally {
        setSubscribing(false);
      }
    };

    return (
      <div className="space-y-6">
        {/* Current Subscription */}
        {userSubscription && (
          <div className={`rounded-2xl border p-6 ${
            userSubscription.status === 'active' 
              ? isDark ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'
              : isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'
          }`}>
            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Current Subscription</h3>
            <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{userSubscription.plan_name}</p>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Status: <span className={`font-medium ${userSubscription.status === 'active' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {userSubscription.status}
              </span>
            </p>
            {userSubscription.expires_at && (
              <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                Expires: {new Date(userSubscription.expires_at).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {/* Plans */}
        <div>
          <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Available Plans</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan)}
                className={`p-6 rounded-2xl border cursor-pointer transition-all ${
                  selectedPlan?.id === plan.id
                    ? 'border-violet-500 bg-violet-500/10'
                    : isDark ? 'border-white/10 bg-[#12121a]/60 hover:border-white/20' : 'border-gray-200 bg-white hover:border-gray-300'
                } ${plan.popular ? 'ring-2 ring-violet-500' : ''}`}
              >
                {plan.popular && (
                  <span className="px-2 py-1 bg-violet-500 text-white text-xs rounded-full mb-2 inline-block">Most Popular</span>
                )}
                <h4 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h4>
                <p className={`text-3xl font-bold my-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  ${plan.price}<span className="text-sm font-normal text-gray-400">/{plan.interval}</span>
                </p>
                <ul className="space-y-2 mt-4">
                  {plan.features?.map((f, i) => (
                    <li key={i} className={`text-sm flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      <Check className="w-4 h-4 text-emerald-400" /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Methods */}
        {selectedPlan && paymentMethods.length > 0 && (
          <div className={`rounded-2xl border p-6 ${isDark ? 'bg-[#12121a]/60 border-white/5' : 'bg-white border-gray-200'}`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Select Payment Method</h3>
            <div className="flex flex-wrap gap-3 mb-4">
              {paymentMethods.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={`px-4 py-2 rounded-lg border ${
                    selectedMethod === method.id
                      ? 'border-violet-500 bg-violet-500/10 text-violet-400'
                      : isDark ? 'border-white/10 text-gray-400' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {method.name}
                </button>
              ))}
            </div>

            {selectedMethod === 'manual' && manualInfo && (
              <div className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                <h4 className={`font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Bank Transfer Details</h4>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Bank: {manualInfo.bank_name}</p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Account: {manualInfo.account_number}</p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Name: {manualInfo.account_name}</p>
                {manualInfo.instructions && (
                  <p className={`text-sm mt-2 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{manualInfo.instructions}</p>
                )}
              </div>
            )}

            <button
              onClick={handleSubscribe}
              disabled={subscribing}
              className="w-full py-3 bg-gradient-to-r from-violet-500 to-[#FFA500] text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {subscribing ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              Subscribe to {selectedPlan.name} - ${selectedPlan.price}/{selectedPlan.interval}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <OverviewContent />;
      case 'mt5': return (
        <MT5Content
          isDark={isDark}
          mt5Balance={mt5Balance}
          mt5Accounts={mt5Accounts}
          fetchMT5Accounts={fetchMT5Accounts}
          userLotSize={userLotSize}
          setUserLotSize={setUserLotSize}
          saveUserLotSize={saveUserLotSize}
          lotSizeSaving={lotSizeSaving}
          tradeHistory={tradeHistory}
          tradeHistoryLoading={tradeHistoryLoading}
          fetchTradeHistory={fetchTradeHistory}
          setShowMT5Connect={setShowMT5Connect}
        />
      );
      case 'prompttrading': 
        // Pro-only feature check
        if (!user?.is_admin && !user?.is_pro) {
          return (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center mb-4">
                <Zap className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>Pro Feature</h3>
              <p className={`max-w-md mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                IGRIS Voice AI is a Pro feature. Upgrade your account to unlock voice-activated trading commands and real-time market insights.
              </p>
              <button 
                onClick={() => setActiveTab('subscription')}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all"
              >
                Upgrade to Pro
              </button>
            </div>
          );
        }
        return <PromptTradingContent isDark={isDark} />;
      case 'chart': return <ChartContent isDark={isDark} />;
      case 'easignals': return <EASignalsContentWrapper />;
      case 'wallet': return <WalletContent />;
      case 'subscription': return <SubscriptionContent />;
      case 'support': return <SupportContent />;
      case 'signals': return <SignalsContent />;
      case 'portfolio': return <PortfolioContent />;
      case 'mt5trades': return <MT5TradesContent />;
      case 'emailtemplates': return <EmailTemplatesContent />;
      case 'planspayments': return <PlansPaymentsContent />;
      case 'risksettings': return <RiskSettingsContent />;
      case 'systemstatus': return <SystemStatusContent />;
      case 'api': return <APISettingsContent />;
      case 'users': return <ManageUsersContent />;
      case 'settings': return (
        <SettingsContent
          isDark={isDark}
          user={user}
          profilePicture={profilePicture}
          profileName={profileName}
          setProfileName={setProfileName}
          profileSaving={profileSaving}
          handleProfileUpdate={saveProfileSettings}
          handleProfilePicChange={handleProfilePictureChange}
          securitySettings={securitySettings}
          setSecuritySettings={setSecuritySettings}
          handleSecurityUpdate={updateSecuritySetting}
          showPasswordModal={showPasswordModal}
          setShowPasswordModal={setShowPasswordModal}
          passwordData={passwordData}
          setPasswordData={setPasswordData}
          handlePasswordChange={handlePasswordChange}
          userLotSize={userLotSize}
          setUserLotSize={setUserLotSize}
          saveUserLotSize={saveUserLotSize}
          lotSizeSaving={lotSizeSaving}
          browserNotifPermission={browserNotifPermission}
          requestNotificationPermission={requestNotificationPermission}
        />
      );
      default: return <OverviewContent />;
    }
  };

  return (
    <div className={`min-h-screen flex overflow-hidden pb-16 lg:pb-0 transition-colors duration-300 ${isDark ? 'bg-[#0a0a0f]' : 'bg-gray-100'}`}>
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 w-64 border-r flex flex-col z-50 transform transition-all duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${isDark ? 'bg-[#0d0d14] border-white/5' : 'bg-white border-gray-200'}`}>
        <div className={`p-4 lg:p-6 border-b flex items-center justify-between ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
          <Link to="/" className="flex items-center gap-2">
            <img 
              src={LOGO_URL} 
              alt="IGRIS Logo" 
              className="w-7 h-7 lg:w-8 lg:h-8 object-contain"
            />
            <span className="text-lg lg:text-xl font-bold">
              <span className={isDark ? 'text-white' : 'text-gray-900'}>IG</span>
              <span className="text-[#FFA500]">RIS</span>
            </span>
          </Link>
          <button 
            onClick={() => setSidebarOpen(false)}
            className={`lg:hidden p-2 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 lg:p-4 space-y-1 overflow-y-auto">
          {sidebarItems.map((item, index) => (
            <React.Fragment key={item.id}>
              {user?.is_admin && index === userMenuItems.length && (
                <div className="pt-4 pb-2">
                  <p className={`px-3 text-xs uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Admin</p>
                </div>
              )}
              <button
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 lg:px-4 py-2.5 lg:py-3 rounded-xl transition-all ${
                  activeTab === item.id
                    ? 'bg-violet-500/10 text-violet-400'
                    : isDark 
                      ? 'text-gray-400 hover:bg-white/5 hover:text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium text-sm lg:text-base">{item.label}</span>
              </button>
            </React.Fragment>
          ))}
        </nav>

        {/* User Profile and Logout - with padding for mobile nav */}
        <div className={`p-3 lg:p-4 border-t mb-20 lg:mb-0 ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-3 lg:mb-4">
            <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-[#FFA500] to-amber-600 flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
              {profilePicture ? (
                <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0)?.toUpperCase() || 'U'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-medium truncate text-sm lg:text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>{user?.name || 'User'}</p>
              <p className={`text-xs truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{user?.is_admin ? 'Admin' : user?.is_pro ? 'Pro' : 'Free'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg transition-colors ${isDark ? 'text-gray-400 hover:bg-red-500/10 hover:text-red-400' : 'text-gray-500 hover:bg-red-50 hover:text-red-500'}`}
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Sign out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        <header className={`backdrop-blur-xl border-b px-4 lg:px-8 py-3 lg:py-4 fixed top-0 right-0 left-0 lg:left-64 z-20 flex-shrink-0 transition-colors duration-300 ${isDark ? 'bg-[#0d0d14]/95 border-white/5' : 'bg-white/95 border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSidebarOpen(true)}
                className={`lg:hidden p-2 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h1 className={`text-xl lg:text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{getPageTitle()}</h1>
                <p className={`text-xs lg:text-sm hidden sm:block ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Welcome back, {user?.name?.split(' ')[0] || 'Trader'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 lg:gap-4">
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-all hover:scale-110 ${
                  isDark 
                    ? 'bg-white/5 text-yellow-400 hover:bg-white/10' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                aria-label="Toggle theme"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              
              {/* Notification Bell with Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`p-2 rounded-lg transition-colors relative ${isDark ? 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200'}`}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-[#FFA500] rounded-full text-xs text-white flex items-center justify-center font-medium">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                
                {/* Notification Dropdown */}
                {showNotifications && (
                  <div className={`absolute right-0 top-full mt-2 w-80 rounded-xl border shadow-xl z-50 ${isDark ? 'bg-[#12121a] border-white/10' : 'bg-white border-gray-200'}`}>
                    <div className={`p-3 border-b flex items-center justify-between ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                      <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Notifications</h3>
                      <div className="flex items-center gap-2">
                        {/* Browser Notification Permission */}
                        {browserNotifPermission !== 'granted' && (
                          <button
                            onClick={requestNotificationPermission}
                            className="text-xs px-2 py-1 bg-[#FFA500]/20 text-[#FFA500] rounded-lg hover:bg-[#FFA500]/30 transition-colors flex items-center gap-1"
                            title="Enable browser notifications"
                          >
                            <Bell className="w-3 h-3" />
                            Enable
                          </button>
                        )}
                        {browserNotifPermission === 'granted' && (
                          <span className="text-xs text-emerald-400 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                          </span>
                        )}
                        {unreadCount > 0 && (
                          <button 
                            onClick={markAllAsRead}
                            className="text-xs text-[#FFA500] hover:text-[#FF8C00]"
                          >
                            Mark all read
                          </button>
                        )}
                        {notifications.length > 0 && (
                          <button 
                            onClick={clearAllNotifications}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div 
                            key={notif.id}
                            onClick={() => markNotificationAsRead(notif.id)}
                            className={`p-3 border-b border-white/5 hover:bg-white/5 cursor-pointer ${!notif.read ? 'bg-[#FFA500]/5' : ''}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                notif.type === 'trade_alert' ? 'bg-emerald-500/20' : 'bg-[#FFA500]/20'
                              }`}>
                                {notif.type === 'trade_alert' ? (
                                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Bell className="w-4 h-4 text-[#FFA500]" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-medium truncate">{notif.title}</p>
                                <p className="text-gray-400 text-xs truncate">{notif.message}</p>
                                <p className="text-gray-500 text-xs mt-1">
                                  {new Date(notif.created_at).toLocaleString()}
                                </p>
                              </div>
                              {!notif.read && (
                                <div className="w-2 h-2 rounded-full bg-[#FFA500] flex-shrink-0 mt-2" />
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <div className="p-2 border-t border-white/10 text-center">
                        <button 
                          onClick={() => {
                            setShowNotifications(false);
                            fetchAllNotifications();
                          }}
                          className="text-xs text-[#FFA500] hover:text-[#FF8C00]"
                        >
                          View all notifications
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button 
                onClick={fetchNotifications}
                className="hidden sm:flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg bg-[#FFA500] hover:bg-[#FF8C00] text-white font-medium transition-colors text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden md:inline">Sync</span>
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain pt-16 lg:pt-[72px]">
          <div className={`mx-auto w-full ${activeTab === 'prompttrading' ? 'p-0 md:p-2 lg:p-4 h-[calc(100vh-64px-56px)] lg:h-[calc(100vh-72px)] max-w-none lg:max-w-7xl' : 'p-4 lg:p-8 max-w-7xl'}`}>
            {renderContent()}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNavBar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isAdmin={user?.is_admin}
      />
    </div>
  );
};

export default Dashboard;

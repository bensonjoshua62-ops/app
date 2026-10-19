import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, LineChart, Wallet, Settings, TrendingUp, Activity, MessageCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const MobileNavBar = ({ activeTab, setActiveTab, isAdmin }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark } = useTheme();

  const navItems = [
    { id: 'overview', label: 'Home', icon: Home },
    { id: 'prompttrading', label: 'IGRIS', icon: MessageCircle },
    { id: 'mt5', label: 'MT5', icon: TrendingUp },
    { id: 'easignals', label: 'Signals', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavClick = (id) => {
    setActiveTab(id);
  };

  return (
    <nav className={`fixed bottom-0 left-0 right-0 z-50 lg:hidden safe-area-bottom border-t transition-colors ${
      isDark 
        ? 'bg-[#0d0d14] border-white/10' 
        : 'bg-white border-gray-200 shadow-lg'
    }`}>
      <div className="flex justify-around items-center py-2 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg transition-all ${
                isActive 
                  ? 'text-[#FFA500] bg-[#FFA500]/10' 
                  : isDark 
                    ? 'text-gray-500 hover:text-gray-300' 
                    : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''}`} />
              <span className={`text-[10px] mt-1 font-medium ${
                isActive 
                  ? 'text-[#FFA500]' 
                  : isDark 
                    ? '' 
                    : 'text-gray-600'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNavBar;

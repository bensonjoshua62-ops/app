import React, { useRef, useState } from 'react';
import { User, Lock, Camera, Save, Loader2, Eye, EyeOff, Bell, Shield } from 'lucide-react';
import { BACKEND_URL } from '../../utils/config';
import LotSizeCard from './LotSizeCard';

const SettingsContent = ({
  isDark,
  user,
  profilePicture,
  profileName,
  setProfileName,
  profileSaving,
  handleProfileUpdate,
  handleProfilePicChange,
  securitySettings,
  setSecuritySettings,
  handleSecurityUpdate,
  showPasswordModal,
  setShowPasswordModal,
  passwordData,
  setPasswordData,
  handlePasswordChange,
  userLotSize,
  setUserLotSize,
  saveUserLotSize,
  lotSizeSaving,
  browserNotifPermission,
  requestNotificationPermission
}) => {
  const profilePicRef = useRef(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <div className={`rounded-2xl border p-6 ${isDark ? 'bg-[#12121a]/60 border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-violet-500/20' : 'bg-violet-100'}`}>
            <User className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Profile Settings</h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Manage your account information</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Profile Picture */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#FFA500] to-amber-600 flex items-center justify-center text-white text-3xl font-bold overflow-hidden">
                {profilePicture ? (
                  <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  user?.name?.charAt(0)?.toUpperCase() || 'U'
                )}
              </div>
              <button
                onClick={() => profilePicRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-violet-500 hover:bg-violet-600 flex items-center justify-center text-white transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={profilePicRef}
                type="file"
                accept="image/*"
                onChange={handleProfilePicChange}
                className="hidden"
              />
            </div>
            <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Click to change</p>
          </div>

          {/* Profile Form */}
          <div className="flex-1 space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Display Name</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Your name"
                className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:border-violet-500/50 ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-500'}`}
              />
            </div>
            <button
              onClick={handleProfileUpdate}
              disabled={profileSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 text-white font-medium transition-colors disabled:opacity-50"
            >
              {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </div>
      </div>

      {/* Trading Settings */}
      <LotSizeCard
        userLotSize={userLotSize}
        setUserLotSize={setUserLotSize}
        saveUserLotSize={saveUserLotSize}
        lotSizeSaving={lotSizeSaving}
        isDark={isDark}
      />

      {/* Security Section */}
      <div className={`rounded-2xl border p-6 ${isDark ? 'bg-[#12121a]/60 border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-red-500/20' : 'bg-red-100'}`}>
            <Lock className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Security</h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Manage your security settings</p>
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => setShowPasswordModal(true)}
            className={`w-full flex items-center justify-between p-4 rounded-xl border transition-colors ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
          >
            <div className="flex items-center gap-3">
              <Lock className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <span className={isDark ? 'text-white' : 'text-gray-900'}>Change Password</span>
            </div>
            <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>••••••••</span>
          </button>

          <div className={`flex items-center justify-between p-4 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center gap-3">
              <Shield className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <span className={isDark ? 'text-white' : 'text-gray-900'}>Two-Factor Authentication</span>
            </div>
            <span className={`text-sm px-2 py-1 rounded ${isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-600'}`}>Coming Soon</span>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className={`rounded-2xl border p-6 ${isDark ? 'bg-[#12121a]/60 border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
            <Bell className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Notifications</h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Manage notification preferences</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Browser Notifications */}
          <div className={`flex items-center justify-between p-4 rounded-xl border ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
            <div>
              <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Browser Notifications</p>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Receive notifications in your browser</p>
            </div>
            {browserNotifPermission === 'granted' ? (
              <span className="text-emerald-400 text-sm">✓ Enabled</span>
            ) : browserNotifPermission === 'denied' ? (
              <span className="text-red-400 text-sm">Blocked</span>
            ) : (
              <button
                onClick={requestNotificationPermission}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium transition-colors"
              >
                Enable
              </button>
            )}
          </div>

          <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
            <div>
              <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Login Alerts</p>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Get notified of new sign-ins</p>
            </div>
            <input
              type="checkbox"
              checked={securitySettings.login_notifications}
              onChange={(e) => {
                handleSecurityUpdate('login_notifications', e.target.checked);
              }}
              className="w-5 h-5 rounded accent-violet-500"
            />
          </label>

          <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
            <div>
              <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Trade Notifications</p>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Get notified of trade executions</p>
            </div>
            <input
              type="checkbox"
              checked={securitySettings.trade_notifications}
              onChange={(e) => {
                handleSecurityUpdate('trade_notifications', e.target.checked);
              }}
              className="w-5 h-5 rounded accent-violet-500"
            />
          </label>
        </div>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl border p-6 ${isDark ? 'bg-[#12121a] border-white/10' : 'bg-white border-gray-200'}`}>
            <h3 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Change Password</h3>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordData.current}
                    onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
                    className={`w-full px-4 py-3 pr-10 rounded-xl border focus:outline-none focus:border-violet-500/50 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                  >
                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.new}
                    onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
                    className={`w-full px-4 py-3 pr-10 rounded-xl border focus:outline-none focus:border-violet-500/50 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirm}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:border-violet-500/50 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordData({ current: '', new: '', confirm: '' });
                }}
                className={`flex-1 py-2 rounded-lg ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordChange}
                className="flex-1 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 text-white font-medium"
              >
                Update Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsContent;

import React, { useState, useEffect, useRef } from 'react';
import { Settings, Save, Loader2 } from 'lucide-react';

const LotSizeCard = ({ userLotSize, setUserLotSize, saveUserLotSize, lotSizeSaving, isDark }) => {
  const [localLotSize, setLocalLotSize] = useState(userLotSize.toString());
  const inputRef = useRef(null);

  // Sync local state when parent state changes (but not during typing)
  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setLocalLotSize(userLotSize.toString());
    }
  }, [userLotSize]);

  const handleInputChange = (e) => {
    setLocalLotSize(e.target.value);
  };

  const handleInputBlur = () => {
    const value = parseFloat(localLotSize) || 0.01;
    setUserLotSize(value);
    setLocalLotSize(value.toString());
  };

  const handlePresetClick = (size) => {
    setLocalLotSize(size.toString());
    setUserLotSize(size);
  };

  const handleSave = () => {
    const value = parseFloat(localLotSize) || 0.01;
    saveUserLotSize(value);
  };

  return (
    <div className={`rounded-2xl border p-6 backdrop-blur-sm ${isDark ? 'bg-[#12121a]/60 border-white/5' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-[#FFA500]/20' : 'bg-orange-100'}`}>
          <Settings className="w-5 h-5 text-[#FFA500]" />
        </div>
        <div>
          <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Trading Lot Size</h3>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Set your preferred lot size for copy trading</p>
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Lot Size
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {[0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1.0].map((size) => (
              <button
                key={size}
                onClick={() => handlePresetClick(size)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  parseFloat(localLotSize) === size
                    ? 'bg-[#FFA500] text-white'
                    : isDark ? 'bg-white/5 text-gray-400 hover:bg-white/10' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Custom:</span>
            <input
              ref={inputRef}
              type="number"
              min="0.01"
              max="100"
              step="0.01"
              value={localLotSize}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              placeholder="0.01"
              className={`w-24 px-3 py-2 rounded-lg border text-center ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
            />
            <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>lots</span>
          </div>
        </div>
        
        <div className={`p-3 rounded-lg ${isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'}`}>
          <p className={`text-sm ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
            ⚠️ This lot size will be used when copying IGRIS
          </p>
        </div>
        
        <button
          onClick={handleSave}
          disabled={lotSizeSaving}
          className="btn-glass btn-glass-primary px-4 py-2 disabled:opacity-50 flex items-center gap-2"
        >
          {lotSizeSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Lot Size
        </button>
      </div>
    </div>
  );
};

export default LotSizeCard;

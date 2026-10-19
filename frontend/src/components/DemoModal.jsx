import React, { useState, useEffect } from 'react';
import { X, Play, User, Link2, Settings, ChevronRight, ExternalLink, Loader2 } from 'lucide-react';
import { BACKEND_URL } from '../utils/config';

const DemoModal = ({ isOpen, onClose }) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      fetchDemoSettings();
    }
  }, [isOpen]);

  const fetchDemoSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/settings/demo-video`);
      if (response.ok) {
        const data = await response.json();
        setVideoUrl(data.video_url || '');
      }
    } catch (error) {
      console.error('Failed to fetch demo settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: 'Create Your Account',
      icon: User,
      description: 'Sign up for IGRIS with your email. After registration, your account will be reviewed by an admin for approval.',
      details: [
        'Click "Get Started" on the homepage',
        'Enter your name and email address',
        'Complete email verification (optional)',
        'Set your password',
        'Wait for admin approval (usually < 24 hours)'
      ]
    },
    {
      title: 'Connect Your MT5 Account',
      icon: Link2,
      description: 'Link your MetaTrader 5 trading account to start receiving copied trades automatically.',
      details: [
        'Go to the MT5 section in your dashboard',
        'Click "Connect MT5 Account"',
        'Enter your MT5 login number',
        'Enter your MT5 password (investor or main)',
        'Enter your broker\'s server name',
        'Your account is automatically set up as a subscriber'
      ]
    },
    {
      title: 'Configure Your Lot Size',
      icon: Settings,
      description: 'Set your preferred lot size for all copied trades. This controls your risk and position sizing.',
      details: [
        'Navigate to Settings in the sidebar',
        'Find the "Trading Lot Size" section',
        'Choose a preset (0.01, 0.02, 0.05, etc.)',
        'Or enter a custom lot size',
        'Click "Save Lot Size" to apply',
        'All future copied trades will use this size'
      ]
    }
  ];

  if (!isOpen) return null;

  const ActiveIcon = steps[activeStep].icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-[#12121a] border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-2xl font-bold text-white">Getting Started with IGRIS</h2>
            <p className="text-gray-400 mt-1">Learn how to set up your account in 2 minutes</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-[#FFA500] animate-spin" />
            </div>
          ) : (
            <>
              {/* Video Section (if URL is set) */}
              {videoUrl && (
                <div className="mb-8">
                  <div className="aspect-video rounded-xl overflow-hidden bg-black/50 border border-white/10">
                    {videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be') ? (
                      <iframe
                        src={videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="IGRIS Demo Video"
                      />
                    ) : videoUrl.includes('vimeo.com') ? (
                      <iframe
                        src={videoUrl.replace('vimeo.com/', 'player.vimeo.com/video/')}
                        className="w-full h-full"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                        title="IGRIS Demo Video"
                      />
                    ) : (
                      <video src={videoUrl} controls className="w-full h-full" />
                    )}
                  </div>
                </div>
              )}

              {/* Step Navigation */}
              <div className="flex items-center justify-center gap-2 mb-8">
                {steps.map((step, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveStep(index)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                      activeStep === index
                        ? 'bg-[#FFA500] text-white'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    <span className="font-medium">Step {index + 1}</span>
                  </button>
                ))}
              </div>

              {/* Active Step Content */}
              <div className="bg-white/5 rounded-2xl border border-white/10 p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-14 h-14 rounded-xl bg-[#FFA500]/20 flex items-center justify-center flex-shrink-0">
                    <ActiveIcon className="w-7 h-7 text-[#FFA500]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">{steps[activeStep].title}</h3>
                    <p className="text-gray-400">{steps[activeStep].description}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {steps[activeStep].details.map((detail, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#FFA500]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-[#FFA500]">{index + 1}</span>
                      </div>
                      <p className="text-gray-300">{detail}</p>
                    </div>
                  ))}
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-white/10">
                  <button
                    onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
                    disabled={activeStep === 0}
                    className="px-4 py-2 rounded-lg bg-white/5 text-gray-400 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {activeStep < steps.length - 1 ? (
                    <button
                      onClick={() => setActiveStep(activeStep + 1)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FFA500] hover:bg-[#FF8C00] text-white font-medium transition-colors"
                    >
                      Next Step
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={onClose}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition-colors"
                    >
                      Get Started
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* No Video Placeholder */}
              {!videoUrl && (
                <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                  <Play className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">
                    Video tutorial coming soon! Follow the steps above to get started.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5">
          <p className="text-center text-gray-500 text-sm">
            Need help? Visit the Support section in your dashboard or contact us at support@igris.com
          </p>
        </div>
      </div>
    </div>
  );
};

export default DemoModal;

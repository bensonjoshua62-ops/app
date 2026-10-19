import React from 'react';
import { Check, Crown, Zap, Shield, Star, AlertTriangle } from 'lucide-react';

const SubscriptionContent = ({ isDark }) => {
  const plans = [
    {
      name: 'Starter',
      price: '$0',
      period: '/month',
      description: 'Perfect for beginners',
      features: [
        'Basic AI signals',
        '1 MT5 account',
        'Email support',
        'Community access'
      ],
      icon: Star,
      color: 'gray',
      current: true
    },
    {
      name: 'Pro',
      price: '$49',
      period: '/month',
      description: 'For serious traders',
      features: [
        'Advanced AI signals',
        '3 MT5 accounts',
        'Priority support',
        'Copy trading',
        'Risk management tools'
      ],
      icon: Zap,
      color: 'violet',
      popular: true
    },
    {
      name: 'Enterprise',
      price: '$199',
      period: '/month',
      description: 'For professional traders',
      features: [
        'All Pro features',
        'Unlimited MT5 accounts',
        'Dedicated account manager',
        'Custom strategies',
        'API access',
        'White-label options'
      ],
      icon: Crown,
      color: 'amber'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Current Plan Banner */}
      <div className={`rounded-2xl border p-6 ${isDark ? 'bg-[#12121a]/60 border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#FFA500]/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-[#FFA500]" />
          </div>
          <div>
            <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Your Current Plan</h2>
            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>Starter Plan - Free</p>
          </div>
        </div>
      </div>

      {/* Coming Soon Notice */}
      <div className={`rounded-xl border p-4 ${isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <p className={`text-sm ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
            Subscription payments are coming soon. Currently all features are available for free during beta.
          </p>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan, index) => {
          const Icon = plan.icon;
          return (
            <div
              key={index}
              className={`relative rounded-2xl border p-6 transition-all ${
                plan.popular
                  ? isDark ? 'bg-violet-500/10 border-violet-500/30' : 'bg-violet-50 border-violet-200'
                  : isDark ? 'bg-[#12121a]/60 border-white/5' : 'bg-white border-gray-200'
              } ${plan.current ? 'ring-2 ring-[#FFA500]' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full bg-violet-500 text-white text-xs font-semibold">
                    Most Popular
                  </span>
                </div>
              )}
              {plan.current && (
                <div className="absolute -top-3 right-4">
                  <span className="px-3 py-1 rounded-full bg-[#FFA500] text-white text-xs font-semibold">
                    Current Plan
                  </span>
                </div>
              )}

              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                <Icon className={`w-6 h-6 ${plan.color === 'violet' ? 'text-violet-500' : plan.color === 'amber' ? 'text-amber-500' : isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              </div>

              <h3 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
              <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{plan.description}</p>

              <div className="mb-6">
                <span className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{plan.price}</span>
                <span className={isDark ? 'text-gray-500' : 'text-gray-500'}>{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Check className={`w-4 h-4 ${plan.color === 'violet' ? 'text-violet-500' : plan.color === 'amber' ? 'text-amber-500' : 'text-emerald-500'}`} />
                    <span className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                disabled={plan.current}
                className={`w-full py-3 rounded-xl font-semibold transition-colors ${
                  plan.current
                    ? isDark ? 'bg-white/5 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : plan.popular
                    ? 'bg-violet-500 hover:bg-violet-600 text-white'
                    : isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-900 hover:bg-gray-800 text-white'
                }`}
              >
                {plan.current ? 'Current Plan' : 'Upgrade'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SubscriptionContent;

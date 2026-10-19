import React, { useState } from 'react';
import { MessageCircle, Mail, FileText, ChevronDown, ChevronUp, ExternalLink, Send, Loader2 } from 'lucide-react';
import { BACKEND_URL } from '../../utils/config';

const SupportContent = ({ isDark }) => {
  const [openFaq, setOpenFaq] = useState(null);
  const [supportForm, setSupportForm] = useState({ subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const faqs = [
    {
      question: 'How do I connect my MT5 account?',
      answer: 'Navigate to the MT5 section in the sidebar, click "Connect MT5 Account", and enter your MT5 login credentials (account number, password, and server name). Make sure you use your investor password for read-only access or your main password for full trading capabilities.'
    },
    {
      question: 'What is CopyFactory and how does trade copying work?',
      answer: 'CopyFactory is MetaAPI\'s trade copying service. When you connect your MT5 account, it automatically becomes a subscriber to our master trading strategy. Any trades executed by the master account will be copied to your account using your preferred lot size.'
    },
    {
      question: 'How do I change my lot size for copied trades?',
      answer: 'Go to Settings in the sidebar and find the "Trading Lot Size" section. You can either select a preset value (0.01, 0.02, 0.05, etc.) or enter a custom lot size. Click "Save Lot Size" to apply the changes.'
    },
    {
      question: 'Why are my emails not being delivered?',
      answer: 'Email delivery depends on the SMTP provider configuration. If you\'re an admin, go to Email Templates to configure a reliable SMTP provider like Gmail (with App Password) or SendGrid. Contact support if issues persist.'
    },
    {
      question: 'What is Prompt Trading?',
      answer: 'Prompt Trading allows you to interact with IGRIS AI using natural language. You can ask questions about trading, upload chart images for analysis, or use voice recording to get instant trading insights.'
    },
    {
      question: 'How do EA Signals work?',
      answer: 'EA (Expert Advisor) Signals are trading signals sent from your MetaTrader Expert Advisor via webhook. Configure your EA to send signals to the webhook URL shown in the EA Signals section, and they\'ll appear in your dashboard.'
    }
  ];

  const handleSubmitSupport = async (e) => {
    e.preventDefault();
    if (!supportForm.subject.trim() || !supportForm.message.trim()) return;

    setSubmitting(true);
    setSubmitStatus(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/support/ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(supportForm)
      });

      if (response.ok) {
        setSubmitStatus('success');
        setSupportForm({ subject: '', message: '' });
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Support ticket error:', error);
      setSubmitStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* FAQ Section */}
      <div className={`rounded-2xl border p-6 ${isDark ? 'bg-[#12121a]/60 border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-6 h-6 text-[#FFA500]" />
          <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Frequently Asked Questions</h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`rounded-xl border overflow-hidden ${isDark ? 'border-white/5' : 'border-gray-200'}`}
            >
              <button
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className={`w-full flex items-center justify-between p-4 text-left transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
              >
                <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{faq.question}</span>
                {openFaq === index ? (
                  <ChevronUp className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                ) : (
                  <ChevronDown className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                )}
              </button>
              {openFaq === index && (
                <div className={`px-4 pb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact Support */}
      <div className={`rounded-2xl border p-6 ${isDark ? 'bg-[#12121a]/60 border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
        <div className="flex items-center gap-3 mb-6">
          <MessageCircle className="w-6 h-6 text-[#FFA500]" />
          <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Contact Support</h2>
        </div>

        {submitStatus === 'success' && (
          <div className="mb-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            Your support request has been submitted. We'll get back to you soon!
          </div>
        )}

        {submitStatus === 'error' && (
          <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
            Failed to submit support request. Please try again or email us directly.
          </div>
        )}

        <form onSubmit={handleSubmitSupport} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Subject</label>
            <input
              type="text"
              value={supportForm.subject}
              onChange={(e) => setSupportForm({ ...supportForm, subject: e.target.value })}
              placeholder="Brief description of your issue"
              className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:border-[#FFA500]/50 ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Message</label>
            <textarea
              value={supportForm.message}
              onChange={(e) => setSupportForm({ ...supportForm, message: e.target.value })}
              rows={5}
              placeholder="Describe your issue in detail..."
              className={`w-full px-4 py-3 rounded-xl border focus:outline-none focus:border-[#FFA500]/50 resize-none ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !supportForm.subject.trim() || !supportForm.message.trim()}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#FFA500] hover:bg-[#FF8C00] text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-5 h-5" />
                Submit Request
              </>
            )}
          </button>
        </form>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <a
          href="mailto:support@igris.com"
          className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
        >
          <Mail className="w-5 h-5 text-[#FFA500]" />
          <div>
            <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Email Support</p>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>support@igris.com</p>
          </div>
          <ExternalLink className={`w-4 h-4 ml-auto ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
        </a>
        <a
          href="https://docs.igris.com"
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}
        >
          <FileText className="w-5 h-5 text-[#FFA500]" />
          <div>
            <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Documentation</p>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Learn how to use IGRIS</p>
          </div>
          <ExternalLink className={`w-4 h-4 ml-auto ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
        </a>
      </div>
    </div>
  );
};

export default SupportContent;

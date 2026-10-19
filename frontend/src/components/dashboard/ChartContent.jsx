import React, { useState, useEffect, useRef } from 'react';
import { Bot, MessageCircle, Send, Image as ImageIcon } from 'lucide-react';
import TradingViewWidget from '../TradingViewWidget';
import { BACKEND_URL } from '../../utils/config';

const ChartContent = ({ isDark }) => {
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
      <div className={`rounded-2xl border overflow-hidden ${isDark ? 'bg-[#0F0F0F] border-white/5' : 'bg-white border-gray-200'}`} style={{ height: '600px', minHeight: '500px' }}>
        <TradingViewWidget />
      </div>

      {/* IGRIS Chat */}
      <div className={`rounded-2xl border p-6 ${isDark ? 'bg-gradient-to-r from-[#FFA500]/20 to-amber-600/20 border-[#FFA500]/20' : 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200'}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDark ? 'bg-[#FFA500]/20' : 'bg-orange-100'}`}>
              <Bot className="w-6 h-6 text-[#FFA500]" />
            </div>
            <div>
              <h3 className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>Chat with IGRIS</h3>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Ask questions or upload charts for AI analysis</p>
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
          <div className={`mt-4 rounded-xl border overflow-hidden ${isDark ? 'bg-[#0a0a0f] border-white/10' : 'bg-white border-gray-200'}`}>
            <div className="h-80 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-xl ${
                    msg.role === 'user' 
                      ? 'bg-[#FFA500] text-white' 
                      : isDark ? 'bg-white/10 text-gray-200' : 'bg-gray-100 text-gray-800'
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
                  <div className={`p-3 rounded-xl ${isDark ? 'bg-white/10 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>
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
              <div className={`px-4 py-2 border-t ${isDark ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-gray-50'}`}>
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
            
            <div className={`p-4 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
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
                  className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700'}`}
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
                  className={`flex-1 border rounded-lg px-4 py-2 focus:outline-none disabled:opacity-50 ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-gray-500 focus:border-[#FFA500]/50' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-orange-300'}`}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || (!inputMessage.trim() && !selectedImage)}
                  className="p-2 rounded-lg bg-[#FFA500] hover:bg-[#FF8C00] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                Upload trading charts for AI analysis or ask questions about the market
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChartContent;

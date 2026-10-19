import React, { useState, useEffect, useRef, memo } from 'react';
import { Brain, User, X, Loader2, ImageIcon, Mic, Square, Send } from 'lucide-react';
import { BACKEND_URL } from '../../utils/config';

const PromptTradingContent = memo(({ isDark }) => {
  const [promptMessages, setPromptMessages] = useState([]);
  const [promptInput, setPromptInput] = useState('');
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptImage, setPromptImage] = useState(null);
  const [promptImagePreview, setPromptImagePreview] = useState(null);
  const [conversationLoaded, setConversationLoaded] = useState(false);
  const promptChatEndRef = useRef(null);
  const promptFileInputRef = useRef(null);
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioLevels, setAudioLevels] = useState([0, 0, 0, 0, 0, 0, 0, 0]);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const audioContextRef = useRef(null);

  // Load saved conversation on mount
  useEffect(() => {
    const loadConversation = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BACKEND_URL}/api/chat/history`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.messages && data.messages.length > 0) {
            setPromptMessages(data.messages);
          } else {
            setPromptMessages([{
              role: 'assistant',
              content: "Welcome to Prompt Trading! I'm IGRIS, your AI trading assistant. Describe your trading strategy in plain English and I'll help you analyze opportunities, set up trades, and manage risk. You can also upload chart images or use voice recording."
            }]);
          }
        }
      } catch (error) {
        console.error('Failed to load conversation:', error);
        setPromptMessages([{
          role: 'assistant',
          content: "Welcome to Prompt Trading! I'm IGRIS, your AI trading assistant."
        }]);
      }
      setConversationLoaded(true);
    };
    loadConversation();
  }, []);

  // Save conversation when messages change (debounced)
  useEffect(() => {
    if (!conversationLoaded || promptMessages.length === 0) return;
    
    const timeoutId = setTimeout(async () => {
      try {
        const token = localStorage.getItem('token');
        await fetch(`${BACKEND_URL}/api/chat/history`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ messages: promptMessages })
        });
      } catch (error) {
        console.error('Failed to save conversation:', error);
      }
    }, 2000); // Increased debounce to 2 seconds
    
    return () => clearTimeout(timeoutId);
  }, [promptMessages, conversationLoaded]);

  useEffect(() => {
    if (promptChatEndRef.current) {
      promptChatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [promptMessages]);

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 32;
      
      // Set recording state first
      setIsRecording(true);
      
      const updateAudioLevels = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const levels = Array.from(dataArray.slice(0, 8)).map(v => v / 255);
          setAudioLevels(levels);
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          animationFrameRef.current = requestAnimationFrame(updateAudioLevels);
        }
      };
      
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (audioContextRef.current) {
          try {
            audioContextRef.current.close();
          } catch (e) {
            console.log('AudioContext already closed');
          }
        }
        setAudioLevels([0, 0, 0, 0, 0, 0, 0, 0]);
        
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        stream.getTracks().forEach(track => track.stop());
        if (audioBlob.size > 0) {
          await transcribeAudio(audioBlob);
        } else {
          alert('No audio recorded. Please try again.');
        }
      };

      mediaRecorder.start(1000);
      // Start visualizer after mediaRecorder starts
      setTimeout(() => updateAudioLevels(), 100);
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsRecording(false);
      if (error.name === 'NotAllowedError') {
        alert('Microphone access denied. Please allow microphone access in your browser settings.');
      } else if (error.name === 'NotFoundError') {
        alert('No microphone found. Please connect a microphone and try again.');
      } else {
        alert(`Could not access microphone: ${error.message}`);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAudioLevels([0, 0, 0, 0, 0, 0, 0, 0]);
    }
  };

  const transcribeAudio = async (audioBlob) => {
    setIsTranscribing(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch(`${BACKEND_URL}/api/speech/transcribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      console.log('Transcription response:', data);
      
      if (response.ok && data.success && data.text) {
        // Set the transcribed text and auto-send
        const transcribedText = data.text.trim();
        if (transcribedText) {
          // Add user message to chat
          setPromptMessages(prev => [...prev, { 
            role: 'user', 
            content: transcribedText
          }]);
          setPromptLoading(true);
          
          // Send to AI
          try {
            const chatResponse = await fetch(`${BACKEND_URL}/api/chat/message`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ message: transcribedText })
            });
            
            const chatData = await chatResponse.json();
            setPromptMessages(prev => [...prev, { 
              role: 'assistant', 
              content: chatData.response || 'I apologize, but I encountered an issue processing your request.' 
            }]);
          } catch (chatError) {
            console.error('Chat error:', chatError);
            setPromptMessages(prev => [...prev, { 
              role: 'assistant', 
              content: 'Sorry, I encountered an error processing your voice command. Please try again.' 
            }]);
          } finally {
            setPromptLoading(false);
          }
        }
      } else {
        const errorMsg = data.detail || data.error || 'Could not transcribe audio';
        alert(`Transcription failed: ${errorMsg}`);
      }
    } catch (error) {
      console.error('Transcription error:', error);
      alert(`Transcription failed: ${error.message || 'Network error. Please try again.'}`);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handlePromptImageSelect = (e) => {
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
        setPromptImage(reader.result);
        setPromptImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePromptImage = () => {
    setPromptImage(null);
    setPromptImagePreview(null);
    if (promptFileInputRef.current) {
      promptFileInputRef.current.value = '';
    }
  };

  const sendPromptMessage = async () => {
    if (!promptInput.trim() && !promptImage) return;

    const userMessage = promptInput.trim();
    const hasImage = !!promptImage;

    setPromptMessages(prev => [...prev, { 
      role: 'user', 
      content: userMessage || 'Analyze this chart',
      image: promptImagePreview
    }]);
    setPromptInput('');
    setPromptLoading(true);

    try {
      const token = localStorage.getItem('token');
      let response;

      if (hasImage) {
        const formData = new FormData();
        formData.append('message', userMessage || 'Please analyze this trading chart and provide insights.');
        const base64Data = promptImage.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/png' });
        formData.append('image', blob, 'chart.png');

        response = await fetch(`${BACKEND_URL}/api/chat/analyze-chart`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        removePromptImage();
      } else {
        response = await fetch(`${BACKEND_URL}/api/chat/message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ message: userMessage })
        });
      }

      const data = await response.json();
      setPromptMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.response || 'I apologize, but I encountered an issue processing your request.' 
      }]);
    } catch (error) {
      console.error('Chat error:', error);
      setPromptMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setPromptLoading(false);
    }
  };

  return (
    <div className={`md:rounded-2xl md:border overflow-hidden flex flex-col h-full ${isDark ? 'bg-[#12121a]/60 md:border-white/5' : 'bg-white md:border-gray-200'}`}>
      {/* Chat Messages Area */}
      <div className={`flex-1 overflow-y-auto p-3 md:p-4 space-y-4 ${isDark ? 'bg-[#0a0a0f]' : 'bg-gray-50'}`}>
        {promptMessages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FFA500] to-violet-600 flex items-center justify-center mr-2 flex-shrink-0">
                <Brain className="w-4 h-4 text-white" />
              </div>
            )}
            <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 ${
              message.role === 'user' 
                ? 'bg-[#FFA500] text-white rounded-br-md' 
                : isDark ? 'bg-white/10 text-gray-200 rounded-bl-md' : 'bg-gray-100 text-gray-800 rounded-bl-md'
            }`}>
              {message.image && (
                <img src={message.image} alt="Uploaded" className="max-w-full rounded-lg mb-2" />
              )}
              <p className="whitespace-pre-wrap text-sm md:text-base">{message.content}</p>
            </div>
            {message.role === 'user' && (
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ml-2 flex-shrink-0 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
                <User className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
              </div>
            )}
          </div>
        ))}
        {promptLoading && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FFA500] to-violet-600 flex items-center justify-center mr-2 flex-shrink-0">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div className={`rounded-2xl px-4 py-3 rounded-bl-md ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#FFA500]" />
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>IGRIS is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={promptChatEndRef} />
      </div>

      {/* Image Preview */}
      {promptImagePreview && (
        <div className={`px-4 py-2 border-t ${isDark ? 'bg-[#0d0d14] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
          <div className="relative inline-block">
            <img src={promptImagePreview} alt="Preview" className="h-16 rounded-lg" />
            <button
              onClick={removePromptImage}
              className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Microphone & Audio Visualization */}
      <div className={`flex flex-col items-center py-3 border-t ${isDark ? 'bg-[#0d0d14] border-white/5' : 'bg-white border-gray-200'}`}>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isTranscribing}
          className={`relative p-3 rounded-full transition-all duration-300 mb-2 ${
            isRecording 
              ? 'bg-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.6)] animate-pulse' 
              : isTranscribing
              ? 'bg-blue-500/20 text-blue-400'
              : 'bg-gradient-to-r from-[#FFA500] to-[#FF6B00] text-white shadow-[0_0_25px_rgba(255,165,0,0.5)]'
          }`}
          title={isRecording ? "Stop recording" : isTranscribing ? "Transcribing..." : "🎤 Talk to IGRIS"}
        >
          {!isRecording && !isTranscribing && (
            <span className="absolute inset-[-4px] rounded-full bg-gradient-to-r from-[#FFA500] to-[#FF6B00] opacity-40 blur-md animate-pulse" />
          )}
          {isTranscribing ? (
            <Loader2 className="w-5 h-5 animate-spin relative z-10" />
          ) : isRecording ? (
            <Square className="w-5 h-5 relative z-10" />
          ) : (
            <div className="relative mic-glow">
              <Mic className="w-5 h-5 relative z-10 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
            </div>
          )}
        </button>
        
        {isRecording && (
          <div className="flex flex-col items-center gap-2 mb-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-ping mr-1" />
              <span className={`text-xs font-medium mr-2 ${isDark ? 'text-red-400' : 'text-red-600'}`}>Recording</span>
              {audioLevels.map((level, i) => (
                <div
                  key={i}
                  className="w-1 bg-gradient-to-t from-[#FFA500] to-red-500 rounded-full transition-all duration-75"
                  style={{ 
                    height: `${Math.max(6, level * 24)}px`,
                    opacity: 0.5 + level * 0.5
                  }}
                />
              ))}
            </div>
            <p className={`text-xs font-medium animate-pulse ${isDark ? 'text-red-400' : 'text-red-600'}`}>
              🎤 Tap the red button to send when done recording
            </p>
          </div>
        )}
      </div>

      {/* Chat Input */}
      <div className={`border-t p-3 md:p-4 ${isDark ? 'bg-[#0d0d14] border-white/5' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-2 md:gap-3 max-w-4xl mx-auto">
          <input
            type="file"
            ref={promptFileInputRef}
            onChange={handlePromptImageSelect}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={() => promptFileInputRef.current?.click()}
            className={`p-2.5 md:p-3 rounded-xl transition-colors flex-shrink-0 ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700'}`}
            title="Upload image"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <div className="flex-1 relative">
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !promptLoading && sendPromptMessage()}
              placeholder={isRecording ? "🎤 Recording..." : "Ask IGRIS anything about trading..."}
              className={`w-full border rounded-xl px-4 py-2.5 md:py-3 focus:outline-none focus:border-[#FFA500]/50 text-sm md:text-base ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'}`}
            />
          </div>
          <button
            onClick={sendPromptMessage}
            disabled={promptLoading || isTranscribing || (!promptInput.trim() && !promptImage)}
            className="p-2.5 md:p-3 rounded-xl bg-[#FFA500] hover:bg-[#FF8C00] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            title={isTranscribing ? "Transcribing audio..." : "Send message"}
          >
            {isTranscribing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
});

PromptTradingContent.displayName = 'PromptTradingContent';

export default PromptTradingContent;

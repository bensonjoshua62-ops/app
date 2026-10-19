import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Play, Clock, BookOpen, Wifi, BarChart3, 
  Brain, CreditCard, CheckCircle, Plus, Pencil, Trash2,
  Video, Upload, X, ExternalLink
} from 'lucide-react';
import { BACKEND_URL } from '../utils/config';

const LearnPage = () => {
  const navigate = useNavigate();
  const [tutorials, setTutorials] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTutorial, setEditingTutorial] = useState(null);
  const [loading, setLoading] = useState(true);

  const categories = [
    { id: 'All', label: 'All', icon: BookOpen },
    { id: 'Getting Started', label: 'Getting Started', icon: Play },
    { id: 'MT5 Connection', label: 'MT5 Connection', icon: Wifi },
    { id: 'Charts & Analysis', label: 'Charts & Analysis', icon: BarChart3 },
    { id: 'AI Trading', label: 'AI Trading', icon: Brain },
    { id: 'Subscription', label: 'Subscription & Billing', icon: CreditCard }
  ];

  useEffect(() => {
    // Check if user is admin
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setIsAdmin(user.is_admin || false);
    }
    fetchTutorials();
  }, []);

  const fetchTutorials = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/tutorials`);
      if (response.ok) {
        const data = await response.json();
        setTutorials(data.tutorials || []);
      } else {
        // Use default tutorials if API fails
        setTutorials(getDefaultTutorials());
      }
    } catch (error) {
      console.error('Failed to fetch tutorials:', error);
      setTutorials(getDefaultTutorials());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultTutorials = () => [
    {
      id: '1',
      title: 'How to create an account on IGRIS',
      description: 'Your first step into AI trading - create your IGRIS account and get started with intelligent market analysis.',
      category: 'Getting Started',
      duration: '4:20',
      videoUrl: '',
      thumbnailUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400',
      featured: true
    },
    {
      id: '2',
      title: 'How to install IGRIS on your device',
      description: 'Learn how to install the IGRIS PWA on any device. Works on desktop, mobile, and tablets for quick access to AI trading.',
      category: 'Getting Started',
      duration: '3:45',
      videoUrl: '',
      thumbnailUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400'
    },
    {
      id: '3',
      title: 'How to connect MT5 account on IGRIS',
      description: 'Connect your MetaTrader 5 broker account to IGRIS. Works with any MT5 broker worldwide for seamless trading.',
      category: 'MT5 Connection',
      duration: '5:30',
      videoUrl: '',
      thumbnailUrl: 'https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=400'
    },
    {
      id: '4',
      title: 'Exploring Charts & Analysis',
      description: 'Master IGRIS chart analysis tools. Learn how to use AI-powered insights to make better trading decisions.',
      category: 'Charts & Analysis',
      duration: '8:15',
      videoUrl: '',
      thumbnailUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=400'
    },
    {
      id: '5',
      title: 'IGRIS: Prompt Trading Tutorial',
      description: 'Revolutionary prompt trading - describe your strategy in plain English and let AI execute it automatically. The future of trading.',
      category: 'AI Trading',
      duration: '12:45',
      videoUrl: '',
      thumbnailUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400'
    },
    {
      id: '6',
      title: 'How to Upgrade to Pro Plan',
      description: 'Unlock all premium features - upgrade to Pro and access advanced AI, voice assistant, and VPS trading.',
      category: 'Subscription',
      duration: '3:00',
      videoUrl: '',
      thumbnailUrl: 'https://images.unsplash.com/photo-1559526324-593bc073d938?w=400'
    }
  ];

  const filteredTutorials = activeCategory === 'All' 
    ? tutorials 
    : tutorials.filter(t => t.category === activeCategory);

  const featuredTutorial = tutorials.find(t => t.featured) || tutorials[0];

  const handleDeleteTutorial = async (tutorialId) => {
    if (!window.confirm('Are you sure you want to delete this tutorial?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_URL}/api/tutorials/${tutorialId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        setTutorials(tutorials.filter(t => t.id !== tutorialId));
      }
    } catch (error) {
      console.error('Failed to delete tutorial:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <div className="border-b border-white/5 bg-[#0a0a0f]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-glass btn-glass-primary btn-glass-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Tutorial
            </button>
          )}
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <span className="text-[#FFA500] text-sm font-medium mb-4 block">Free Video Tutorials</span>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Learn<span className="text-[#FFA500]">IGRIS</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Master AI-powered trading with step-by-step video tutorials. From setup to advanced strategies - everything you need to succeed.
          </p>
          <div className="flex items-center justify-center gap-4 mt-6 text-sm text-gray-500">
            <span>{tutorials.length} tutorials</span>
            <span>•</span>
            <span>{categories.length - 1} categories</span>
            <span>•</span>
            <span className="text-emerald-400">100% free</span>
          </div>
        </div>

        {/* Featured Tutorial */}
        {featuredTutorial && (
          <div className="mb-12">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Play className="w-5 h-5 text-[#FFA500]" />
              Start Here
            </h2>
            <div className="glass-card p-6 flex flex-col md:flex-row gap-6">
              <div className="md:w-1/2 relative rounded-xl overflow-hidden bg-white/5 aspect-video">
                {featuredTutorial.videoUrl ? (
                  <iframe
                    src={featuredTutorial.videoUrl}
                    className="w-full h-full"
                    allowFullScreen
                    title={featuredTutorial.title}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <img 
                      src={featuredTutorial.thumbnailUrl} 
                      alt={featuredTutorial.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-[#FFA500] flex items-center justify-center">
                        <Play className="w-8 h-8 text-white ml-1" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="md:w-1/2 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[#FFA500] text-sm">{featuredTutorial.category}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-400 text-sm flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {featuredTutorial.duration}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">{featuredTutorial.title}</h3>
                <p className="text-gray-400 mb-4">{featuredTutorial.description}</p>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingTutorial(featuredTutorial)}
                      className="btn-glass btn-glass-secondary btn-glass-xs flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Category Filter */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Browse Tutorials</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeCategory === cat.id
                    ? 'bg-[#FFA500] text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {cat.label}
                {cat.id !== 'All' && (
                  <span className="ml-1 text-xs opacity-70">
                    ({tutorials.filter(t => t.category === cat.id).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tutorials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {filteredTutorials.map(tutorial => (
            <div key={tutorial.id} className="glass-card overflow-hidden group">
              <div className="relative aspect-video bg-white/5">
                {tutorial.thumbnailUrl ? (
                  <img 
                    src={tutorial.thumbnailUrl} 
                    alt={tutorial.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Video className="w-12 h-12 text-gray-600" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-[#FFA500] flex items-center justify-center">
                    <Play className="w-6 h-6 text-white ml-0.5" />
                  </div>
                </div>
                <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-xs text-white">
                  {tutorial.duration}
                </div>
              </div>
              <div className="p-4">
                <span className="text-[#FFA500] text-xs font-medium">{tutorial.category}</span>
                <h3 className="text-white font-semibold mt-1 mb-2 line-clamp-2">{tutorial.title}</h3>
                <p className="text-gray-400 text-sm line-clamp-2">{tutorial.description}</p>
                {isAdmin && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
                    <button
                      onClick={() => setEditingTutorial(tutorial)}
                      className="text-gray-400 hover:text-white text-xs flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTutorial(tutorial.id)}
                      className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="glass-card p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Ready to Start Trading?</h2>
          <p className="text-gray-400 mb-6">
            You've learned the basics. Now put your knowledge into action with IGRIS AI. 
            Start trading with AI-powered analysis in minutes.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/signup" className="btn-glass btn-glass-primary">
              Start Free Trial →
            </Link>
            <Link to="/dashboard" className="btn-glass btn-glass-secondary">
              Go to Dashboard
            </Link>
          </div>
          <p className="text-gray-500 text-sm mt-4">
            14-day free trial • No credit card required • Cancel anytime
          </p>
        </div>
      </div>

      {/* Add/Edit Tutorial Modal */}
      {(showAddModal || editingTutorial) && (
        <TutorialModal
          tutorial={editingTutorial}
          onClose={() => {
            setShowAddModal(false);
            setEditingTutorial(null);
          }}
          onSave={(savedTutorial) => {
            if (editingTutorial) {
              setTutorials(tutorials.map(t => t.id === savedTutorial.id ? savedTutorial : t));
            } else {
              setTutorials([...tutorials, savedTutorial]);
            }
            setShowAddModal(false);
            setEditingTutorial(null);
          }}
        />
      )}
    </div>
  );
};

// Tutorial Modal Component for Admin
const TutorialModal = ({ tutorial, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: tutorial?.title || '',
    description: tutorial?.description || '',
    category: tutorial?.category || 'Getting Started',
    duration: tutorial?.duration || '',
    videoUrl: tutorial?.videoUrl || '',
    thumbnailUrl: tutorial?.thumbnailUrl || '',
    featured: tutorial?.featured || false
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      const url = tutorial 
        ? `${BACKEND_URL}/api/tutorials/${tutorial.id}`
        : `${BACKEND_URL}/api/tutorials`;
      
      const response = await fetch(url, {
        method: tutorial ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        onSave(data.tutorial || { ...formData, id: Date.now().toString() });
      }
    } catch (error) {
      console.error('Failed to save tutorial:', error);
      // Still save locally for demo
      onSave({ ...formData, id: tutorial?.id || Date.now().toString() });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#12121a] rounded-2xl border border-white/10 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">
            {tutorial ? 'Edit Tutorial' : 'Add New Tutorial'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="glass-input w-full px-4 py-2 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="glass-input w-full px-4 py-2 text-white h-24 resize-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="glass-input w-full px-4 py-2 text-white bg-transparent"
              >
                <option value="Getting Started">Getting Started</option>
                <option value="MT5 Connection">MT5 Connection</option>
                <option value="Charts & Analysis">Charts & Analysis</option>
                <option value="AI Trading">AI Trading</option>
                <option value="Subscription">Subscription & Billing</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Duration</label>
              <input
                type="text"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="glass-input w-full px-4 py-2 text-white"
                placeholder="e.g. 5:30"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Video URL (YouTube/Vimeo embed)</label>
            <input
              type="url"
              value={formData.videoUrl}
              onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
              className="glass-input w-full px-4 py-2 text-white"
              placeholder="https://www.youtube.com/embed/..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Thumbnail URL</label>
            <input
              type="url"
              value={formData.thumbnailUrl}
              onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
              className="glass-input w-full px-4 py-2 text-white"
              placeholder="https://..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="featured"
              checked={formData.featured}
              onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
              className="w-4 h-4 rounded border-gray-600"
            />
            <label htmlFor="featured" className="text-sm text-gray-400">Featured tutorial</label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-glass btn-glass-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-glass btn-glass-primary flex-1"
            >
              {saving ? 'Saving...' : (tutorial ? 'Update' : 'Add Tutorial')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LearnPage;

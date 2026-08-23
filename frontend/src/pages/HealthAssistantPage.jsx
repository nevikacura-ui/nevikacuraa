import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import {
  ArrowLeft, Send, Bot, User, Loader2, Plus, Trash2,
  Sparkles, Heart, Apple, Moon, Brain, Footprints,
  Droplet, HeartPulse, Clock, ChevronRight
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';

const API = process.env.REACT_APP_BACKEND_URL;

const ICON_MAP = {
  apple: Apple, droplet: Droplet, footprints: Footprints,
  moon: Moon, brain: Brain, 'heart-pulse': HeartPulse,
};

const QUICK_PROMPTS = [
  "What are home remedies for cold and cough?",
  "How to manage diabetes with Indian diet?",
  "Tips for better sleep",
  "Safe exercises during pregnancy",
  "How to reduce stress naturally?",
  "What foods boost immunity?",
];

const HealthAssistantPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [tips, setTips] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [showSessions, setShowSessions] = useState(false);
  const chatEndRef = useRef(null);
  const phone = user?.phone || '';

  useEffect(() => {
    fetchTips();
    if (phone) fetchSessions();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchTips = async () => {
    try {
      const res = await axios.get(`${API}/api/health-assistant/tips`);
      setTips(res.data.tips || []);
    } catch {}
  };

  const fetchSessions = async () => {
    try {
      const res = await axios.get(`${API}/api/health-assistant/sessions/${phone}`);
      setSessions(res.data.sessions || []);
    } catch {}
  };

  const loadSession = async (sid) => {
    try {
      const res = await axios.get(`${API}/api/health-assistant/session/${sid}`);
      setMessages(res.data.messages || []);
      setSessionId(sid);
      setShowSessions(false);
    } catch { toast.error('Failed to load session'); }
  };

  const startNewChat = () => {
    setMessages([]);
    setSessionId(null);
    setShowSessions(false);
  };

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg, timestamp: new Date().toISOString() }]);
    setLoading(true);

    try {
      const res = await axios.post(`${API}/api/health-assistant/chat`, {
        message: msg, session_id: sessionId, phone,
      });
      setSessionId(res.data.session_id);
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply, timestamp: new Date().toISOString() }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. For emergencies, call 112.', timestamp: new Date().toISOString() }]);
    }
    setLoading(false);
  };

  const deleteSession = async (sid, e) => {
    e.stopPropagation();
    try {
      await axios.delete(`${API}/api/health-assistant/session/${sid}`);
      setSessions(prev => prev.filter(s => s.session_id !== sid));
      if (sessionId === sid) startNewChat();
      toast.success('Session deleted');
    } catch {}
  };

  // Empty state — show tips & quick prompts
  const showEmptyState = messages.length === 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A12' }} data-testid="health-assistant-page">
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3"
        style={{ background: 'rgba(10,10,18,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-base text-white flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-400" /> CuraBot
          </h1>
          <p className="text-[11px] text-gray-500">AI Health Assistant</p>
        </div>
        <button onClick={() => { setShowSessions(!showSessions); if (!showSessions) fetchSessions(); }}
          className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white transition" style={{ background: 'rgba(255,255,255,0.06)' }}
          data-testid="toggle-sessions-btn">
          <Clock className="w-3.5 h-3.5 inline mr-1" /> History
        </button>
        <button onClick={startNewChat} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}
          data-testid="new-chat-btn">
          <Plus className="w-4 h-4 text-emerald-400" />
        </button>
      </header>

      {/* Sessions panel */}
      {showSessions && (
        <div className="px-4 py-3 space-y-2 border-b border-white/5" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <p className="text-xs font-semibold text-gray-400 uppercase">Previous Chats</p>
          {sessions.length === 0 && <p className="text-xs text-gray-600">No previous chats</p>}
          {sessions.slice(0, 5).map(s => (
            <button key={s.session_id} onClick={() => loadSession(s.session_id)}
              className="w-full flex items-center gap-2 p-2.5 rounded-lg text-left hover:bg-white/5 transition group">
              <Bot className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white truncate">{s.preview || 'Chat session'}</p>
                <p className="text-[10px] text-gray-600">{new Date(s.updated_at).toLocaleDateString()}</p>
              </div>
              <button onClick={(e) => deleteSession(s.session_id, e)} className="opacity-0 group-hover:opacity-100 p-1">
                <Trash2 className="w-3 h-3 text-red-400" />
              </button>
            </button>
          ))}
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ paddingBottom: '160px' }}>
        {showEmptyState && (
          <>
            {/* Welcome */}
            <div className="text-center pt-6 pb-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                <Bot className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-lg font-bold text-white">Hi! I'm CuraBot</h2>
              <p className="text-sm text-gray-400 mt-1">Your AI health companion. Ask me anything about health, nutrition, fitness, or wellness.</p>
              <p className="text-[11px] text-amber-400/70 mt-2">I provide general guidance only. Always consult a doctor for medical advice.</p>
            </div>

            {/* Health Tips */}
            {tips.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Daily Health Tips</p>
                <div className="grid grid-cols-2 gap-2">
                  {tips.slice(0, 4).map((tip, i) => {
                    const Icon = ICON_MAP[tip.icon] || Heart;
                    return (
                      <div key={i} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <Icon className="w-4 h-4 text-emerald-400 mb-1.5" />
                        <p className="text-[10px] text-emerald-400 font-medium mb-0.5">{tip.category}</p>
                        <p className="text-[11px] text-gray-300 leading-relaxed">{tip.tip}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Prompts */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Try asking</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((prompt, i) => (
                  <button key={i} onClick={() => sendMessage(prompt)}
                    className="px-3 py-2 rounded-full text-xs text-gray-300 hover:text-white hover:bg-white/10 transition"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    data-testid={`quick-prompt-${i}`}>
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            )}
            <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-emerald-600 text-white rounded-br-sm'
                : 'text-gray-200 rounded-bl-sm'
            }`} style={msg.role === 'assistant' ? { background: 'rgba(255,255,255,0.06)' } : {}}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-blue-500/15 flex items-center justify-center shrink-0 mt-1">
                <User className="w-3.5 h-3.5 text-blue-400" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="p-3 rounded-2xl rounded-bl-sm" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input bar */}
      <div className="fixed bottom-16 left-0 right-0 px-4 py-3 z-40"
        style={{ background: 'rgba(10,10,18,0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex gap-2 items-end">
          <Input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask about health, nutrition, fitness..."
            className="flex-1 h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 rounded-xl"
            data-testid="chat-input" disabled={loading} />
          <Button onClick={() => sendMessage()} disabled={!input.trim() || loading}
            className="h-11 w-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 p-0"
            data-testid="send-btn">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default HealthAssistantPage;

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mic, ArrowLeft, Calendar, Clock, User, Stethoscope, TestTube, Pill,
  Send, Loader2, Sparkles, Volume2, MapPin, Phone, CheckCircle2, PartyPopper
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ServiceHeader from '@/components/ServiceHeader';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/context/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL;

const SERVICE_META = {
  diagyn: { label: 'DiaGyn Clinic', color: '#14b8a6', icon: Stethoscope },
  mango: { label: 'Mango Labs', color: '#f59e0b', icon: TestTube },
  pharmacy: { label: 'Orange Pharmacy', color: '#f97316', icon: Pill },
};

const QUICK_PROMPTS = [
  "Book Dr. Vikas tomorrow 3 PM",
  "Blood test at Mango Labs",
  "Gynaec consultation Friday",
  "Schedule ECG tomorrow morning",
];

const VoiceBookingPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [intent, setIntent] = useState({});
  const [readyToBook, setReadyToBook] = useState(false);
  const [booking, setBooking] = useState(null);
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  // Seed initial AI greeting
  useEffect(() => {
    const name = user?.name?.split(' ')[0] || '';
    setMessages([{
      role: 'assistant',
      text: `Hi${name ? ` ${name}` : ''}! I'm Cura, your booking assistant. Tell me what you need — like "Book Dr. Vikas tomorrow at 3 PM" or "I need a blood test".`
    }]);
  }, [user]);

  // Speech recognition setup
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSpeechSupported(false); return; }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-IN';
    rec.onresult = (e) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setInput(text);
    };
    rec.onerror = (e) => { if (e.error !== 'aborted') toast.error('Mic error'); setIsListening(false); };
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    return () => { try { rec.abort(); } catch {} };
  }, []);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, processing]);

  const toggleMic = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInput('');
      try { recognitionRef.current.start(); setIsListening(true); } catch { toast.error('Mic unavailable'); }
    }
  }, [isListening]);

  const sendMessage = async (text) => {
    if (!text?.trim() || processing) return;
    const userMsg = { role: 'user', text: text.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setProcessing(true);
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); }

    try {
      const res = await fetch(`${API}/api/voice-booking/converse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, text: m.text })),
          current_intent: intent,
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', text: data.reply }]);
      if (data.intent) setIntent(data.intent);
      setReadyToBook(data.ready_to_book);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: "Sorry, something went wrong. Could you try again?" }]);
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (bookingInProgress) return;
    setBookingInProgress(true);
    try {
      const payload = {
        doctor: intent.doctor_name || 'Doctor',
        clinic: intent.clinic || 'Pushpa Clinic',
        date: intent.date,
        time: intent.time,
        patient_name: intent.patient_name || user?.name || 'Patient',
        patient_phone: intent.patient_phone || user?.phone || '',
        patient_email: user?.email || null,
        source: 'voice_booking',
      };
      const res = await fetch(`${API}/api/voice-booking/confirm-booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setBooking(data);
        toast.success(`Booked! ID #${data.booking_id}`);
      } else {
        toast.error(data.detail || 'Booking failed');
        setMessages(prev => [...prev, { role: 'assistant', text: `Booking failed: ${data.detail || 'Please try a different time.'}` }]);
      }
    } catch {
      toast.error('Booking request failed');
    } finally {
      setBookingInProgress(false);
    }
  };

  const resetChat = () => {
    setMessages([{ role: 'assistant', text: "Let's start fresh! What appointment would you like to book?" }]);
    setIntent({});
    setReadyToBook(false);
    setBooking(null);
    setInput('');
  };

  // ──── RENDER ────
  if (booking) {
    return (
      <div className="min-h-screen bg-[#0a0b14]" data-testid="voice-booking-page">
        <ServiceHeader />
        <main className="max-w-lg mx-auto px-4 py-10 flex flex-col items-center text-center pb-28">
          <div className="w-20 h-20 rounded-full bg-teal-500/20 flex items-center justify-center mb-5 animate-in zoom-in duration-500">
            <CheckCircle2 className="w-10 h-10 text-teal-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>Appointment Booked!</h2>
          <p className="text-white/40 text-sm mb-6">Booking ID: <span className="text-teal-400 font-mono font-bold">#{booking.booking_id}</span></p>

          <div className="w-full space-y-2 mb-6">
            <InfoRow icon={User} label="Patient" value={booking.patient_name} />
            <InfoRow icon={Stethoscope} label="Doctor" value={booking.doctor} />
            <InfoRow icon={MapPin} label="Clinic" value={booking.clinic} />
            <InfoRow icon={Calendar} label="Date" value={booking.date} />
            <InfoRow icon={Clock} label="Time" value={booking.time} />
          </div>

          <div className="flex gap-2 w-full">
            <Button onClick={resetChat} className="flex-1 h-11 bg-white/10 hover:bg-white/15 text-white rounded-xl" data-testid="book-another-btn">
              Book Another
            </Button>
            <Button onClick={() => navigate('/')} className="flex-1 h-11 bg-teal-600 hover:bg-teal-500 text-white rounded-xl" data-testid="go-home-btn">
              Go Home
            </Button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0b14] flex flex-col" data-testid="voice-booking-page">
      <ServiceHeader />

      {/* Header */}
      <div className="max-w-lg mx-auto w-full px-4 pt-4 pb-2 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5" data-testid="voice-back-btn">
          <ArrowLeft className="w-5 h-5 text-white/70" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Voice Booking</h1>
          <p className="text-[10px] text-white/30">AI-powered conversational booking</p>
        </div>
        <Sparkles className="w-5 h-5 text-teal-400 animate-pulse" />
      </div>

      {/* Intent Progress Bar */}
      <IntentProgress intent={intent} />

      {/* Chat Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 max-w-lg mx-auto w-full space-y-3 py-3" style={{ maxHeight: 'calc(100vh - 280px)' }}>
        {messages.map((msg, i) => (
          <ChatBubble key={i} message={msg} />
        ))}

        {processing && (
          <div className="flex items-center gap-2 px-4 py-2">
            <div className="w-7 h-7 rounded-full bg-teal-500/20 flex items-center justify-center">
              <Loader2 className="w-3.5 h-3.5 text-teal-400 animate-spin" />
            </div>
            <span className="text-xs text-white/30">Cura is typing...</span>
          </div>
        )}

        {/* Ready to Book Card */}
        {readyToBook && !processing && (
          <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-500/15 to-emerald-500/10 border border-teal-500/25 animate-in fade-in slide-in-from-bottom-2 duration-300" data-testid="confirm-booking-card">
            <p className="text-sm font-semibold text-teal-300 mb-3">Ready to book:</p>
            <div className="space-y-1.5 mb-4">
              {intent.doctor_name && <MiniRow icon={Stethoscope} value={`${intent.doctor_name}${intent.clinic ? ` — ${intent.clinic}` : ''}`} />}
              {intent.date && <MiniRow icon={Calendar} value={intent.date} />}
              {intent.time && <MiniRow icon={Clock} value={intent.time} />}
              {intent.patient_name && <MiniRow icon={User} value={intent.patient_name} />}
              {intent.patient_phone && <MiniRow icon={Phone} value={intent.patient_phone} />}
            </div>
            <Button
              onClick={handleConfirmBooking}
              disabled={bookingInProgress}
              className="w-full h-11 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl"
              data-testid="confirm-voice-booking-btn"
            >
              {bookingInProgress ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              {bookingInProgress ? 'Booking...' : 'Confirm Booking'}
            </Button>
          </div>
        )}

        {/* Quick Prompts (only show at start) */}
        {messages.length <= 1 && !processing && (
          <div className="flex flex-wrap gap-2 pt-2">
            {QUICK_PROMPTS.map((p, i) => (
              <button
                key={i}
                onClick={() => sendMessage(p)}
                className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/50 hover:bg-white/10 hover:text-white/70 transition-all active:scale-95"
                data-testid={`quick-prompt-${i}`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="max-w-lg mx-auto w-full px-4 pb-24 pt-2">
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/5 border border-white/10">
          {speechSupported && (
            <button
              onClick={toggleMic}
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${isListening ? 'bg-teal-500 shadow-[0_0_20px_rgba(20,184,166,0.3)]' : 'bg-white/5 hover:bg-white/10'}`}
              data-testid="mic-btn"
            >
              {isListening ? <Volume2 className="w-4 h-4 text-white animate-pulse" /> : <Mic className="w-4 h-4 text-teal-400" />}
            </button>
          )}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
            placeholder={isListening ? 'Listening...' : 'Type your message...'}
            className="flex-1 h-10 bg-transparent text-sm text-white placeholder:text-white/20 focus:outline-none"
            data-testid="voice-text-input"
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={processing || (!input.trim() && !isListening)}
            className="w-10 h-10 p-0 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-30 flex-shrink-0"
            data-testid="send-text-btn"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};


// ──── Sub-Components ────

const ChatBubble = ({ message }) => {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-1 duration-200`}>
      <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
        isUser
          ? 'bg-teal-600 text-white rounded-br-md'
          : 'bg-white/8 text-white/80 rounded-bl-md border border-white/5'
      }`}>
        {!isUser && <span className="text-[10px] text-teal-400/60 font-semibold block mb-0.5">Cura</span>}
        {message.text}
      </div>
    </div>
  );
};

const IntentProgress = ({ intent }) => {
  const fields = [
    { key: 'service', label: 'Service', filled: !!intent.service },
    { key: 'doctor_name', label: 'Doctor', filled: !!intent.doctor_name },
    { key: 'date', label: 'Date', filled: !!intent.date },
    { key: 'time', label: 'Time', filled: !!intent.time },
    { key: 'patient_name', label: 'Name', filled: !!intent.patient_name },
    { key: 'patient_phone', label: 'Phone', filled: !!intent.patient_phone },
  ];
  const filledCount = fields.filter(f => f.filled).length;
  if (filledCount === 0) return null;

  return (
    <div className="max-w-lg mx-auto w-full px-4 py-2">
      <div className="flex gap-1">
        {fields.map((f) => (
          <div key={f.key} className="flex-1 flex flex-col items-center gap-1">
            <div className={`h-1 w-full rounded-full transition-all duration-500 ${f.filled ? 'bg-teal-500' : 'bg-white/10'}`} />
            <span className={`text-[8px] tracking-wider uppercase ${f.filled ? 'text-teal-400' : 'text-white/20'}`}>{f.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const InfoRow = ({ icon: Icon, label, value }) => (
  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5" data-testid={`info-${label.toLowerCase()}`}>
    <div className="w-8 h-8 rounded-lg bg-teal-500/15 flex items-center justify-center">
      <Icon className="w-4 h-4 text-teal-400" />
    </div>
    <div className="text-left">
      <p className="text-[10px] text-white/30 uppercase tracking-wider">{label}</p>
      <p className="text-sm text-white font-medium">{value}</p>
    </div>
  </div>
);

const MiniRow = ({ icon: Icon, value }) => (
  <div className="flex items-center gap-2 text-xs text-white/70">
    <Icon className="w-3.5 h-3.5 text-teal-400" />
    <span>{value}</span>
  </div>
);

export default VoiceBookingPage;

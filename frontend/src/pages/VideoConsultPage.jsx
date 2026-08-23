import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import {
  ArrowLeft, Video, VideoOff, Mic, MicOff, PhoneOff,
  Loader2, Monitor, MessageSquare, Users, Clock, Shield
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const VideoConsultPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [roomUrl, setRoomUrl] = useState(searchParams.get('room') || '');
  const [creating, setCreating] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [consultations, setConsultations] = useState([]);
  const iframeRef = useRef(null);
  const phone = user?.phone || '';

  useEffect(() => {
    if (phone) fetchConsultations();
    // If room URL in params, auto-join
    if (searchParams.get('room')) setInCall(true);
  }, []);

  const fetchConsultations = async () => {
    try {
      const res = await axios.get(`${API}/api/video-consult/consultations/${phone}`);
      setConsultations(res.data.consultations || []);
    } catch {}
  };

  const createRoom = async () => {
    setCreating(true);
    try {
      const res = await axios.post(`${API}/api/video-consult/create-room`, {
        patient_phone: phone, doctor_name: 'Doctor',
      });
      setRoomUrl(res.data.room_url);
      setInCall(true);
      toast.success('Video room created!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create room');
    }
    setCreating(false);
  };

  const endCall = () => {
    setInCall(false);
    setRoomUrl('');
    toast.info('Call ended');
  };

  // In-call view — embed Daily.co Prebuilt
  if (inCall && roomUrl) {
    return (
      <div className="h-screen w-screen bg-black flex flex-col" data-testid="video-call-view">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-900">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-green-400" />
            <span className="text-sm text-white font-medium">Video Consultation</span>
          </div>
          <Button onClick={endCall} variant="destructive" size="sm" className="gap-1.5" data-testid="end-call-btn">
            <PhoneOff className="w-4 h-4" /> End Call
          </Button>
        </div>
        <iframe ref={iframeRef} src={roomUrl} allow="camera; microphone; fullscreen; speaker; display-capture"
          className="flex-1 w-full border-0" title="Video Consultation"
          data-testid="daily-iframe" />
      </div>
    );
  }

  // Lobby view
  return (
    <div className="min-h-screen pb-24" style={{ background: '#0A0A12' }} data-testid="video-consult-page">
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-3" style={{ background: 'rgba(10,10,18,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <div>
            <h1 className="font-bold text-base text-white flex items-center gap-1.5">
              <Video className="w-4 h-4 text-green-400" /> Video Consultation
            </h1>
            <p className="text-[11px] text-gray-500">Consult with doctors from home</p>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-5">
        {/* Hero */}
        <div className="rounded-2xl p-5 text-center" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(59,130,246,0.1))', border: '1px solid rgba(16,185,129,0.2)' }}>
          <Video className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white">Talk to a Doctor Now</h2>
          <p className="text-xs text-gray-300 mt-1">HD video consultations with prescription support</p>
          <div className="flex justify-center gap-4 mt-3">
            {[
              { icon: Shield, label: 'HIPAA Secure' },
              { icon: Monitor, label: 'HD Quality' },
              { icon: MessageSquare, label: 'Chat Support' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1 text-[10px] text-gray-400">
                <item.icon className="w-3 h-3 text-green-400" /> {item.label}
              </div>
            ))}
          </div>
        </div>

        {/* Start / Join */}
        <div className="space-y-3">
          <Button onClick={createRoom} disabled={creating}
            className="w-full h-12 rounded-xl bg-green-600 hover:bg-green-700 text-sm font-semibold gap-2"
            data-testid="start-video-btn">
            {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Video className="w-5 h-5" /> Start Video Consultation</>}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5" /></div>
            <div className="relative flex justify-center"><span className="px-3 text-xs text-gray-500" style={{ background: '#0A0A12' }}>or join existing</span></div>
          </div>

          <div className="flex gap-2">
            <Input value={roomUrl} onChange={e => setRoomUrl(e.target.value)}
              placeholder="Paste consultation link..."
              className="flex-1 h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 text-sm"
              data-testid="join-link-input" />
            <Button onClick={() => roomUrl && setInCall(true)} disabled={!roomUrl}
              className="h-11 px-4 bg-blue-600 hover:bg-blue-700" data-testid="join-btn">
              Join
            </Button>
          </div>
        </div>

        {/* How it works */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">How it works</h3>
          <div className="space-y-2">
            {[
              { step: '1', title: 'Start a consultation', desc: 'Click the button above to create a secure video room' },
              { step: '2', title: 'Share with your doctor', desc: 'Send the link to your doctor or they will join automatically' },
              { step: '3', title: 'Consult & get prescription', desc: 'Video call with screen share, chat, and digital prescription' },
            ].map((item, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center shrink-0 text-xs font-bold text-green-400">{item.step}</div>
                <div>
                  <p className="text-sm font-medium text-white">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Consultations */}
        {consultations.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Recent Consultations</h3>
            {consultations.slice(0, 5).map((c, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <Video className="w-4 h-4 text-green-400" />
                <div className="flex-1">
                  <p className="text-xs text-white">{c.doctor_name || 'Consultation'}</p>
                  <p className="text-[10px] text-gray-500">{new Date(c.created_at).toLocaleString()}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${c.status === 'completed' ? 'bg-green-500/15 text-green-400' : 'bg-gray-500/15 text-gray-400'}`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoConsultPage;

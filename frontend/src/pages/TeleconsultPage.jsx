import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Video, VideoOff, Mic, MicOff, Phone, PhoneOff, MessageSquare, Monitor, Clock, Calendar, Star, CheckCircle, User, Shield, Wifi, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const DOCTORS = [
  { id: 'dr-neha-patel', name: 'Dr. Neha Patel', specialty: 'OB-GYN', fee: 500, rating: 4.8, experience: 15, available: true, nextSlot: '10:30 AM' },
  { id: 'dr-vikas-jha', name: 'Dr. Vikas Jha', specialty: 'OB-GYN', fee: 400, rating: 4.6, experience: 12, available: true, nextSlot: '11:00 AM' },
];

const PreCallChecklist = ({ onReady }) => {
  const [checks, setChecks] = useState({ camera: false, mic: false, internet: false, quiet: false });
  const allGood = Object.values(checks).every(Boolean);

  useEffect(() => {
    // Auto-check internet
    setChecks(c => ({ ...c, internet: navigator.onLine }));
    // Auto-check camera & mic
    navigator.mediaDevices?.enumerateDevices().then(devices => {
      const hasCam = devices.some(d => d.kind === 'videoinput');
      const hasMic = devices.some(d => d.kind === 'audioinput');
      setChecks(c => ({ ...c, camera: hasCam, mic: hasMic }));
    }).catch(() => {});
  }, []);

  const toggle = (key) => setChecks(c => ({ ...c, [key]: !c[key] }));

  return (
    <div className="rounded-2xl p-5 bg-white shadow-sm" style={{ border: '1px solid rgba(31,79,70,0.06)' }} data-testid="pre-call-checklist">
      <h3 className="font-bold text-[#1A2B28] mb-4">Pre-Call Checklist</h3>
      {[
        { key: 'camera', icon: Camera, label: 'Camera is working' },
        { key: 'mic', icon: Mic, label: 'Microphone is working' },
        { key: 'internet', icon: Wifi, label: 'Internet connection stable' },
        { key: 'quiet', icon: Shield, label: 'In a quiet place' },
      ].map(item => (
        <button key={item.key} onClick={() => toggle(item.key)}
          className="flex items-center gap-3 w-full py-3" style={{ borderBottom: '1px solid #f5f5f5' }}
          data-testid={`check-${item.key}`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
            checks[item.key] ? 'bg-emerald-500' : 'bg-gray-200'
          }`}>
            {checks[item.key] && <CheckCircle className="w-4 h-4 text-white" />}
          </div>
          <item.icon className={`w-4 h-4 ${checks[item.key] ? 'text-emerald-600' : 'text-gray-400'}`} />
          <span className={`text-sm ${checks[item.key] ? 'text-[#1A2B28] font-medium' : 'text-gray-400'}`}>{item.label}</span>
        </button>
      ))}
      <Button onClick={onReady} disabled={!allGood}
        className="w-full h-12 mt-4 rounded-xl font-bold text-white"
        style={{ background: allGood ? 'linear-gradient(135deg, #1F4F46, #2E6B5F)' : '#ccc' }}
        data-testid="join-call-btn">
        <Video className="w-4 h-4 mr-2" /> Join Consultation
      </Button>
    </div>
  );
};

const WaitingRoom = ({ doctor, onJoin }) => {
  const [dots, setDots] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setDots(d => (d + 1) % 4), 500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-12" data-testid="waiting-room">
      {/* Animated circles */}
      <div className="relative w-32 h-32 mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-[#1F4F46]/10 animate-ping" style={{ animationDuration: '2s' }} />
        <div className="absolute inset-2 rounded-full border-4 border-[#1F4F46]/20 animate-ping" style={{ animationDuration: '2.5s' }} />
        <div className="absolute inset-4 rounded-full bg-[#1F4F46]/5 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
            style={{ background: 'linear-gradient(135deg, #1F4F46, #2E6B5F)' }}>
            {doctor?.name?.split(' ').slice(1).map(w => w[0]).join('') || 'DR'}
          </div>
        </div>
      </div>
      <p className="text-[#1A2B28] font-semibold">Waiting for {doctor?.name || 'Doctor'}{'.'.repeat(dots)}</p>
      <p className="text-sm text-[#8A9E99] mt-1">Your doctor will join shortly</p>

      <Button onClick={onJoin}
        className="mt-8 h-11 px-6 rounded-xl font-bold text-white"
        style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
        data-testid="start-demo-call">
        <Video className="w-4 h-4 mr-2" /> Start Demo Call
      </Button>
    </div>
  );
};

const VideoCall = ({ doctor, onEnd }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 bg-black" data-testid="video-call-screen">
      {/* Doctor video (placeholder) */}
      <div className="absolute inset-0 flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)' }}>
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-4"
            style={{ background: 'rgba(255,255,255,0.1)', border: '2px solid rgba(255,255,255,0.2)' }}>
            {doctor?.name?.split(' ').slice(1).map(w => w[0]).join('') || 'DR'}
          </div>
          <p className="text-white font-semibold">{doctor?.name || 'Doctor'}</p>
          <p className="text-white/50 text-sm">{doctor?.specialty}</p>
        </div>
      </div>

      {/* Self view (small) */}
      <div className="absolute top-16 right-4 w-28 h-36 rounded-2xl overflow-hidden shadow-xl"
        style={{ background: isVideoOff ? '#1a1a1a' : 'linear-gradient(135deg, #334155, #475569)', border: '2px solid rgba(255,255,255,0.1)' }}>
        {isVideoOff ? (
          <div className="flex items-center justify-center h-full">
            <VideoOff className="w-6 h-6 text-gray-500" />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <User className="w-8 h-8 text-gray-400" />
          </div>
        )}
      </div>

      {/* Duration */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-black/30 backdrop-blur-sm">
        <span className="text-white text-sm font-medium">{fmt(duration)}</span>
      </div>

      {/* Controls */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4 px-6">
        <button onClick={() => setIsMuted(!isMuted)}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
            isMuted ? 'bg-red-500' : 'bg-white/15 backdrop-blur-sm'
          }`}
          data-testid="toggle-mic">
          {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
        </button>

        <button onClick={() => setIsVideoOff(!isVideoOff)}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
            isVideoOff ? 'bg-red-500' : 'bg-white/15 backdrop-blur-sm'
          }`}
          data-testid="toggle-video">
          {isVideoOff ? <VideoOff className="w-6 h-6 text-white" /> : <Video className="w-6 h-6 text-white" />}
        </button>

        <button onClick={() => setShowChat(!showChat)}
          className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center"
          data-testid="toggle-chat">
          <MessageSquare className="w-6 h-6 text-white" />
        </button>

        <button onClick={onEnd}
          className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/30"
          data-testid="end-call-btn">
          <PhoneOff className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  );
};

export default function TeleconsultPage() {
  const navigate = useNavigate();
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [phase, setPhase] = useState('select'); // select -> checklist -> waiting -> call -> summary
  const [callDuration, setCallDuration] = useState(0);

  const handleBook = (doctor) => {
    setSelectedDoctor(doctor);
    setPhase('checklist');
    toast.success(`Booking with ${doctor.name}`);
  };

  const handleEndCall = () => {
    setPhase('summary');
    toast.success('Consultation ended');
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: '#F7FAF9' }}>
      {/* Video call overlay */}
      {phase === 'call' && (
        <VideoCall doctor={selectedDoctor} onEnd={handleEndCall} />
      )}

      {phase !== 'call' && (
        <>
          {/* Header */}
          <div style={{ background: 'linear-gradient(180deg, #1F4F46 0%, #2A6B5E 100%)' }} className="px-4 pt-4 pb-6">
            <div className="flex items-center gap-3">
              <button onClick={() => phase === 'select' ? navigate(-1) : setPhase('select')} className="p-2 rounded-full bg-white/10" data-testid="back-btn">
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-white">Teleconsultation</h1>
                <p className="text-xs text-white/60">Video consult from home</p>
              </div>
            </div>
          </div>

          <div className="px-4 mt-4 space-y-4">
            {/* Phase: Doctor Selection */}
            {phase === 'select' && (
              <>
                {/* Features strip */}
                <div className="flex gap-3 overflow-x-auto no-scrollbar">
                  {[
                    { icon: Video, label: 'HD Video', color: '#6366F1' },
                    { icon: Shield, label: 'Private', color: '#10B981' },
                    { icon: Clock, label: '15-min slots', color: '#F59E0B' },
                    { icon: Monitor, label: 'E-Prescription', color: '#EC4899' },
                  ].map(f => (
                    <div key={f.label} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white shadow-sm flex-shrink-0" style={{ border: '1px solid rgba(31,79,70,0.06)' }}>
                      <f.icon className="w-4 h-4" style={{ color: f.color }} />
                      <span className="text-xs font-medium text-[#4A6B64] whitespace-nowrap">{f.label}</span>
                    </div>
                  ))}
                </div>

                <h3 className="font-bold text-[#1A2B28]">Available Doctors</h3>

                {DOCTORS.map(doc => (
                  <div key={doc.id} className="rounded-2xl p-4 bg-white shadow-sm" style={{ border: '1px solid rgba(31,79,70,0.06)' }}
                    data-testid={`teleconsult-doctor-${doc.id}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold"
                        style={{ background: 'linear-gradient(135deg, #1F4F46, #2E6B5F)' }}>
                        {doc.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-[#1A2B28] text-sm">{doc.name}</h4>
                        <p className="text-xs text-[#8A9E99]">{doc.specialty} - {doc.experience}yr exp</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span className="text-xs text-[#4A6B64]">{doc.rating}</span>
                          <span className="text-xs text-[#8A9E99]">-</span>
                          <span className="text-xs font-medium text-emerald-600">₹{doc.fee}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid #f5f5f5' }}>
                      <div className="flex items-center gap-1.5">
                        {doc.available && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                        <span className="text-xs text-[#4A6B64]">Next slot: {doc.nextSlot}</span>
                      </div>
                      <Button onClick={() => handleBook(doc)}
                        className="h-9 px-5 rounded-xl text-xs font-bold text-white"
                        style={{ background: 'linear-gradient(135deg, #1F4F46, #2E6B5F)' }}
                        data-testid={`book-teleconsult-${doc.id}`}>
                        <Video className="w-3.5 h-3.5 mr-1.5" /> Book
                      </Button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Phase: Pre-call Checklist */}
            {phase === 'checklist' && (
              <PreCallChecklist onReady={() => setPhase('waiting')} />
            )}

            {/* Phase: Waiting Room */}
            {phase === 'waiting' && (
              <WaitingRoom doctor={selectedDoctor} onJoin={() => setPhase('call')} />
            )}

            {/* Phase: Post-call Summary */}
            {phase === 'summary' && (
              <div className="space-y-4">
                <div className="rounded-2xl p-5 text-center" style={{
                  background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)',
                  border: '1px solid #A7F3D0',
                }}>
                  <CheckCircle className="w-12 h-12 mx-auto text-emerald-600 mb-2" />
                  <h3 className="font-bold text-emerald-800 text-lg">Consultation Complete</h3>
                  <p className="text-sm text-emerald-600 mt-1">with {selectedDoctor?.name}</p>
                </div>

                <div className="rounded-2xl p-4 bg-white shadow-sm" style={{ border: '1px solid rgba(31,79,70,0.06)' }}>
                  <h4 className="font-bold text-[#1A2B28] mb-3">What's Next</h4>
                  {[
                    'E-prescription sent to your email',
                    'Medicines available on Orange Pharmacy',
                    'Follow-up in 7 days recommended',
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 py-2">
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      <span className="text-sm text-[#4A6B64]">{item}</span>
                    </div>
                  ))}
                </div>

                <Button onClick={() => navigate('/')}
                  className="w-full h-12 rounded-xl font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #1F4F46, #2E6B5F)' }}
                  data-testid="go-home-btn">
                  Back to Home
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  Crown, ChevronRight, X, Phone, Shield, ArrowLeft, Loader2,
  CheckCircle2, Truck, Pill, Star, Globe, Package
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const TIERS = {
  gold: {
    name: 'Gold', price: 999, period: '/year',
    gradient: 'linear-gradient(135deg, #eab308, #ca8a04)',
    bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.2)',
    text: '#eab308', glow: 'rgba(234,179,8,0.15)',
    highlights: [
      { icon: Pill, text: '25% discount on medicines' },
      { icon: Truck, text: '12 free deliveries + home visits/year' },
      { icon: Globe, text: 'All portals access for 1 year' },
      { icon: Package, text: 'MangOne Basic free/year' },
    ],
  },
  silver: {
    name: 'Silver', price: 799, period: '/year',
    gradient: 'linear-gradient(135deg, #94a3b8, #64748b)',
    bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)',
    text: '#94a3b8', glow: 'rgba(148,163,184,0.12)',
    highlights: [
      { icon: Pill, text: '20% discount on medicines' },
      { icon: Truck, text: '9 free deliveries + home visits/year' },
      { icon: Globe, text: 'Any 2 portals for 9 months' },
      { icon: Star, text: 'Priority booking' },
    ],
  },
  bronze: {
    name: 'Bronze', price: 499, period: '/year',
    gradient: 'linear-gradient(135deg, #d97706, #92400e)',
    bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.2)',
    text: '#d97706', glow: 'rgba(217,119,6,0.12)',
    highlights: [
      { icon: Pill, text: '15% discount on medicines' },
      { icon: Truck, text: '6 free deliveries + home visits/year' },
      { icon: Globe, text: 'Any 1 portal for 6 months' },
      { icon: Star, text: 'Standard booking' },
    ],
  },
};

const MembershipAdModal = ({ open, onClose }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState('plans');
  const [selectedTier, setSelectedTier] = useState('gold');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    if (timer > 0) { const t = setTimeout(() => setTimer(timer - 1), 1000); return () => clearTimeout(t); }
  }, [timer]);

  useEffect(() => {
    if (!open) { setStep('plans'); setPhone(''); setOtp(''); setTimer(0); }
  }, [open]);

  const handleSendOTP = async () => {
    if (phone.length < 10) { toast.error('Enter a valid 10-digit number'); return; }
    setLoading(true);
    try {
      await axios.post(`${API}/api/auth/guest/send-otp`, { mobile: phone.slice(-10) });
      toast.success('OTP sent to your WhatsApp!');
      setStep('otp');
      setTimer(30);
    } catch { toast.error('Could not send OTP. Try again.'); }
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (otp.length < 4) { toast.error('Enter the OTP'); return; }
    setLoading(true);
    try {
      await axios.post(`${API}/api/auth/guest/verify-otp`, { mobile: phone.slice(-10), otp });
      toast.success('Verified! Redirecting to membership...');
      onClose();
      navigate(`/one?plan=${selectedTier}&phone=${phone.slice(-10)}`);
    } catch { toast.error('Invalid OTP. Try again.'); }
    setLoading(false);
  };

  const goBack = () => {
    if (step === 'plans') onClose();
    else if (step === 'phone') setStep('plans');
    else if (step === 'otp') setStep('phone');
  };

  if (!open) return null;

  const tier = TIERS[selectedTier];

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col" style={{ background: '#070714' }} data-testid="membership-ad-modal">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[250px] h-[250px] rounded-full blur-[100px] opacity-20" style={{ background: tier.text, top: '-5%', right: '-10%' }} />
        <div className="absolute w-[200px] h-[200px] rounded-full blur-[80px] opacity-10" style={{ background: tier.text, bottom: '20%', left: '-8%' }} />
      </div>

      <div className="relative z-10 p-4 flex items-center gap-3">
        <button onClick={goBack} className="w-10 h-10 rounded-full flex items-center justify-center border border-white/[0.08]" style={{ background: 'rgba(255,255,255,0.04)' }} data-testid="membership-modal-back-btn">
          <ArrowLeft className="w-5 h-5 text-white/60" />
        </button>
        <div className="flex-1" />
        <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center border border-white/[0.08]" style={{ background: 'rgba(255,255,255,0.04)' }} data-testid="membership-modal-close-btn">
          <X className="w-5 h-5 text-white/40" />
        </button>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-5 pb-8">

        {step !== 'plans' && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {['phone', 'otp'].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full transition-all`} style={{ background: ['phone','otp'].indexOf(step) >= i ? tier.text : 'rgba(255,255,255,0.1)' }} />
                {i < 1 && <div className="w-6 h-[1px]" style={{ background: ['phone','otp'].indexOf(step) > i ? `${tier.text}80` : 'rgba(255,255,255,0.1)' }} />}
              </div>
            ))}
          </div>
        )}

        {/* === STEP: Plans === */}
        {step === 'plans' && (
          <div className="space-y-5" style={{ animation: 'fadeUp 0.3s ease-out' }}>
            <div className="text-center mb-2">
              <h1 className="text-2xl font-black text-white">Nevika Cura ONE</h1>
              <p className="text-white/30 text-sm mt-1">Choose your membership tier</p>
            </div>

            {/* Tier Cards */}
            {Object.entries(TIERS).map(([key, t]) => (
              <button
                key={key}
                onClick={() => setSelectedTier(key)}
                data-testid={`tier-card-${key}`}
                className={`w-full rounded-2xl p-4 text-left transition-all border relative overflow-hidden`}
                style={{
                  background: selectedTier === key ? t.bg : 'rgba(255,255,255,0.02)',
                  borderColor: selectedTier === key ? t.border : 'rgba(255,255,255,0.05)',
                  boxShadow: selectedTier === key ? `0 0 30px ${t.glow}` : 'none',
                }}
              >
                {selectedTier === key && <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: t.gradient }} />}

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: t.gradient }}>
                      <Crown className="w-4 h-4" style={{ color: key === 'gold' ? '#1a1505' : '#fff' }} />
                    </div>
                    <div>
                      <span className="text-white font-bold text-sm">{t.name}</span>
                      {key === 'gold' && <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: `${t.text}20`, color: t.text }}>BEST VALUE</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-white font-black text-lg">&#8377;{t.price}</span>
                    <span className="text-white/25 text-[10px]">{t.period}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {t.highlights.map((h, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <h.icon className="w-3 h-3 flex-shrink-0" style={{ color: selectedTier === key ? t.text : 'rgba(255,255,255,0.2)' }} />
                      <span className={`text-[10px] ${selectedTier === key ? 'text-white/60' : 'text-white/25'}`}>{h.text}</span>
                    </div>
                  ))}
                </div>
              </button>
            ))}

            <button onClick={() => setStep('phone')}
              className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 active:scale-[0.97] transition-all"
              style={{ background: tier.gradient, boxShadow: `0 8px 32px ${tier.glow}` }}
              data-testid="membership-join-now-btn">
              Join {tier.name} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* === STEP: Phone === */}
        {step === 'phone' && (
          <div className="space-y-5" style={{ animation: 'fadeUp 0.3s ease-out' }}>
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: tier.bg, border: `1px solid ${tier.border}` }}>
                <Phone className="w-7 h-7" style={{ color: tier.text }} />
              </div>
              <h2 className="text-xl font-bold text-white">Enter WhatsApp Number</h2>
              <p className="text-white/30 text-sm mt-1">OTP verification to continue</p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <label className="text-white/30 text-[10px] uppercase tracking-wider font-medium">WhatsApp Number</label>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-white/40 text-sm font-semibold">+91</span>
                <input type="tel" maxLength={10} value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 bg-transparent text-white text-lg font-bold outline-none placeholder:text-white/15"
                  placeholder="9876543210" data-testid="membership-modal-phone-input" autoFocus />
              </div>
            </div>
            <button onClick={handleSendOTP} disabled={loading || phone.length < 10}
              className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.97] transition-all"
              style={{ background: tier.gradient, boxShadow: `0 8px 32px ${tier.glow}` }}
              data-testid="membership-modal-send-otp-btn">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Send OTP <ChevronRight className="w-4 h-4" /></>}
            </button>
          </div>
        )}

        {/* === STEP: OTP === */}
        {step === 'otp' && (
          <div className="space-y-5" style={{ animation: 'fadeUp 0.3s ease-out' }}>
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: tier.bg, border: `1px solid ${tier.border}` }}>
                <Shield className="w-7 h-7" style={{ color: tier.text }} />
              </div>
              <h2 className="text-xl font-bold text-white">Verify OTP</h2>
              <p className="text-white/30 text-sm mt-1">Sent to +91 {phone}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <label className="text-white/30 text-[10px] uppercase tracking-wider font-medium">Enter OTP</label>
              <input type="tel" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-transparent text-white text-2xl font-black tracking-[0.5em] outline-none mt-2 placeholder:text-white/10 text-center"
                placeholder="- - - -" data-testid="membership-modal-otp-input" autoFocus />
            </div>
            <button onClick={handleVerifyOTP} disabled={loading || otp.length < 4}
              className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.97] transition-all"
              style={{ background: tier.gradient, boxShadow: `0 8px 32px ${tier.glow}` }}
              data-testid="membership-modal-verify-btn">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verify <CheckCircle2 className="w-4 h-4" /></>}
            </button>
            {timer > 0 ? (
              <p className="text-center text-white/20 text-xs">Resend in {timer}s</p>
            ) : (
              <button onClick={handleSendOTP} className="w-full text-center text-xs font-semibold hover:opacity-80" style={{ color: `${tier.text}99` }}>Resend OTP</button>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(15px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
};

export default MembershipAdModal;

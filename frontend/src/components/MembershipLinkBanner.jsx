import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, X, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { lightTap } from '@/utils/haptics';

const API = process.env.REACT_APP_BACKEND_URL;
const NEVIKA_LOGO = 'https://customer-assets.emergentagent.com/job_d786a99e-45bb-47d6-851a-3fcc890efd73/artifacts/1k8xe1te_1314-removebg-preview.png';

const TIERS = [
  { name: 'GOLD', color: '#D4AF37', border: '#D4AF37', r: 0, x: 0, y: 0, z: 30 },
  { name: 'SILVER', color: '#A0A0A0', border: '#C0C0C0', r: 4, x: 6, y: 5, z: 20 },
  { name: 'BRONZE', color: '#CD7F32', border: '#CD7F32', r: 8, x: 12, y: 10, z: 10 },
];

const MembershipLinkBanner = ({ className = '' }) => {
  const navigate = useNavigate();
  const [showOtp, setShowOtp] = useState(false);
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10) { toast.error('Enter a valid 10-digit number'); return; }
    lightTap(); setLoading(true);
    try {
      const res = await fetch(`${API}/api/otp/sms/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleaned, purpose: 'membership' }),
      });
      const data = await res.json();
      if (data.success) { toast.success('OTP sent to your WhatsApp!'); setStep('otp'); }
      else { toast.error(data.detail || 'Failed to send OTP'); }
    } catch { toast.error('Could not send OTP. Try again.'); }
    finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) { toast.error('Enter 6-digit OTP'); return; }
    lightTap(); setLoading(true);
    try {
      const res = await fetch(`${API}/api/otp/sms/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.replace(/\D/g, ''), otp }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Verified!');
        setShowOtp(false); setStep('phone'); setOtp('');
        navigate(`/one?phone=${encodeURIComponent(phone.replace(/\D/g, ''))}`);
      } else { toast.error(data.detail || 'Invalid OTP'); }
    } catch { toast.error('Verification failed.'); }
    finally { setLoading(false); }
  };

  const handleResend = async () => {
    lightTap(); setLoading(true);
    try {
      const res = await fetch(`${API}/api/otp/sms/resend`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.replace(/\D/g, ''), purpose: 'membership' }),
      });
      const data = await res.json();
      if (data.success) toast.success('New OTP sent!');
      else toast.error('Could not resend');
    } catch { toast.error('Resend failed'); }
    finally { setLoading(false); }
  };

  return (
    <>
      <div className={`px-4 ${className}`}>
        <button
          onClick={() => { lightTap(); setShowOtp(true); }}
          className="w-full relative rounded-[20px] overflow-hidden active:scale-[0.98] transition-transform text-left group"
          style={{
            background: 'linear-gradient(145deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)',
            border: '1.5px solid rgba(212,175,55,0.25)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(212,175,55,0.08)',
          }}
          data-testid="membership-link-banner"
        >
          {/* Gold shimmer line */}
          <div className="absolute top-0 left-0 w-full h-[1px]" style={{ background: 'linear-gradient(90deg, transparent 5%, rgba(212,175,55,0.4) 30%, rgba(212,175,55,0.6) 50%, rgba(212,175,55,0.4) 70%, transparent 95%)' }} />
          {/* Subtle glow */}
          <div className="absolute -top-8 -left-8 w-28 h-28 rounded-full blur-[40px] opacity-20 pointer-events-none" style={{ background: '#D4AF37' }} />
          <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full blur-[35px] opacity-10 pointer-events-none" style={{ background: '#C0C0C0' }} />

          <div className="relative p-4 flex items-center gap-4">
            {/* Stacked tier mini-cards */}
            <div className="relative flex-shrink-0" style={{ width: 78, height: 52 }}>
              {TIERS.map((t) => (
                <div key={t.name} className="absolute inset-0 rounded-xl overflow-hidden" style={{ zIndex: t.z, transform: `translateX(${t.x}px) translateY(${t.y}px) rotate(${t.r}deg)` }}>
                  <div className="w-full h-full rounded-xl" style={{
                    background: `linear-gradient(135deg, ${t.color}18, ${t.color}08)`,
                    border: `1.5px solid ${t.border}50`,
                    boxShadow: `0 2px 12px ${t.color}15`,
                  }}>
                    <div className="p-1.5 flex items-center justify-between h-full">
                      <div>
                        <p style={{ fontSize: 5, color: `${t.color}90`, fontWeight: 900, letterSpacing: '0.15em' }}>NEVIKA CURA</p>
                        <p style={{ fontSize: 10, color: t.color, fontWeight: 900, lineHeight: 1, textShadow: `0 0 12px ${t.color}50` }}>{t.name}</p>
                      </div>
                      <img src={NEVIKA_LOGO} alt="" className="w-3.5 h-3.5 object-contain opacity-30" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-black text-white leading-tight tracking-tight">Cura Card</p>
              <p className="text-[11px] text-white/45 mt-0.5 font-medium">Gold · Silver · Bronze from ₹499/yr</p>
            </div>

            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.2)' }}>
              <ChevronRight className="w-4 h-4 text-amber-400/60" />
            </div>
          </div>
        </button>
      </div>

      {/* OTP Modal */}
      {showOtp && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center" data-testid="otp-modal">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowOtp(false); setStep('phone'); setOtp(''); }} />
          <div className="relative w-full max-w-md rounded-t-[28px] pb-8" style={{ background: '#0c0c14', border: '1px solid rgba(255,255,255,0.06)', borderBottom: 'none' }}>
            <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.15), transparent)' }} />
            <div className="w-10 h-1 rounded-full bg-white/10 mx-auto mt-3" />

            <div className="px-6 pt-5 pb-6">
              {step === 'phone' ? (
                <>
                  <div className="flex items-center gap-2 mb-1">
                    <img src={NEVIKA_LOGO} alt="" className="w-5 h-5 object-contain opacity-40" />
                    <span className="text-white/30 text-[10px] font-bold tracking-[0.2em] uppercase">Nevika Cura ONE</span>
                  </div>
                  <h3 className="text-white text-lg font-black mb-1">Enter WhatsApp Number</h3>
                  <p className="text-white/30 text-xs mb-5">We'll send a verification code to your WhatsApp</p>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center h-12 px-3 rounded-xl text-white/40 text-sm font-medium" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      +91
                    </div>
                    <input
                      type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="10-digit number" maxLength={10} autoFocus
                      className="flex-1 h-12 px-4 rounded-xl text-white text-sm outline-none"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                      data-testid="otp-phone-input"
                    />
                  </div>
                  <button
                    onClick={handleSendOtp} disabled={loading || phone.length < 10}
                    className="w-full py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #D4AF37, #8B6914)', boxShadow: '0 6px 20px rgba(212,175,55,0.2)' }}
                    data-testid="otp-send-btn"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send OTP'}
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setStep('phone')} className="flex items-center gap-1 text-white/30 text-xs mb-3" data-testid="otp-back-btn">
                    <ArrowLeft className="w-3 h-3" /> Change number
                  </button>
                  <h3 className="text-white text-lg font-black mb-1">Enter OTP</h3>
                  <p className="text-white/30 text-xs mb-5">Sent to +91 {phone} via WhatsApp</p>
                  <input
                    type="text" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="6-digit OTP" maxLength={6} autoFocus
                    className="w-full h-14 px-4 rounded-xl text-white text-center text-2xl font-mono tracking-[0.5em] outline-none mb-4"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    data-testid="otp-code-input"
                  />
                  <button
                    onClick={handleVerifyOtp} disabled={loading || otp.length < 6}
                    className="w-full py-3.5 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #D4AF37, #8B6914)', boxShadow: '0 6px 20px rgba(212,175,55,0.2)' }}
                    data-testid="otp-verify-btn"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & Continue'}
                  </button>
                  <button onClick={handleResend} disabled={loading} className="w-full text-center text-xs text-amber-400/50 mt-3 py-1" data-testid="otp-resend-btn">
                    Didn't receive? Resend OTP
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MembershipLinkBanner;

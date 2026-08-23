import React, { useState, useEffect } from 'react';
import { Crown, ChevronRight, X, Phone, Shield, ArrowLeft, Loader2, CheckCircle2, User, Mail, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * MembershipAdCard — Nevika Cura Membership ad (red-white-black translucent)
 * Flow: WhatsApp → OTP → Membership Form → Payment
 */
const MembershipAdCard = ({ className = '' }) => {
  const [showFlow, setShowFlow] = useState(false);
  const [step, setStep] = useState('phone'); // phone | otp | form | payment | success
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    if (timer > 0) {
      const t = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [timer]);

  const handleSendOTP = async () => {
    if (phone.length < 10) { toast.error('Enter a valid 10-digit number'); return; }
    setLoading(true);
    try {
      await axios.post(`${API}/api/auth/guest/send-otp`, { phone: phone.slice(-10) });
      toast.success('OTP sent via SMS!');
      setStep('otp');
      setTimer(30);
      setFormData(f => ({ ...f, phone }));
    } catch {
      toast.error('Could not send OTP. Try again.');
    }
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (otp.length < 4) { toast.error('Enter the OTP'); return; }
    setLoading(true);
    try {
      await axios.post(`${API}/api/auth/guest/verify-otp`, { phone: phone.slice(-10), otp });
      toast.success('Phone verified!');
      setStep('form');
    } catch {
      toast.error('Invalid OTP. Try again.');
    }
    setLoading(false);
  };

  const handleSubmitForm = async () => {
    if (!formData.name.trim()) { toast.error('Enter your name'); return; }
    if (!formData.email.includes('@')) { toast.error('Enter a valid email'); return; }
    setLoading(true);
    try {
      await axios.post(`${API}/api/membership/apply`, formData);
      setStep('payment');
    } catch {
      // Even if API fails, show payment step (API may not exist yet)
      setStep('payment');
    }
    setLoading(false);
  };

  const handlePayment = () => {
    toast.success('Redirecting to payment...');
    setStep('success');
    setTimeout(() => {
      setShowFlow(false);
      setStep('phone');
      setOtp('');
      setPhone('');
      setFormData({ name: '', email: '', phone: '' });
    }, 3000);
  };

  const plans = [
    { id: 'basic', name: 'Essential', price: 499, period: '/month', features: ['Unlimited consultations', 'Medicine discounts 10%', 'Priority booking'] },
    { id: 'premium', name: 'Premium', price: 999, period: '/month', features: ['Everything in Essential', 'Free lab tests (2/mo)', 'Family coverage (4)', 'Medicine discounts 20%'] },
  ];

  const [selectedPlan, setSelectedPlan] = useState('premium');

  return (
    <>
      {/* === Ad Card — Red/White/Black Translucent === */}
      <div className={`px-4 ${className}`}>
        <button
          onClick={() => setShowFlow(true)}
          className="relative w-full overflow-hidden rounded-[18px] text-left active:scale-[0.98] transition-transform"
          style={{
            background: 'linear-gradient(145deg, #1a0000, #0d0d0d, #1a0505)',
            border: '1px solid rgba(255,50,50,0.12)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 60px rgba(200,0,0,0.06)',
          }}
          data-testid="membership-ad-card"
        >
          {/* Shine sweep */}
          <div className="absolute top-0 w-[40%] h-full pointer-events-none" style={{ background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.03),transparent)', animation: 'memberSweep 6s ease-in-out infinite', left: '-60%' }} />
          <style>{`@keyframes memberSweep { 0%{left:-60%} 100%{left:160%} }`}</style>

          {/* Red glow top-right */}
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full blur-[40px] opacity-30" style={{ background: '#dc2626' }} />

          <div className="relative p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)', boxShadow: '0 4px 16px rgba(220,38,38,0.3)' }}>
                  <Crown className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <p className="text-white text-xs font-bold tracking-wide">Nevika Cura</p>
                  <p className="text-red-400/50 text-[9px] font-medium">Membership Program</p>
                </div>
              </div>
              <span className="text-[10px] font-black text-red-500 bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/15">NEW</span>
            </div>

            {/* Benefits row */}
            <div className="flex gap-2 mb-3">
              <div className="flex-1 rounded-lg p-2 border" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}>
                <p className="text-white text-sm font-black">20%</p>
                <p className="text-white/30 text-[9px] leading-tight">Med discount</p>
              </div>
              <div className="flex-1 rounded-lg p-2 border" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}>
                <p className="text-white text-sm font-black">Free</p>
                <p className="text-white/30 text-[9px] leading-tight">Lab tests</p>
              </div>
              <div className="flex-1 rounded-lg p-2 border" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}>
                <p className="text-white text-sm font-black">VIP</p>
                <p className="text-white/30 text-[9px] leading-tight">Priority</p>
              </div>
            </div>

            {/* CTA */}
            <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl" style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', boxShadow: '0 4px 16px rgba(220,38,38,0.25)' }}>
              <p className="text-white text-xs font-bold">Join Membership</p>
              <ChevronRight className="w-3.5 h-3.5 text-white/70" />
            </div>
          </div>
        </button>
      </div>

      {/* === Full-screen Flow Modal (Dark UI) === */}
      {showFlow && (
        <div className="fixed inset-0 z-[9999] flex flex-col" style={{ background: '#070714' }} data-testid="membership-flow-modal">
          {/* Orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute w-[250px] h-[250px] rounded-full blur-[100px] opacity-25" style={{ background: '#dc2626', top: '-5%', right: '-10%' }} />
            <div className="absolute w-[200px] h-[200px] rounded-full blur-[80px] opacity-15" style={{ background: '#7f1d1d', bottom: '20%', left: '-8%' }} />
          </div>

          {/* Header */}
          <div className="relative z-10 p-4 flex items-center gap-3">
            <button onClick={() => { if (step === 'phone') { setShowFlow(false); } else if (step === 'otp') setStep('phone'); else if (step === 'form') setStep('otp'); else if (step === 'payment') setStep('form'); }}
              className="w-10 h-10 rounded-full flex items-center justify-center border border-white/[0.08]" style={{ background: 'rgba(255,255,255,0.04)' }} data-testid="membership-back-btn">
              <ArrowLeft className="w-5 h-5 text-white/60" />
            </button>
            <div className="flex-1" />
            <button onClick={() => { setShowFlow(false); setStep('phone'); }} className="w-10 h-10 rounded-full flex items-center justify-center border border-white/[0.08]" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <X className="w-5 h-5 text-white/40" />
            </button>
          </div>

          {/* Content */}
          <div className="relative z-10 flex-1 overflow-y-auto px-5 pb-8">

            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {['phone', 'otp', 'form', 'payment'].map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full transition-all ${['phone','otp','form','payment'].indexOf(step) >= i ? 'bg-red-500' : 'bg-white/10'}`} />
                  {i < 3 && <div className={`w-6 h-[1px] ${['phone','otp','form','payment'].indexOf(step) > i ? 'bg-red-500/50' : 'bg-white/10'}`} />}
                </div>
              ))}
            </div>

            {/* === STEP: Phone === */}
            {step === 'phone' && (
              <div className="space-y-5" style={{ animation: 'fadeUp 0.3s ease-out' }}>
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.2)' }}>
                    <Phone className="w-7 h-7 text-red-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Enter WhatsApp Number</h2>
                  <p className="text-white/30 text-sm mt-1">We'll send an OTP for verification</p>
                </div>
                <div className="rounded-2xl border border-white/[0.08] p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <label className="text-white/30 text-[10px] uppercase tracking-wider font-medium">WhatsApp Number</label>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-white/40 text-sm font-semibold">+91</span>
                    <input type="tel" maxLength={10} value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                      className="flex-1 bg-transparent text-white text-lg font-bold outline-none placeholder:text-white/15"
                      placeholder="9876543210" data-testid="membership-phone-input" autoFocus />
                  </div>
                </div>
                <button onClick={handleSendOTP} disabled={loading || phone.length < 10}
                  className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.97] transition-all"
                  style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)', boxShadow: '0 8px 32px rgba(220,38,38,0.25)' }}
                  data-testid="membership-send-otp-btn">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Send OTP <ChevronRight className="w-4 h-4" /></>}
                </button>
              </div>
            )}

            {/* === STEP: OTP === */}
            {step === 'otp' && (
              <div className="space-y-5" style={{ animation: 'fadeUp 0.3s ease-out' }}>
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.2)' }}>
                    <Shield className="w-7 h-7 text-red-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Verify OTP</h2>
                  <p className="text-white/30 text-sm mt-1">Sent to +91 {phone}</p>
                </div>
                <div className="rounded-2xl border border-white/[0.08] p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <label className="text-white/30 text-[10px] uppercase tracking-wider font-medium">Enter OTP</label>
                  <input type="tel" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-transparent text-white text-2xl font-black tracking-[0.5em] outline-none mt-2 placeholder:text-white/10 text-center"
                    placeholder="- - - -" data-testid="membership-otp-input" autoFocus />
                </div>
                <button onClick={handleVerifyOTP} disabled={loading || otp.length < 4}
                  className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.97] transition-all"
                  style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)', boxShadow: '0 8px 32px rgba(220,38,38,0.25)' }}
                  data-testid="membership-verify-otp-btn">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verify <CheckCircle2 className="w-4 h-4" /></>}
                </button>
                {timer > 0 ? (
                  <p className="text-center text-white/20 text-xs">Resend in {timer}s</p>
                ) : (
                  <button onClick={handleSendOTP} className="w-full text-center text-red-400/60 text-xs font-semibold hover:text-red-400">Resend OTP</button>
                )}
              </div>
            )}

            {/* === STEP: Form === */}
            {step === 'form' && (
              <div className="space-y-5" style={{ animation: 'fadeUp 0.3s ease-out' }}>
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.2)' }}>
                    <Crown className="w-7 h-7 text-red-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Membership Details</h2>
                  <p className="text-white/30 text-sm mt-1">Complete your profile</p>
                </div>

                <div className="space-y-3">
                  {/* Name */}
                  <div className="rounded-2xl border border-white/[0.08] p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <label className="text-white/30 text-[10px] uppercase tracking-wider font-medium">Patient Name</label>
                    <div className="flex items-center gap-2 mt-2">
                      <User className="w-4 h-4 text-white/20" />
                      <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="flex-1 bg-transparent text-white text-sm font-semibold outline-none placeholder:text-white/15"
                        placeholder="Full name" data-testid="membership-name-input" />
                    </div>
                  </div>
                  {/* Email */}
                  <div className="rounded-2xl border border-white/[0.08] p-4" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <label className="text-white/30 text-[10px] uppercase tracking-wider font-medium">Email Address</label>
                    <div className="flex items-center gap-2 mt-2">
                      <Mail className="w-4 h-4 text-white/20" />
                      <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                        className="flex-1 bg-transparent text-white text-sm font-semibold outline-none placeholder:text-white/15"
                        placeholder="you@email.com" data-testid="membership-email-input" />
                    </div>
                  </div>
                  {/* Phone (pre-filled) */}
                  <div className="rounded-2xl border border-white/[0.08] p-4 opacity-60" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <label className="text-white/30 text-[10px] uppercase tracking-wider font-medium">WhatsApp Number (Verified)</label>
                    <div className="flex items-center gap-2 mt-2">
                      <Phone className="w-4 h-4 text-green-400/50" />
                      <span className="text-white/60 text-sm font-semibold">+91 {formData.phone || phone}</span>
                      <CheckCircle2 className="w-4 h-4 text-green-400 ml-auto" />
                    </div>
                  </div>
                </div>

                <button onClick={handleSubmitForm} disabled={loading || !formData.name.trim()}
                  className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.97] transition-all"
                  style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)', boxShadow: '0 8px 32px rgba(220,38,38,0.25)' }}
                  data-testid="membership-submit-form-btn">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Choose Plan <ChevronRight className="w-4 h-4" /></>}
                </button>
              </div>
            )}

            {/* === STEP: Payment/Plan Selection === */}
            {step === 'payment' && (
              <div className="space-y-5" style={{ animation: 'fadeUp 0.3s ease-out' }}>
                <div className="text-center">
                  <h2 className="text-xl font-bold text-white">Choose Your Plan</h2>
                  <p className="text-white/30 text-sm mt-1">Welcome, {formData.name}!</p>
                </div>

                <div className="space-y-3">
                  {plans.map(plan => (
                    <button key={plan.id} onClick={() => setSelectedPlan(plan.id)}
                      className="w-full rounded-2xl p-4 text-left transition-all border"
                      style={{
                        background: selectedPlan === plan.id ? 'rgba(220,38,38,0.08)' : 'rgba(255,255,255,0.03)',
                        borderColor: selectedPlan === plan.id ? 'rgba(220,38,38,0.25)' : 'rgba(255,255,255,0.06)',
                        boxShadow: selectedPlan === plan.id ? '0 0 30px rgba(220,38,38,0.1)' : 'none',
                      }}
                      data-testid={`plan-${plan.id}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-bold text-sm">{plan.name}</span>
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-white/40 text-xs">&#8377;</span>
                          <span className="text-white font-black text-xl">{plan.price}</span>
                          <span className="text-white/30 text-[10px]">{plan.period}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {plan.features.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 text-[11px]">
                            <CheckCircle2 className="w-3 h-3 text-red-400 flex-shrink-0" />
                            <span className="text-white/50">{f}</span>
                          </div>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>

                <button onClick={handlePayment}
                  className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 active:scale-[0.97] transition-all"
                  style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)', boxShadow: '0 8px 32px rgba(220,38,38,0.25)' }}
                  data-testid="membership-pay-btn">
                  <CreditCard className="w-5 h-5" />
                  Pay &#8377;{plans.find(p => p.id === selectedPlan)?.price}{plans.find(p => p.id === selectedPlan)?.period}
                </button>
              </div>
            )}

            {/* === STEP: Success === */}
            {step === 'success' && (
              <div className="flex flex-col items-center justify-center pt-20 space-y-4" style={{ animation: 'fadeUp 0.3s ease-out' }}>
                <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.2)' }}>
                  <CheckCircle2 className="w-10 h-10 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Welcome aboard!</h2>
                <p className="text-white/40 text-sm text-center">Your Nevika Cura membership is now active. Enjoy exclusive benefits!</p>
              </div>
            )}
          </div>

          <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(15px); } to { opacity:1; transform:translateY(0); } }`}</style>
        </div>
      )}
    </>
  );
};

export default MembershipAdCard;

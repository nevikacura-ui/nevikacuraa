import React, { useState, useEffect } from 'react';
import {
  Crown, ChevronRight, Phone, Shield, Loader2,
  CheckCircle2, User, Mail, CreditCard, Truck, Pill, Star
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * HomeMembershipForm — Direct embedded membership form for the Home page.
 * Black glassmorphism theme. Starts at WhatsApp step (no ad preview).
 * Flow: WhatsApp → OTP → Form → Plan → Payment → Success
 */
const HomeMembershipForm = () => {
  const [step, setStep] = useState('phone'); // phone | otp | form | payment | success
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [timer, setTimer] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState('premium');

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
      await axios.post(`${API}/api/auth/guest/send-otp`, { mobile: phone.slice(-10) });
      toast.success('OTP sent to your WhatsApp!');
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
      await axios.post(`${API}/api/auth/guest/verify-otp`, { mobile: phone.slice(-10), otp });
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
      await axios.post(`${API}/api/membership/apply`, {
        ...formData,
        phone: phone.slice(-10),
        plan_type: selectedPlan
      });
      setStep('payment');
    } catch {
      setStep('payment');
    }
    setLoading(false);
  };

  const handlePayment = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/subscriptions/membership/purchase`, {
        plan_type: selectedPlan,
        billing_cycle: 'monthly',
        email: formData.email || `${phone}@nevikacura.app`,
        coupon_code: null
      });
      const data = res.data;
      if (data.free_membership) {
        setStep('success');
      } else if (data.payment_session_id) {
        window.location.href = `${window.location.origin}/checkout?session=${data.payment_session_id}&order=${data.order_id}&amount=${data.amount}&type=membership`;
      } else {
        toast.error('Payment setup failed');
      }
    } catch {
      toast.error('Payment failed. Try again.');
    }
    setLoading(false);
  };

  const plans = [
    { id: 'basic', name: 'Essential', price: 499, period: '/month', features: ['Unlimited consultations', 'Medicine discounts 10%', 'Zero delivery charges'] },
    { id: 'premium', name: 'Premium', price: 999, period: '/month', features: ['Everything in Essential', 'Free lab tests (2/mo)', 'Family coverage (4)', 'Massive medicine discounts 20%'] },
  ];

  const stepNames = ['phone', 'otp', 'form', 'payment'];
  const currentIdx = stepNames.indexOf(step);

  return (
    <div className="px-4" data-testid="home-membership-form">
      <div
        className="relative rounded-[22px] overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        {/* Ambient glow */}
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-[60px] opacity-20 pointer-events-none" style={{ background: '#dc2626' }} />

        <div className="relative p-5">
          {/* Header */}
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)', boxShadow: '0 4px 16px rgba(220,38,38,0.3)' }}>
              <Crown className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white text-sm font-bold">Cura Card</p>
              <p className="text-white/30 text-[10px]">Join and save on every visit</p>
            </div>
          </div>

          {/* Step indicator */}
          {step !== 'success' && (
            <div className="flex items-center gap-2 mb-5">
              {stepNames.map((s, i) => (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div className={`h-1 rounded-full flex-1 transition-all ${currentIdx >= i ? 'bg-red-500' : 'bg-white/10'}`} />
                </div>
              ))}
            </div>
          )}

          {/* === STEP: Phone === */}
          {step === 'phone' && (
            <div className="space-y-4" style={{ animation: 'fadeUp 0.3s ease-out' }}>
              {/* Benefits mini row */}
              <div className="flex gap-2 mb-1">
                {[
                  { icon: Truck, text: 'Free Delivery' },
                  { icon: Pill, text: 'Med Discounts' },
                  { icon: Star, text: 'Free Lab Tests' },
                ].map((b, i) => (
                  <div key={i} className="flex-1 flex items-center gap-1.5 p-2 rounded-xl border"
                    style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}>
                    <b.icon className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                    <span className="text-white/50 text-[10px] font-medium leading-tight">{b.text}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-white/[0.08] p-3.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <label className="text-white/30 text-[10px] uppercase tracking-wider font-medium">WhatsApp Number</label>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-white/40 text-sm font-semibold">+91</span>
                  <input type="tel" maxLength={10} value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 bg-transparent text-white text-base font-bold outline-none placeholder:text-white/15"
                    placeholder="9876543210" data-testid="home-membership-phone-input" />
                </div>
              </div>
              <button onClick={handleSendOTP} disabled={loading || phone.length < 10}
                className="w-full py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.97] transition-all"
                style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)', boxShadow: '0 6px 24px rgba(220,38,38,0.25)' }}
                data-testid="home-membership-send-otp-btn">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Get OTP <ChevronRight className="w-4 h-4" /></>}
              </button>
            </div>
          )}

          {/* === STEP: OTP === */}
          {step === 'otp' && (
            <div className="space-y-4" style={{ animation: 'fadeUp 0.3s ease-out' }}>
              <div className="text-center">
                <p className="text-white font-bold text-sm">Verify OTP</p>
                <p className="text-white/30 text-xs mt-0.5">Sent to +91 {phone}</p>
              </div>
              <div className="rounded-2xl border border-white/[0.08] p-3.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <input type="tel" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-transparent text-white text-xl font-black tracking-[0.4em] outline-none placeholder:text-white/10 text-center"
                  placeholder="- - - -" data-testid="home-membership-otp-input" autoFocus />
              </div>
              <button onClick={handleVerifyOTP} disabled={loading || otp.length < 4}
                className="w-full py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.97] transition-all"
                style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)', boxShadow: '0 6px 24px rgba(220,38,38,0.25)' }}
                data-testid="home-membership-verify-btn">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Verify <CheckCircle2 className="w-4 h-4" /></>}
              </button>
              <div className="text-center">
                {timer > 0 ? (
                  <p className="text-white/20 text-xs">Resend in {timer}s</p>
                ) : (
                  <button onClick={handleSendOTP} className="text-red-400/60 text-xs font-semibold hover:text-red-400">Resend OTP</button>
                )}
              </div>
            </div>
          )}

          {/* === STEP: Form === */}
          {step === 'form' && (
            <div className="space-y-3" style={{ animation: 'fadeUp 0.3s ease-out' }}>
              <p className="text-white font-bold text-sm text-center">Complete Your Profile</p>
              <div className="rounded-2xl border border-white/[0.08] p-3.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <label className="text-white/30 text-[10px] uppercase tracking-wider font-medium">Full Name</label>
                <div className="flex items-center gap-2 mt-1.5">
                  <User className="w-4 h-4 text-white/20" />
                  <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="flex-1 bg-transparent text-white text-sm font-semibold outline-none placeholder:text-white/15"
                    placeholder="Your name" data-testid="home-membership-name-input" />
                </div>
              </div>
              <div className="rounded-2xl border border-white/[0.08] p-3.5" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <label className="text-white/30 text-[10px] uppercase tracking-wider font-medium">Email</label>
                <div className="flex items-center gap-2 mt-1.5">
                  <Mail className="w-4 h-4 text-white/20" />
                  <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="flex-1 bg-transparent text-white text-sm font-semibold outline-none placeholder:text-white/15"
                    placeholder="you@email.com" data-testid="home-membership-email-input" />
                </div>
              </div>
              <div className="rounded-2xl border border-white/[0.08] p-3.5 opacity-60" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-green-400/50" />
                  <span className="text-white/50 text-xs">+91 {phone}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 ml-auto" />
                </div>
              </div>
              <button onClick={handleSubmitForm} disabled={loading || !formData.name.trim()}
                className="w-full py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.97] transition-all"
                style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)', boxShadow: '0 6px 24px rgba(220,38,38,0.25)' }}
                data-testid="home-membership-submit-btn">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Choose Plan <ChevronRight className="w-4 h-4" /></>}
              </button>
            </div>
          )}

          {/* === STEP: Payment === */}
          {step === 'payment' && (
            <div className="space-y-4" style={{ animation: 'fadeUp 0.3s ease-out' }}>
              <p className="text-white font-bold text-sm text-center">Choose Your Plan</p>
              <div className="space-y-2.5">
                {plans.map(plan => (
                  <button key={plan.id} onClick={() => setSelectedPlan(plan.id)}
                    className="w-full rounded-2xl p-3.5 text-left transition-all border"
                    style={{
                      background: selectedPlan === plan.id ? 'rgba(220,38,38,0.08)' : 'rgba(255,255,255,0.02)',
                      borderColor: selectedPlan === plan.id ? 'rgba(220,38,38,0.25)' : 'rgba(255,255,255,0.06)',
                    }}
                    data-testid={`home-membership-plan-${plan.id}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-white font-bold text-sm">{plan.name}</span>
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-white/40 text-xs">&#8377;</span>
                        <span className="text-white font-black text-lg">{plan.price}</span>
                        <span className="text-white/30 text-[10px]">{plan.period}</span>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      {plan.features.map((f, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[10px]">
                          <CheckCircle2 className="w-2.5 h-2.5 text-red-400 flex-shrink-0" />
                          <span className="text-white/40">{f}</span>
                        </div>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={handlePayment}
                className="w-full py-3.5 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-all"
                style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)', boxShadow: '0 6px 24px rgba(220,38,38,0.25)' }}
                data-testid="home-membership-pay-btn">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CreditCard className="w-4 h-4" /></>}
                Pay &#8377;{plans.find(p => p.id === selectedPlan)?.price}{plans.find(p => p.id === selectedPlan)?.period}
              </button>
            </div>
          )}

          {/* === STEP: Success === */}
          {step === 'success' && (
            <div className="flex flex-col items-center py-6 space-y-3" style={{ animation: 'fadeUp 0.3s ease-out' }}>
              <div className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Welcome aboard!</h3>
              <p className="text-white/40 text-xs text-center">Your membership is active. Enjoy exclusive benefits!</p>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
};

export default HomeMembershipForm;

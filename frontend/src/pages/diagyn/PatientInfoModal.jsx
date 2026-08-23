import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Shield, CheckCircle2, Loader2, User, X, ChevronRight, Phone, Calendar, Clock, MapPin, Mail, ChevronDown, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { toast } from 'sonner';
import FamilyMemberPicker from '@/components/FamilyMemberPicker';
import { DOCTOR_BOOKING_THEMES } from './data';

const PatientInfoModal = ({ isOpen, onClose, onSubmit, loading, isOnlineConsultation = false, doctorTheme, bookingContext = {} }) => {
  const theme = doctorTheme || DOCTOR_BOOKING_THEMES.vikas;
  const [patientInfo, setPatientInfo] = useState({ name: '', phone: '', email: '', age: '', abhaNumber: '', abhaAddress: '' });
  const [selectedMember, setSelectedMember] = useState(null);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState('info');
  const [otpLoading, setOtpLoading] = useState(false);
  const [mockOtp, setMockOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [expandedSection, setExpandedSection] = useState(null); // 'email' | 'abha' | 'family' | null
  const otpRefs = useRef([]);
  
  const guestMobile = localStorage.getItem('guestMobile') || localStorage.getItem('userPhone') || '';
  const isAlreadyVerified = Boolean(guestMobile);
  const isEmailAuth = localStorage.getItem('authMethod') === 'email';
  const emailUserData = isEmailAuth ? JSON.parse(localStorage.getItem('userData') || '{}') : {};
  const verifiedPhone = guestMobile;
  const auth = useUnifiedAuth();

  const { doctor, clinic, date, slot } = bookingContext;

  useEffect(() => {
    if (isOpen) {
      const storedPatient = localStorage.getItem('patientInfo');
      const gm = localStorage.getItem('guestMobile');
      if (storedPatient) {
        try {
          const info = JSON.parse(storedPatient);
          setPatientInfo(prev => ({ ...prev, name: info.name || prev.name, phone: gm || info.phone || info.mobile || prev.phone, email: info.email || (isEmailAuth ? emailUserData.email : '') || prev.email }));
        } catch {}
      } else if (gm) {
        setPatientInfo(prev => ({ ...prev, phone: gm }));
      }
      if (isEmailAuth) {
        setPatientInfo(prev => ({ ...prev, name: prev.name || emailUserData.name || '', email: prev.email || emailUserData.email || '' }));
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const toggleSection = (section) => setExpandedSection(prev => prev === section ? null : section);

  const sendOtp = async () => {
    if (!patientInfo.phone || patientInfo.phone.length < 10) { toast.error('Enter a valid mobile number'); return; }
    if (!patientInfo.name) { toast.error('Enter your name'); return; }
    if (isOnlineConsultation && !patientInfo.age) { toast.error('Enter your age for online consultation'); return; }
    if (isEmailAuth) {
      try { await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/patients/auto-profile`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: patientInfo.phone, name: patientInfo.name, email: emailUserData.email }) }); localStorage.setItem('patientInfo', JSON.stringify({ phone: patientInfo.phone, mobile: patientInfo.phone, name: patientInfo.name, email: emailUserData.email, verified: true })); } catch {}
      onSubmit({ ...patientInfo, verificationToken: `email_verified_${emailUserData.email}_${Date.now()}` }); return;
    }
    if (isAlreadyVerified && patientInfo.phone === verifiedPhone) {
      try { await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/patients/auto-profile`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: patientInfo.phone, name: patientInfo.name }) }); localStorage.setItem('patientInfo', JSON.stringify({ phone: patientInfo.phone, mobile: patientInfo.phone, name: patientInfo.name, verified: true })); } catch {}
      onSubmit({ ...patientInfo, verificationToken: `whatsapp_verified_${patientInfo.phone}_${Date.now()}` }); return;
    }
    setOtpLoading(true);
    try {
      auth.updateUserInfo({ name: patientInfo.name, phone: patientInfo.phone, email: patientInfo.email });
      const result = await auth.sendOtp(patientInfo.phone, 'appointment');
      if (result.success) { setResendTimer(10); setStep('otp'); setTimeout(() => otpRefs.current[0]?.focus(), 100); }
    } catch (error) { toast.error(error.response?.data?.detail || 'Failed to send OTP'); }
    finally { setOtpLoading(false); }
  };

  const verifyOtp = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) { toast.error('Enter complete 6-digit OTP'); return; }
    setOtpLoading(true);
    try {
      const result = await auth.verifyOtp(otpValue);
      if (result.success) { onSubmit({ ...patientInfo, verificationToken: result.verificationToken }); }
    } catch (error) { toast.error(error.response?.data?.detail || 'Invalid OTP'); setOtp(['', '', '', '', '', '']); otpRefs.current[0]?.focus(); }
    finally { setOtpLoading(false); }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp]; newOtp[index] = value.slice(-1); setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };
  const handleOtpKeyDown = (index, e) => { if (e.key === 'Backspace' && !otp[index] && index > 0) otpRefs.current[index - 1]?.focus(); };

  if (!isOpen) return null;

  // Don't use patientInfo.name here — it flips canDirectBook mid-typing, unmounting the input
  const isVerifiedUser = isAlreadyVerified && patientInfo.phone === verifiedPhone;
  const canDirectBook = isVerifiedUser || isEmailAuth;

  const formatSlot = (s) => {
    if (!s) return '';
    const clean = s.trim();
    if (clean.includes('AM') || clean.includes('PM')) return clean;
    const [h, m] = clean.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const dh = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${dh}:${String(m).padStart(2, '0')} ${period}`;
  };

  const formatDate = (d) => {
    if (!d) return '';
    try {
      const dt = d instanceof Date ? d : new Date(d + 'T00:00:00');
      return dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch { return String(d); }
  };

  const clinicDisplay = clinic === 'online' ? 'Online Consultation' : clinic === 'pushpa' ? 'Pushpa Clinic' : clinic === 'amnion' ? 'Amnion - Naigaon' : clinic || '';

  // Detect if accent color is bright → use dark text for contrast
  const isLightAccent = (() => {
    const hex = (theme.accent || '#14B8A6').replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 150;
  })();
  const headerText = isLightAccent ? '#1a1a2e' : '#ffffff';
  const headerTextSub = isLightAccent ? 'rgba(26,26,46,0.6)' : 'rgba(255,255,255,0.7)';
  const headerTextMuted = isLightAccent ? 'rgba(26,26,46,0.4)' : 'rgba(255,255,255,0.5)';
  const headerOverlay = isLightAccent ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.1)';

  /* ── Collapsible Section ── */
  const CollapsibleRow = ({ id, icon: Icon, label, children, accent = false }) => (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <button onClick={() => toggleSection(id)} className="w-full flex items-center justify-between px-3.5 py-3 active:bg-white/[0.02] transition-colors" data-testid={`toggle-${id}`}>
        <div className="flex items-center gap-2.5">
          <Icon className="w-3.5 h-3.5" style={{ color: accent ? theme.accent : 'rgba(255,255,255,0.35)' }} />
          <span className="text-xs font-medium" style={{ color: accent ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.4)' }}>{label}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-white/20 transition-transform duration-200 ${expandedSection === id ? 'rotate-180' : ''}`} />
      </button>
      {expandedSection === id && (
        <div className="px-3.5 pb-3 pt-0 animate-in fade-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[10000] flex items-end justify-center" onClick={onClose} data-testid="patient-info-modal">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      <div 
        className="relative w-full max-w-lg rounded-t-[28px] overflow-hidden"
        style={{ background: theme.darkBg || '#0A1628' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Booking Summary Card ── */}
        <div className="relative overflow-hidden" style={{ background: theme.accent || '#14B8A6' }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.3), transparent 60%)' }} />
          
          <div className="relative px-5 pt-5 pb-4">
            <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center active:scale-95 transition-transform" style={{ background: headerOverlay }} data-testid="close-patient-modal">
              <X className="w-4 h-4" style={{ color: headerTextSub }} />
            </button>

            <div className="flex items-center gap-3.5 mb-4">
              {doctor?.image ? (
                <img src={doctor.image} alt={doctor.name} className="w-14 h-14 rounded-full object-cover border-2" style={{ borderColor: headerOverlay }} />
              ) : (
                <div className="w-14 h-14 rounded-full flex items-center justify-center border-2" style={{ background: headerOverlay, borderColor: headerOverlay }}>
                  <User className="w-6 h-6" style={{ color: headerTextSub }} />
                </div>
              )}
              <div>
                <h3 className="font-bold text-lg leading-tight" style={{ fontFamily: 'Outfit, sans-serif', color: headerText }}>{doctor?.name || 'Doctor'}</h3>
                <p className="text-sm" style={{ color: headerTextSub }}>{doctor?.specialty || ''}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl px-4 py-3" style={{ background: headerOverlay }}>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" style={{ color: headerTextSub }} />
                <span className="font-semibold text-sm" style={{ color: headerText }}>{formatDate(date)}</span>
              </div>
              <div className="w-px h-4" style={{ background: headerOverlay }} />
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" style={{ color: headerTextSub }} />
                <span className="font-semibold text-sm" style={{ color: headerText }}>{formatSlot(slot)}</span>
              </div>
            </div>
            {clinicDisplay && (
              <div className="flex items-center gap-1.5 mt-2 px-1">
                <MapPin className="w-3 h-3" style={{ color: headerTextMuted }} />
                <span className="text-xs" style={{ color: headerTextMuted }}>{clinicDisplay}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Form Content ── */}
        <div className="px-5 pt-4 pb-8 max-h-[50vh] overflow-y-auto">
          {step === 'info' ? (
            <div className="space-y-2.5">

              {/* Verified user: compact summary */}
              {canDirectBook ? (
                <div className="rounded-2xl p-3.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${theme.accent}18`, border: `1px solid ${theme.accent}30` }}>
                      <User className="w-4 h-4" style={{ color: theme.accent }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Input
                        value={patientInfo.name}
                        onChange={(e) => setPatientInfo({ ...patientInfo, name: e.target.value })}
                        placeholder="Enter your full name"
                        className="border-0 bg-transparent h-8 text-white text-sm font-bold placeholder:text-white/30 focus-visible:ring-0 px-0"
                        data-testid="input-patient-name"
                      />
                      <div className="flex items-center gap-1.5">
                        <span className="text-white/40 text-xs">{patientInfo.phone}</span>
                        <CheckCircle2 className="w-3 h-3" style={{ color: theme.accent }} />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* New user: Name + Phone fields */
                <>
                  <div className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <label className="text-[10px] uppercase tracking-wider font-bold mb-1.5 block" style={{ color: theme.accent }}>Full Name *</label>
                    <div className="flex items-center gap-2.5">
                      <User className="w-4 h-4 flex-shrink-0" style={{ color: theme.accent }} />
                      <Input value={patientInfo.name} onChange={(e) => setPatientInfo({ ...patientInfo, name: e.target.value })} placeholder="Enter your name"
                        className="border-0 bg-transparent h-9 text-white text-sm placeholder:text-white/30 focus-visible:ring-0 px-0" data-testid="input-patient-name" />
                    </div>
                  </div>

                  <div className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <label className="text-[10px] uppercase tracking-wider font-bold mb-1.5 block" style={{ color: theme.accent }}>
                      {isEmailAuth ? 'Contact Number *' : 'WhatsApp Number *'}
                    </label>
                    <div className="flex items-center gap-2.5">
                      <Phone className="w-4 h-4 flex-shrink-0" style={{ color: theme.accent }} />
                      <Input value={patientInfo.phone} onChange={(e) => setPatientInfo({ ...patientInfo, phone: e.target.value.replace(/[^\d+]/g, '').slice(0, 15) })} placeholder="10-digit number"
                        className="border-0 bg-transparent h-9 text-white text-sm placeholder:text-white/30 focus-visible:ring-0 px-0"
                        disabled={!isEmailAuth && isAlreadyVerified && patientInfo.phone === verifiedPhone} data-testid="input-patient-phone" />
                      {isAlreadyVerified && patientInfo.phone === verifiedPhone && <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: theme.accent }} />}
                    </div>
                  </div>
                </>
              )}

              {/* Age (online only) */}
              {isOnlineConsultation && (
                <div className="rounded-2xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <label className="text-[10px] uppercase tracking-wider font-bold mb-1.5 block" style={{ color: theme.accent }}>Age *</label>
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: theme.accent }} />
                    <Input type="number" min="1" max="120" value={patientInfo.age} onChange={(e) => setPatientInfo({ ...patientInfo, age: e.target.value.replace(/\D/g, '').slice(0, 3) })} placeholder="Your age"
                      className="border-0 bg-transparent h-9 text-white text-sm placeholder:text-white/30 focus-visible:ring-0 px-0" data-testid="input-patient-age" />
                  </div>
                </div>
              )}

              {/* ── Collapsible: Booking for someone else ── */}
              <CollapsibleRow id="family" icon={Users} label="Booking for someone else?" accent>
                <FamilyMemberPicker phone={localStorage.getItem('userPhone') || localStorage.getItem('guestMobile') || ''}
                  onSelect={(member) => { setSelectedMember(member); if (member) setPatientInfo(prev => ({ ...prev, name: member.name, phone: member.phone || prev.phone, age: member.age ? String(member.age) : prev.age })); }}
                  className="mt-0" />
                {/* Manual entry for new person */}
                <div className="mt-2 space-y-2">
                  <Input value={selectedMember ? '' : (patientInfo._otherName || '')} placeholder="Or enter their name"
                    onChange={(e) => { setSelectedMember(null); setPatientInfo(prev => ({ ...prev, name: e.target.value, _otherName: e.target.value })); }}
                    className="rounded-xl h-9 text-sm text-white placeholder:text-white/25 border-white/8 bg-white/[0.03] focus-visible:ring-0" data-testid="input-other-name" />
                  <Input placeholder="Their phone number"
                    onChange={(e) => setPatientInfo(prev => ({ ...prev, phone: e.target.value.replace(/[^\d+]/g, '').slice(0, 15) }))}
                    className="rounded-xl h-9 text-sm text-white placeholder:text-white/25 border-white/8 bg-white/[0.03] focus-visible:ring-0" data-testid="input-other-phone" />
                </div>
              </CollapsibleRow>

              {/* ── Collapsible: Email ── */}
              <CollapsibleRow id="email" icon={Mail} label="Add email (optional)">
                <Input type="email" value={patientInfo.email} onChange={(e) => setPatientInfo({ ...patientInfo, email: e.target.value })} placeholder="your@email.com"
                  className="rounded-xl h-9 text-sm text-white placeholder:text-white/25 border-white/8 bg-white/[0.03] focus-visible:ring-0" data-testid="input-patient-email" />
              </CollapsibleRow>

              {/* ── Collapsible: ABHA ── */}
              <CollapsibleRow id="abha" icon={Shield} label="Link ABHA Health ID (optional)">
                <div className="space-y-2">
                  <Input value={patientInfo.abhaNumber || ''} onChange={(e) => setPatientInfo({ ...patientInfo, abhaNumber: e.target.value.replace(/[^\d-]/g, '').slice(0, 17) })} placeholder="XX-XXXX-XXXX-XXXX"
                    className="rounded-xl h-9 text-sm text-white placeholder:text-white/25 border-white/8 bg-white/[0.03] focus-visible:ring-0" data-testid="input-abha-number" />
                  <Input value={patientInfo.abhaAddress || ''} onChange={(e) => setPatientInfo({ ...patientInfo, abhaAddress: e.target.value.slice(0, 40) })} placeholder="yourname@abdm"
                    className="rounded-xl h-9 text-sm text-white placeholder:text-white/25 border-white/8 bg-white/[0.03] focus-visible:ring-0" data-testid="input-abha-address" />
                  <p className="text-[9px] text-white/30">Ayushman Bharat Health Account</p>
                </div>
              </CollapsibleRow>

              {/* CTA */}
              <button onClick={sendOtp} disabled={otpLoading || loading || !patientInfo.name || patientInfo.phone.length < 10 || (isOnlineConsultation && !patientInfo.age)}
                className="w-full py-4 rounded-2xl text-base font-black flex items-center justify-center gap-2 active:scale-[0.97] transition-all disabled:opacity-40 mt-1"
                style={{ background: theme.ctaGradient || `linear-gradient(135deg, ${theme.accent}, ${theme.accent}dd)`, color: theme.ctaText || '#fff', boxShadow: `0 8px 32px ${theme.ctaShadow || 'rgba(0,0,0,0.3)'}` }}
                data-testid="btn-send-otp">
                {(otpLoading || loading) ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {canDirectBook ? 'Book Appointment' : 'Continue'}
                <ChevronRight className="w-5 h-5 ml-0.5" />
              </button>
            </div>
          ) : (
            /* ── OTP Step ── */
            <div>
              <p className="text-white/50 text-xs text-center mb-4">Enter OTP sent to +91 {patientInfo.phone}</p>
              {mockOtp && (
                <div className="mb-3 p-2.5 rounded-xl text-center" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
                  <p className="text-xs text-white/70">Demo OTP: <span className="font-mono font-bold text-amber-400">{mockOtp}</span></p>
                </div>
              )}
              <div className="rounded-2xl p-4 mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex justify-center gap-2.5 mb-4">
                  {otp.map((digit, index) => (
                    <input key={index} ref={el => otpRefs.current[index] = el} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={(e) => handleOtpChange(index, e.target.value)} onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className="w-11 h-13 rounded-xl text-center text-lg font-black border-2 focus:outline-none transition-all"
                      style={{
                        borderColor: digit ? theme.accent : 'rgba(255,255,255,0.15)',
                        background: digit ? `${theme.accent}10` : 'rgba(255,255,255,0.04)',
                        color: '#fff',
                        boxShadow: digit ? `0 0 12px ${theme.accent}20` : 'none',
                      }}
                      data-testid={`otp-digit-${index}`} />
                  ))}
                </div>
                <div className="flex justify-center">
                  {resendTimer > 0 ? <span className="text-white/40 text-xs">Resend in {resendTimer}s</span> : <button onClick={sendOtp} disabled={otpLoading} className="text-xs font-bold" style={{ color: theme.accent }} data-testid="btn-resend-otp">Resend OTP</button>}
                </div>
              </div>
              <button onClick={verifyOtp} disabled={otpLoading || otp.join('').length !== 6}
                className="w-full py-4 rounded-2xl text-base font-black flex items-center justify-center gap-2 active:scale-[0.97] transition-all disabled:opacity-40"
                style={{ background: theme.ctaGradient || `linear-gradient(135deg, ${theme.accent}, ${theme.accent}dd)`, color: theme.ctaText || '#fff', boxShadow: `0 8px 32px ${theme.ctaShadow || 'rgba(0,0,0,0.3)'}` }}
                data-testid="btn-verify-otp">
                {otpLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null} Verify & Book
              </button>
              <button onClick={() => setStep('info')} className="w-full mt-2 py-2.5 text-white/40 text-xs flex items-center justify-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Change Number</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientInfoModal;

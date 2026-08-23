import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import {
  ArrowLeft, Shield, Fingerprint, Smartphone, CheckCircle2,
  Loader2, Copy, FileText, Link2, CreditCard, AlertTriangle,
  ChevronRight, Heart, Activity, User, Calendar
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';

const API = process.env.REACT_APP_BACKEND_URL;

// ── ABHA Card Display ──
const ABHACard = ({ profile }) => (
  <div className="relative overflow-hidden rounded-2xl p-5" data-testid="abha-card"
    style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0d4f8b 40%, #1a6fb5 100%)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
    {/* Indian emblem watermark */}
    <div className="absolute top-3 right-3 opacity-10">
      <Shield className="w-20 h-20 text-white" />
    </div>
    <div className="relative z-10">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
          <Heart className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-[10px] tracking-widest text-blue-200 uppercase">Ayushman Bharat</p>
          <p className="text-sm font-bold text-white">Digital Health ID</p>
        </div>
      </div>
      <p className="text-2xl font-mono font-bold text-white tracking-wider mb-1" data-testid="abha-number">
        {profile.abha_number}
      </p>
      <p className="text-xs text-blue-200 mb-3">{profile.abha_address}</p>
      <div className="flex justify-between items-end">
        <div>
          <p className="text-[10px] text-blue-300 uppercase">Name</p>
          <p className="text-sm font-semibold text-white">{profile.name}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-blue-300 uppercase">Status</p>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-300">
            <CheckCircle2 className="w-3 h-3" /> Active
          </span>
        </div>
      </div>
      {profile.demo_mode && (
        <div className="mt-3 px-2 py-1 rounded bg-amber-500/20 border border-amber-400/30">
          <p className="text-[10px] text-amber-200 text-center">Demo Mode — Connect ABDM sandbox for production</p>
        </div>
      )}
    </div>
  </div>
);

// ── Create ABHA Flow ──
const CreateABHAFlow = ({ onCreated }) => {
  const [step, setStep] = useState('method'); // method -> details -> otp -> done
  const [method, setMethod] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [yearOfBirth, setYearOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [otp, setOtp] = useState('');
  const [txnId, setTxnId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleInitiate = async () => {
    if (!identifier || !name) { toast.error('Fill all required fields'); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/abha/create/init`, {
        method, identifier, name,
        year_of_birth: yearOfBirth ? parseInt(yearOfBirth) : null,
        gender: gender || null
      });
      setTxnId(res.data.transaction_id);
      setStep('otp');
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to initiate');
    }
    setLoading(false);
  };

  const handleVerifyOTP = async () => {
    if (!otp) { toast.error('Enter OTP'); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/abha/create/verify`, {
        transaction_id: txnId, otp
      });
      setResult(res.data);
      setStep('done');
      toast.success('ABHA Health ID created!');
      onCreated?.(res.data);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'OTP verification failed');
    }
    setLoading(false);
  };

  if (step === 'method') {
    return (
      <div className="space-y-4" data-testid="abha-method-step">
        <h3 className="text-lg font-bold text-white">Create Your ABHA</h3>
        <p className="text-sm text-gray-400">Choose verification method</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { id: 'aadhaar', icon: Fingerprint, label: 'Aadhaar', desc: '12-digit Aadhaar number' },
            { id: 'mobile', icon: Smartphone, label: 'Mobile', desc: '10-digit mobile number' },
          ].map(m => (
            <button key={m.id} onClick={() => { setMethod(m.id); setStep('details'); }}
              className="p-4 rounded-xl text-left transition-all active:scale-[0.97]"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              data-testid={`abha-method-${m.id}`}>
              <m.icon className="w-6 h-6 text-blue-400 mb-2" />
              <p className="font-semibold text-white text-sm">{m.label}</p>
              <p className="text-xs text-gray-400">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === 'details') {
    return (
      <div className="space-y-4" data-testid="abha-details-step">
        <h3 className="text-lg font-bold text-white">Enter Details</h3>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Full Name *"
          className="h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500" data-testid="abha-name-input" />
        <Input value={identifier} onChange={e => setIdentifier(e.target.value)}
          placeholder={method === 'aadhaar' ? 'Aadhaar Number (12 digits) *' : 'Mobile Number (10 digits) *'}
          className="h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500" maxLength={method === 'aadhaar' ? 12 : 10}
          data-testid="abha-identifier-input" />
        <div className="grid grid-cols-2 gap-3">
          <Input value={yearOfBirth} onChange={e => setYearOfBirth(e.target.value)} placeholder="Year of Birth"
            className="h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500" maxLength={4} />
          <select value={gender} onChange={e => setGender(e.target.value)}
            className="h-11 rounded-md bg-white/5 border border-white/10 text-white px-3 text-sm">
            <option value="" className="bg-gray-900">Gender</option>
            <option value="M" className="bg-gray-900">Male</option>
            <option value="F" className="bg-gray-900">Female</option>
            <option value="O" className="bg-gray-900">Other</option>
          </select>
        </div>
        <Button onClick={handleInitiate} disabled={loading} className="w-full h-11 bg-blue-600 hover:bg-blue-700"
          data-testid="abha-send-otp-btn">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send OTP'}
        </Button>
      </div>
    );
  }

  if (step === 'otp') {
    return (
      <div className="space-y-4" data-testid="abha-otp-step">
        <h3 className="text-lg font-bold text-white">Verify OTP</h3>
        <p className="text-sm text-gray-400">Enter the OTP sent to your {method === 'aadhaar' ? 'Aadhaar-linked mobile' : 'mobile'}</p>
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-xs text-amber-300 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Demo mode: Use OTP <span className="font-mono font-bold">123456</span>
          </p>
        </div>
        <Input value={otp} onChange={e => setOtp(e.target.value)} placeholder="Enter 6-digit OTP"
          className="h-11 bg-white/5 border-white/10 text-white text-center text-lg tracking-[0.5em] placeholder:text-gray-500 placeholder:tracking-normal"
          maxLength={6} data-testid="abha-otp-input" />
        <Button onClick={handleVerifyOTP} disabled={loading || otp.length !== 6}
          className="w-full h-11 bg-emerald-600 hover:bg-emerald-700" data-testid="abha-verify-otp-btn">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify & Create ABHA'}
        </Button>
      </div>
    );
  }

  if (step === 'done' && result) {
    return (
      <div className="space-y-4 text-center" data-testid="abha-created-step">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <h3 className="text-lg font-bold text-white">ABHA Created Successfully!</h3>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
          <p className="text-xs text-gray-400">ABHA Number</p>
          <p className="text-lg font-mono font-bold text-white">{result.abha_number}</p>
          <p className="text-xs text-gray-400 mt-2">ABHA Address</p>
          <p className="text-sm text-blue-400">{result.abha_address}</p>
        </div>
        <Button onClick={() => navigator.clipboard.writeText(result.abha_number).then(() => toast.success('Copied!'))}
          variant="outline" className="border-white/10 text-white" data-testid="abha-copy-btn">
          <Copy className="w-4 h-4 mr-2" /> Copy ABHA Number
        </Button>
      </div>
    );
  }

  return null;
};

// ── Main ABHA Page ──
const ABHAPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [linking, setLinking] = useState(false);

  const phone = user?.phone || '';

  useEffect(() => {
    if (phone) fetchProfile();
    else setLoading(false);
  }, [phone]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/abha/profile/${phone}`);
      if (res.data.linked) setProfile(res.data);
    } catch { /* no ABHA linked */ }
    setLoading(false);
  };

  const handleLink = async () => {
    if (!linkInput || linkInput.length < 10) { toast.error('Enter valid ABHA number'); return; }
    setLinking(true);
    try {
      await axios.post(`${API}/api/abha/link`, { abha_number: linkInput, phone });
      toast.success('ABHA linked successfully!');
      fetchProfile();
      setLinkInput('');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Linking failed');
    }
    setLinking(false);
  };

  const handleCreated = (data) => {
    // Auto-link after creation
    if (phone && data.abha_number) {
      axios.post(`${API}/api/abha/link`, { abha_number: data.abha_number, phone })
        .then(() => fetchProfile())
        .catch(() => {});
    }
    setShowCreate(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A12' }}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0A0A12' }} data-testid="abha-page">
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-3" style={{ background: 'rgba(10,10,18,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <div>
            <h1 className="font-bold text-base text-white">ABHA Health ID</h1>
            <p className="text-[11px] text-gray-500">Ayushman Bharat Digital Mission</p>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-5">
        {/* ABHA Card (if linked) */}
        {profile && <ABHACard profile={profile} />}

        {/* No ABHA linked */}
        {!profile && !showCreate && (
          <div className="space-y-4">
            {/* Info Banner */}
            <div className="rounded-2xl p-4 space-y-3" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(16,185,129,0.1))', border: '1px solid rgba(59,130,246,0.15)' }}>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-white text-sm">What is ABHA?</h3>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                ABHA (Ayushman Bharat Health Account) is your unique digital health identity under India's National Digital Health Mission. 
                It helps you store and access your health records digitally across hospitals and clinics.
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  { icon: FileText, label: 'Digital Records' },
                  { icon: Link2, label: 'Cross-Hospital' },
                  { icon: Shield, label: 'Govt. Backed' },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <item.icon className="w-4 h-4 text-blue-400" />
                    <span className="text-[10px] text-gray-400">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button onClick={() => setShowCreate(true)} className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-sm font-semibold gap-2"
                data-testid="create-abha-btn">
                <Fingerprint className="w-5 h-5" /> Create New ABHA
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5" /></div>
                <div className="relative flex justify-center"><span className="px-3 text-xs text-gray-500" style={{ background: '#0A0A12' }}>or link existing</span></div>
              </div>

              <div className="flex gap-2">
                <Input value={linkInput} onChange={e => setLinkInput(e.target.value)}
                  placeholder="Enter ABHA Number (XX-XXXX-XXXX-XXXX)"
                  className="flex-1 h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 text-sm"
                  data-testid="link-abha-input" />
                <Button onClick={handleLink} disabled={linking} className="h-11 px-4 bg-emerald-600 hover:bg-emerald-700"
                  data-testid="link-abha-btn">
                  {linking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Create Flow */}
        {showCreate && (
          <Card className="p-5 rounded-2xl bg-transparent border-white/10">
            <CreateABHAFlow onCreated={handleCreated} />
            <button onClick={() => setShowCreate(false)} className="w-full mt-3 text-xs text-gray-500 hover:text-gray-300">
              Cancel
            </button>
          </Card>
        )}

        {/* Linked Profile Details */}
        {profile && (
          <div className="space-y-4">
            {/* Quick Actions */}
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Health Records</h3>
            <div className="space-y-2">
              {[
                { icon: Calendar, label: 'View Appointments', desc: 'Past & upcoming consultations', color: 'text-teal-400' },
                { icon: Activity, label: 'Diagnostic Reports', desc: 'Lab test results & imaging', color: 'text-blue-400' },
                { icon: CreditCard, label: 'Prescriptions', desc: 'Digital prescription records', color: 'text-purple-400' },
              ].map((item, i) => (
                <button key={i} className="w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all active:scale-[0.98]"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{item.label}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600" />
                </button>
              ))}
            </div>

            {/* ABDM Info */}
            <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="text-xs text-gray-400 leading-relaxed">
                Your health records are secured under the ABDM framework. In production, records from any ABDM-compliant 
                hospital or clinic can be linked to your ABHA, giving you a complete digital health history.
              </p>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default ABHAPage;

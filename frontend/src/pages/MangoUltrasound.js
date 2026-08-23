import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Activity, Phone, User, MapPin, Baby, Calendar, ChevronRight, Loader2, Stethoscope, Pill, ShoppingBag, Thermometer, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { mediumTap, lightTap, successPattern } from '@/utils/haptics';
import ServiceHeader from '@/components/ServiceHeader';
import TestDetailSheet from '@/components/TestDetailSheet';

const API = process.env.REACT_APP_BACKEND_URL;

const ULTRASOUND_SERVICES = [
  { id: 'early_scan', name: 'Early Pregnancy Scan', price: 1000, category: 'ultrasound', desc: 'First trimester confirmation scan' },
  { id: 'nt_scan', name: 'NT Scan', price: 1200, category: 'ultrasound', desc: 'Nuchal Translucency screening', note: 'Fill form at reception' },
  { id: 'growth_scan', name: 'Growth Scan', price: 1500, category: 'ultrasound', desc: 'Fetal growth & development tracking' },
  { id: 'pelvis_scan', name: 'Pelvis Scan', price: 1000, category: 'ultrasound', desc: 'Pelvic organ evaluation' },
  { id: 'follicular', name: 'Follicular Monitoring', price: 200, category: 'ultrasound', desc: 'Ovulation cycle tracking' },
];

const CARDIAC_SERVICES = [
  { id: 'ecg', name: 'ECG', price: 300, category: 'cardiac', desc: 'Electrocardiogram - Heart rhythm analysis' },
];

/* Sono wave — funnel-shaped arcs from a point source, like real ultrasound probe */
const SonoWave = ({ className = '' }) => (
  <svg className={`absolute pointer-events-none ${className}`} viewBox="0 0 400 400" fill="none" preserveAspectRatio="xMidYMid slice">
    {/* Point source at top center, waves fan out downward */}
    {[...Array(18)].map((_, i) => {
      const yOff = i * 14;
      const rx = 6 + i * 18;
      const ry = 4 + i * 10;
      const op = 0.22 - i * 0.01;
      return (
        <ellipse
          key={i}
          cx="200" cy={40 + yOff}
          rx={rx} ry={ry}
          stroke="white"
          strokeWidth={i < 4 ? 1.2 : 0.8}
          opacity={op > 0.03 ? op : 0.03}
        />
      );
    })}
    {/* Central probe line */}
    <line x1="200" y1="0" x2="200" y2="50" stroke="white" strokeWidth="1.5" opacity="0.3" />
    <circle cx="200" cy="6" r="3" fill="white" opacity="0.25" />
  </svg>
);

/* Card wave — funnel from right edge */
const CardSonoWave = () => (
  <svg className="absolute right-0 top-0 h-full w-2/5 pointer-events-none" viewBox="0 0 200 180" fill="none" preserveAspectRatio="xMaxYMid slice">
    {[...Array(10)].map((_, i) => (
      <ellipse
        key={i}
        cx="200" cy={90}
        rx={8 + i * 16}
        ry={5 + i * 10}
        stroke="white"
        strokeWidth={i < 3 ? 0.9 : 0.5}
        opacity={0.12 - i * 0.009}
      />
    ))}
  </svg>
);

/* Sonography machine icon — ultrasound monitor with probe & waves */
const SonographyIcon = ({ className = '', size = 24 }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 48 48" fill="none">
    {/* Monitor */}
    <rect x="8" y="6" width="24" height="18" rx="3" stroke="currentColor" strokeWidth="2.2" fill="none" />
    {/* Screen - neon yellow */}
    <rect x="11" y="9" width="18" height="12" rx="1.5" fill="#FAFF00" opacity="0.35" />
    {/* Stand */}
    <line x1="20" y1="24" x2="20" y2="29" stroke="currentColor" strokeWidth="2" />
    <line x1="14" y1="29" x2="26" y2="29" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    {/* Probe */}
    <rect x="34" y="14" width="5" height="16" rx="2.5" stroke="currentColor" strokeWidth="2" fill="none" />
    <circle cx="36.5" cy="17" r="1.2" fill="currentColor" opacity="0.5" />
    {/* Cable */}
    <path d="M34 22 C30 28, 26 30, 22 28" stroke="#7DD3FC" strokeWidth="1.5" fill="none" opacity="0.5" strokeLinecap="round" />
    {/* Ultrasound waves - neon yellow */}
    <path d="M42 18 C44 16, 44 22, 42 20" stroke="#FAFF00" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M44 16 C47 13, 47 25, 44 22" stroke="#FAFF00" strokeWidth="1.5" opacity="0.7" strokeLinecap="round" />
    <path d="M46 14 C50 10, 50 28, 46 24" stroke="#FAFF00" strokeWidth="1.2" opacity="0.35" strokeLinecap="round" />
  </svg>
);

const MangoUltrasound = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [selectedScan, setSelectedScan] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedTestDetail, setSelectedTestDetail] = useState(null);

  const [form, setForm] = useState({
    patient_name: '', age: '', husband_name: '', address: '',
    phone: '', scan_type: '', previous_child: false, children: [], lmp: '', dob: '',
  });

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const addChild = () => setForm(prev => ({ ...prev, children: [...prev.children, { gender: 'boy', age: '' }] }));
  const updateChild = (i, f, v) => {
    setForm(prev => { const k = [...prev.children]; k[i] = { ...k[i], [f]: v }; return { ...prev, children: k }; });
  };
  const removeChild = (i) => setForm(prev => ({ ...prev, children: prev.children.filter((_, idx) => idx !== i) }));

  const handleSelectScan = (scan) => {
    mediumTap();
    setSelectedScan(scan);
    updateField('scan_type', scan.name);
    setStep(1);
  };

  const handleSubmit = async () => {
    if (!form.patient_name || !form.phone || !form.scan_type) { toast.error('Please fill required fields'); return; }
    if (form.phone.length < 10) { toast.error('Enter valid phone number'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/proton/book`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_name: form.patient_name, age: form.age, husband_name: form.husband_name,
          address: form.address, mobile_number: form.phone, scan_type: form.scan_type,
          lmp: form.lmp, date_of_birth: form.dob, has_children: form.previous_child,
          children: form.children.filter(c => c.age),
          booking_date: new Date().toISOString().split('T')[0], booking_time: 'To be confirmed',
          clinic: 'Proton Diagnostic', notes: `Price: ₹${selectedScan?.price || 0}`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success('Booking submitted!');
        navigate(`/booking-confirmation?type=mango&orderId=${data.booking_id || 'PD' + Date.now()}&amount=${selectedScan?.price || 0}`);
      } else toast.error('Booking failed. Try again.');
    } catch { toast.error('Network error.'); }
    setSubmitting(false);
  };

  // ========== SERVICE CARDS ==========
  if (step === 0) {
    return (
      <div className="min-h-screen bg-black" data-testid="mango-ultrasound-page">
        <style>{`
          @keyframes cardIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
          .s-card { animation: cardIn .35s ease-out both; }
          .s-card:nth-child(1){animation-delay:.05s}
          .s-card:nth-child(2){animation-delay:.1s}
          .s-card:nth-child(3){animation-delay:.15s}
          .s-card:nth-child(4){animation-delay:.2s}
          .s-card:nth-child(5){animation-delay:.25s}
        `}</style>
        <ServiceHeader currentService="mango" />

        {/* Hero with sono wave pattern */}
        <div className="relative overflow-hidden bg-black">
          <SonoWave className="inset-0 w-full h-full" opacity={0.07} />
          <div className="relative px-5 pt-12 pb-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-5 bg-white/5 border border-white/10">
              <SonographyIcon className="text-blue-400" size={20} />
              <span className="text-[11px] font-bold tracking-[0.2em] text-blue-400">PROTON DIAGNOSTICS</span>
            </div>
            <h1 className="text-[32px] font-black text-white mb-3 leading-[1.15]" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Ultrasound &<br />Cardiac Diagnostics
            </h1>
            <p className="text-white/40 text-sm">Advanced imaging by experienced professionals</p>
          </div>
        </div>

        {/* Ultrasound Services */}
        <div className="px-4 pt-8 pb-2">
          <h2 className="text-white/90 font-bold text-xs tracking-[0.15em] uppercase mb-5 flex items-center gap-2.5 px-1">
            <div className="w-1.5 h-5 rounded-full bg-blue-500" />
            Ultrasound Services
          </h2>
          <div className="space-y-4">
            {ULTRASOUND_SERVICES.map((scan) => (
              <div
                key={scan.id}
                onClick={() => handleSelectScan(scan)}
                className="s-card w-full rounded-[22px] relative overflow-hidden text-left transition-transform active:scale-[0.97] bg-white/[0.03] border border-white/[0.06] hover:border-white/10 cursor-pointer"
                data-testid={`scan-${scan.id}`}
              >
                <CardSonoWave />
                <div className="relative z-10 p-6">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                        <p className="text-white font-bold text-[17px]">{scan.name}</p>
                        {scan.note && (
                          <span className="text-[9px] font-bold px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/20">{scan.note}</span>
                        )}
                      </div>
                      <p className="text-white/35 text-[13px]">{scan.desc}</p>
                    </div>
                    <p className="text-white font-black text-xl flex-shrink-0 pt-0.5">₹{scan.price}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedTestDetail({ name: scan.name, price: scan.price, category: scan.category }); }}
                      className="flex items-center gap-1 px-3 py-2 rounded-full text-[11px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/15 transition-colors hover:bg-blue-500/20"
                      data-testid={`view-detail-${scan.id}`}
                    >
                      <Eye className="w-3 h-3" /> View Details
                    </button>
                    <div className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-bold text-white bg-blue-600 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                      Book Scan <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cardiac */}
        <div className="px-4 pt-8 pb-4">
          <h2 className="text-white/90 font-bold text-xs tracking-[0.15em] uppercase mb-5 flex items-center gap-2.5 px-1">
            <div className="w-1.5 h-5 rounded-full bg-blue-500" />
            Cardiac Services
          </h2>
          {CARDIAC_SERVICES.map((scan) => (
            <div
              key={scan.id}
              onClick={() => handleSelectScan(scan)}
              className="s-card w-full rounded-[22px] relative overflow-hidden text-left transition-transform active:scale-[0.97] bg-white/[0.03] border border-white/[0.06] hover:border-white/10 cursor-pointer"
              data-testid={`scan-${scan.id}`}
            >
              <CardSonoWave />
              <div className="relative z-10 p-6">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex-1">
                    <p className="text-white font-bold text-[17px] mb-1.5">{scan.name}</p>
                    <p className="text-white/35 text-[13px]">{scan.desc}</p>
                  </div>
                  <p className="text-white font-black text-xl flex-shrink-0 pt-0.5">₹{scan.price}</p>
                </div>
                <div className="flex items-center justify-between">
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedTestDetail({ name: scan.name, price: scan.price, category: scan.category }); }}
                    className="flex items-center gap-1 px-3 py-2 rounded-full text-[11px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/15 transition-colors hover:bg-blue-500/20"
                    data-testid={`view-detail-${scan.id}`}
                  >
                    <Eye className="w-3 h-3" /> View Details
                  </button>
                  <div className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-bold text-white bg-blue-600 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                    Book Scan <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Back */}
        <div className="px-4 pt-2 pb-6">
          <button onClick={() => navigate('/mango')} className="w-full py-3.5 rounded-xl text-center text-sm font-medium text-white/30 bg-white/[0.03] border border-white/[0.06]" data-testid="back-to-mango">
            Back to Mango Health Labs
          </button>
        </div>

        {/* === Orange HealthPlus Cross-Promo === */}
        <div className="px-4 pb-8">
          <p className="text-white/50 text-xs text-center mb-4">Need health products or medical devices?</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { title: 'Medical Devices', sub: 'BP, Glucose & more', icon: Thermometer, color: '#3B82F6', glow: 'rgba(59,130,246,0.25)' },
              { title: 'First Aid', sub: 'Bandages, kits & care', icon: Stethoscope, color: '#EF4444', glow: 'rgba(239,68,68,0.25)' },
              { title: 'Baby & Mom Care', sub: 'Maternity essentials', icon: Baby, color: '#8B5CF6', glow: 'rgba(139,92,246,0.25)' },
              { title: 'Health Nutrition', sub: 'Supplements & drinks', icon: ShoppingBag, color: '#22C55E', glow: 'rgba(34,197,94,0.25)' },
            ].map((item) => (
              <button
                key={item.title}
                onClick={() => navigate('/nutricare')}
                className="rounded-2xl p-4 flex items-start gap-3 text-left transition-transform active:scale-[0.96] border border-white/[0.06] bg-white/[0.03]"
                data-testid={`promo-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${item.color}20`, boxShadow: `0 0 16px ${item.glow}` }}>
                  <item.icon className="w-5 h-5" style={{ color: item.color }} />
                </div>
                <div>
                  <p className="text-white font-bold text-sm leading-tight">{item.title}</p>
                  <p className="text-white/35 text-[11px] mt-0.5">{item.sub}</p>
                </div>
              </button>
            ))}
          </div>
          <p className="text-center mt-3">
            <button onClick={() => navigate('/nutricare')} className="text-orange-400 text-xs font-semibold">
              Browse Orange HealthPlus →
            </button>
          </p>
        </div>

        <div className="pb-24" />

        {selectedTestDetail && (
          <TestDetailSheet
            test={{ ...selectedTestDetail, onAdd: () => handleSelectScan(selectedTestDetail) }}
            onClose={() => setSelectedTestDetail(null)}
            source="proton"
          />
        )}
      </div>
    );
  }

  // ========== BOOKING FORM ==========
  return (
    <div className="min-h-screen bg-black pb-32" data-testid="ultrasound-booking-form">
      <div className="sticky top-0 z-20 backdrop-blur-xl bg-black/85 border-b border-white/[0.06] px-4 py-3 flex items-center gap-3">
        <button onClick={() => setStep(0)} className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5" data-testid="back-to-services">
          <ArrowLeft className="w-5 h-5 text-blue-400" />
        </button>
        <div className="flex-1">
          <h2 className="text-white font-bold text-sm">{selectedScan?.name}</h2>
          <p className="text-blue-400 text-xs font-semibold">₹{selectedScan?.price}</p>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-4">
        {/* Patient Name */}
        <div>
          <label className="text-[11px] uppercase tracking-wider mb-1.5 block font-semibold text-white/40">Patient Name *</label>
          <div className="relative">
            <User className="absolute left-3.5 top-3.5 w-4 h-4 text-blue-500/40" />
            <input type="text" value={form.patient_name} onChange={e => updateField('patient_name', e.target.value)}
              placeholder="Full name" className="w-full h-12 pl-11 pr-4 rounded-xl text-white placeholder-white/20 outline-none bg-white/[0.04] border border-white/[0.08] focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20"
              data-testid="form-patient-name" />
          </div>
        </div>

        {/* Age */}
        <div>
          <label className="text-[11px] uppercase tracking-wider mb-1.5 block font-semibold text-white/40">Age</label>
          <input type="number" value={form.age} onChange={e => updateField('age', e.target.value)}
            placeholder="Age" className="w-full h-12 px-4 rounded-xl text-white placeholder-white/20 outline-none bg-white/[0.04] border border-white/[0.08] focus:border-blue-500/40"
            data-testid="form-age" />
        </div>

        {/* Husband Name */}
        <div>
          <label className="text-[11px] uppercase tracking-wider mb-1.5 block font-semibold text-white/40">Husband's Name</label>
          <input type="text" value={form.husband_name} onChange={e => updateField('husband_name', e.target.value)}
            placeholder="Husband's name" className="w-full h-12 px-4 rounded-xl text-white placeholder-white/20 outline-none bg-white/[0.04] border border-white/[0.08] focus:border-blue-500/40"
            data-testid="form-husband-name" />
        </div>

        {/* Phone */}
        <div>
          <label className="text-[11px] uppercase tracking-wider mb-1.5 block font-semibold text-white/40">Phone *</label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-blue-500/40" />
            <input type="tel" value={form.phone} onChange={e => updateField('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit mobile" className="w-full h-12 pl-11 pr-4 rounded-xl text-white placeholder-white/20 outline-none bg-white/[0.04] border border-white/[0.08] focus:border-blue-500/40"
              data-testid="form-phone" />
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="text-[11px] uppercase tracking-wider mb-1.5 block font-semibold text-white/40">Address</label>
          <div className="relative">
            <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-blue-500/40" />
            <input type="text" value={form.address} onChange={e => updateField('address', e.target.value)}
              placeholder="Full address" className="w-full h-12 pl-11 pr-4 rounded-xl text-white placeholder-white/20 outline-none bg-white/[0.04] border border-white/[0.08] focus:border-blue-500/40"
              data-testid="form-address" />
          </div>
        </div>

        {/* LMP */}
        {selectedScan?.category === 'ultrasound' && (
          <div>
            <label className="text-[11px] uppercase tracking-wider mb-1.5 block font-semibold text-white/40">LMP (Last Menstrual Period)</label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-3.5 w-4 h-4 text-blue-500/40" />
              <input type="date" value={form.lmp} onChange={e => updateField('lmp', e.target.value)}
                className="w-full h-12 pl-11 pr-4 rounded-xl text-white outline-none bg-white/[0.04] border border-white/[0.08] focus:border-blue-500/40" style={{ colorScheme: 'dark' }}
                data-testid="form-lmp" />
            </div>
          </div>
        )}

        {/* DOB */}
        <div>
          <label className="text-[11px] uppercase tracking-wider mb-1.5 block font-semibold text-white/40">Date of Birth</label>
          <div className="relative">
            <Calendar className="absolute left-3.5 top-3.5 w-4 h-4 text-blue-500/40" />
            <input type="date" value={form.dob} onChange={e => updateField('dob', e.target.value)}
              className="w-full h-12 pl-11 pr-4 rounded-xl text-white outline-none bg-white/[0.04] border border-white/[0.08] focus:border-blue-500/40" style={{ colorScheme: 'dark' }}
              data-testid="form-dob" />
          </div>
        </div>

        {/* Previous Children */}
        <div className="rounded-xl p-4 bg-white/[0.04] border border-white/[0.08]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Baby className="w-4 h-4 text-blue-400" />
              <span className="text-white text-sm font-medium">Previous Children?</span>
            </div>
            <button onClick={() => updateField('previous_child', !form.previous_child)}
              className="w-12 h-6 rounded-full relative transition-all" style={{ background: form.previous_child ? '#3B82F6' : '#333' }}
              data-testid="toggle-previous-child">
              <div className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all shadow" style={{ left: form.previous_child ? '26px' : '2px' }} />
            </button>
          </div>
          {form.previous_child && (
            <div className="space-y-3 pt-3 mt-3 border-t border-white/[0.06]">
              {form.children.map((child, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select value={child.gender} onChange={e => updateChild(idx, 'gender', e.target.value)}
                    className="h-10 px-3 rounded-lg text-white text-sm outline-none flex-1 bg-white/[0.06] border border-white/[0.06]">
                    <option value="boy">Boy</option><option value="girl">Girl</option>
                  </select>
                  <input type="text" value={child.age} onChange={e => updateChild(idx, 'age', e.target.value)}
                    placeholder="Age" className="h-10 px-3 rounded-lg text-white text-sm w-20 outline-none bg-white/[0.06] border border-white/[0.06]" />
                  <button onClick={() => removeChild(idx)} className="w-10 h-10 rounded-lg flex items-center justify-center text-white/50 bg-white/[0.04]">X</button>
                </div>
              ))}
              <button onClick={addChild} className="text-xs font-semibold py-2 px-4 rounded-lg text-blue-400 bg-blue-500/10">+ Add Child</button>
            </div>
          )}
        </div>

        {/* Submit */}
        <button onClick={handleSubmit} disabled={submitting}
          className="w-full h-14 rounded-2xl text-white font-bold text-base transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2 bg-blue-600 shadow-[0_0_28px_rgba(59,130,246,0.35)]"
          data-testid="submit-booking">
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Book Scan'}
        </button>

        <button onClick={() => setStep(0)} className="w-full py-3 text-center text-sm text-white/30">Back to services</button>
      </div>
      <div className="pb-24" />
    </div>
  );
};

export default MangoUltrasound;

import React from 'react';
import { ShieldCheck, Award, FileText, Phone } from 'lucide-react';

const DL_NUMBERS = 'MH-PL1-610138, MH-PL1-610139';
const FSSAI_NUMBER = '21525019003800';

// Custom FSSAI Logo — stylized differently from competitors
const FssaiLogo = ({ size = 'md' }) => {
  const h = size === 'sm' ? 18 : size === 'lg' ? 32 : 24;
  const fontSize = size === 'sm' ? 8 : size === 'lg' ? 14 : 11;
  const tagSize = size === 'sm' ? 5 : size === 'lg' ? 8 : 6;
  return (
    <div className="flex items-center gap-1.5" data-testid="fssai-logo">
      <div className="flex items-center" style={{ height: h }}>
        {/* Stylized FSSAI mark — rounded shield with checkmark */}
        <div
          className="flex items-center justify-center rounded-lg relative"
          style={{
            width: h,
            height: h,
            background: 'linear-gradient(145deg, #1B7340, #22994D)',
            boxShadow: '0 1px 4px rgba(27,115,64,0.3)',
          }}
        >
          <svg width={h * 0.55} height={h * 0.55} viewBox="0 0 16 16" fill="none">
            <path d="M3 8.5L6.5 12L13 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div
            className="absolute -bottom-0.5 -right-0.5 rounded-full flex items-center justify-center"
            style={{
              width: h * 0.4,
              height: h * 0.4,
              background: '#F59E0B',
              border: '1.5px solid #fff',
            }}
          >
            <svg width={h * 0.2} height={h * 0.2} viewBox="0 0 8 8" fill="none">
              <circle cx="4" cy="4" r="2" fill="white" />
            </svg>
          </div>
        </div>
        <div className="ml-1.5">
          <span
            className="font-black tracking-tight block leading-none"
            style={{
              fontSize: fontSize,
              color: '#1B7340',
              fontFamily: 'Outfit, system-ui, sans-serif',
              letterSpacing: '0.5px',
            }}
          >
            FSSAI
          </span>
          <span
            className="block leading-none"
            style={{
              fontSize: tagSize,
              color: '#6B7280',
              fontFamily: 'system-ui, sans-serif',
              letterSpacing: '0.3px',
            }}
          >
            CERTIFIED
          </span>
        </div>
      </div>
    </div>
  );
};

// Product page footer with DL + FSSAI — goes on every product detail page
const ProductLicenseBadge = () => (
  <div
    className="mx-4 mt-4 mb-2 rounded-2xl px-4 py-3 flex items-center justify-between"
    style={{
      background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 50%, #FFF7ED 100%)',
      border: '1px solid rgba(22,163,74,0.12)',
    }}
    data-testid="product-license-badge"
  >
    <div className="flex items-center gap-3">
      <FssaiLogo size="md" />
      <div className="h-6 w-px bg-stone-200" />
      <div>
        <p className="text-[9px] text-stone-400 font-medium leading-none mb-0.5">Lic No.</p>
        <p className="text-[11px] text-stone-600 font-bold leading-none tracking-wide">{FSSAI_NUMBER}</p>
      </div>
    </div>
    <div className="text-right">
      <p className="text-[9px] text-stone-400 font-medium leading-none mb-0.5">Drug License</p>
      <p className="text-[10px] text-stone-600 font-semibold leading-none">{DL_NUMBERS.split(', ')[0]}</p>
      <p className="text-[10px] text-stone-600 font-semibold leading-none mt-0.5">{DL_NUMBERS.split(', ')[1]}</p>
    </div>
  </div>
);

const TrustBadges = ({ variant = 'footer' }) => {
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 flex-wrap justify-center" data-testid="trust-badges-compact">
        <span className="flex items-center gap-1 text-[10px] text-stone-400 font-medium">
          <ShieldCheck className="w-3 h-3 text-green-500" /> Licensed Pharmacy
        </span>
        <span className="w-1 h-1 rounded-full bg-stone-600" />
        <FssaiLogo size="sm" />
        <span className="text-[10px] text-stone-400">{FSSAI_NUMBER}</span>
        <span className="w-1 h-1 rounded-full bg-stone-600" />
        <span className="flex items-center gap-1 text-[10px] text-stone-400 font-medium">
          <FileText className="w-3 h-3 text-amber-400" /> DL: {DL_NUMBERS.split(', ')[0]}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-4 mt-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }} data-testid="trust-badges">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="w-4 h-4 text-green-400" />
        <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Why Trust Us</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-start gap-2.5 p-2.5 rounded-xl" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.1)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(16,185,129,0.15)' }}>
            <ShieldCheck className="w-4 h-4 text-green-400" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-white/80">Drug License</p>
            <p className="text-[9px] text-white/40 mt-0.5">{DL_NUMBERS.split(', ')[0]}</p>
            <p className="text-[9px] text-white/40">{DL_NUMBERS.split(', ')[1]}</p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-2.5 rounded-xl" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.1)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(59,130,246,0.15)' }}>
            <Award className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-white/80">FSSAI Certified</p>
            <p className="text-[9px] text-white/40 mt-0.5">Lic: {FSSAI_NUMBER}</p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-2.5 rounded-xl" style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.1)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(249,115,22,0.15)' }}>
            <FileText className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-white/80">100% Genuine</p>
            <p className="text-[9px] text-white/40 mt-0.5">Direct from manufacturers</p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-2.5 rounded-xl" style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.1)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(168,85,247,0.15)' }}>
            <Phone className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-white/80">Pharmacist on Call</p>
            <p className="text-[9px] text-white/40 mt-0.5">Rx verification before dispatch</p>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-white/5 text-center">
        <p className="text-[9px] text-white/25">Nevika Cura Health Pvt Ltd | CIN: U85100MH2024PTC123456</p>
      </div>
    </div>
  );
};

export default TrustBadges;
export { ProductLicenseBadge, FssaiLogo, DL_NUMBERS, FSSAI_NUMBER };

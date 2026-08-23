import React from 'react';

// Form-specific SVG placeholder icons for medicines/products without images
const PlaceholderIcons = {
  tablet: (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full p-2.5">
      <rect x="8" y="14" width="32" height="20" rx="10" stroke="currentColor" strokeWidth="1.8" />
      <line x1="24" y1="14" x2="24" y2="34" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" />
      <circle cx="16" cy="24" r="2" fill="currentColor" opacity="0.3" />
      <circle cx="32" cy="24" r="2" fill="currentColor" opacity="0.3" />
    </svg>
  ),
  capsule: (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full p-2.5">
      <rect x="10" y="16" width="28" height="16" rx="8" stroke="currentColor" strokeWidth="1.8" />
      <line x1="24" y1="16" x2="24" y2="32" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10" y="16" width="14" height="16" rx="8" fill="currentColor" opacity="0.08" />
    </svg>
  ),
  syrup: (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full p-2">
      <rect x="14" y="16" width="20" height="24" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <rect x="17" y="10" width="14" height="6" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <rect x="17" y="22" width="14" height="8" rx="1" fill="currentColor" opacity="0.08" />
      <path d="M20 26h8" stroke="currentColor" strokeWidth="1" opacity="0.4" />
    </svg>
  ),
  drops: (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full p-2.5">
      <path d="M24 8L24 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M24 20C24 20 16 28 16 33C16 37.4 19.6 41 24 41C28.4 41 32 37.4 32 33C32 28 24 20 24 20Z" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="24" cy="33" r="3" fill="currentColor" opacity="0.08" />
    </svg>
  ),
  cream: (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full p-2">
      <rect x="12" y="20" width="24" height="20" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 20V16C16 14 18 12 22 12H26C30 12 32 14 32 16V20" stroke="currentColor" strokeWidth="1.5" />
      <rect x="16" y="26" width="16" height="6" rx="1" fill="currentColor" opacity="0.08" />
    </svg>
  ),
  injection: (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full p-2.5">
      <rect x="21" y="6" width="6" height="30" rx="3" stroke="currentColor" strokeWidth="1.8" />
      <line x1="24" y1="36" x2="24" y2="42" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="18" y1="12" x2="30" y2="12" stroke="currentColor" strokeWidth="1.5" />
      <rect x="21" y="18" width="6" height="10" fill="currentColor" opacity="0.08" />
    </svg>
  ),
  device: (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full p-2.5">
      <rect x="10" y="12" width="28" height="20" rx="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 22L20 18L24 24L28 16L32 22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="18" y="32" width="12" height="4" rx="1" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  ),
  default: (
    <svg viewBox="0 0 48 48" fill="none" className="w-full h-full p-2.5">
      <path d="M24 8L28 16H36L30 22L32 30L24 26L16 30L18 22L12 16H20L24 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="24" cy="38" r="3" stroke="currentColor" strokeWidth="1.2" />
      <line x1="24" y1="30" x2="24" y2="35" stroke="currentColor" strokeWidth="1" />
    </svg>
  ),
};

const getFormType = (form) => {
  const f = (form || '').toLowerCase();
  if (f.includes('tablet')) return 'tablet';
  if (f.includes('capsule') || f.includes('soflet')) return 'capsule';
  if (f.includes('syrup') || f.includes('suspension') || f.includes('liquid') || f.includes('expectorant')) return 'syrup';
  if (f.includes('drop')) return 'drops';
  if (f.includes('cream') || f.includes('gel') || f.includes('ointment') || f.includes('lotion')) return 'cream';
  if (f.includes('injection')) return 'injection';
  if (f.includes('otc') || f.includes('device') || f.includes('other')) return 'device';
  return 'default';
};

// Color schemes per form
const FORM_COLORS = {
  tablet: { bg: 'from-blue-50 to-indigo-50', border: 'border-blue-100', icon: 'text-blue-400' },
  capsule: { bg: 'from-purple-50 to-violet-50', border: 'border-purple-100', icon: 'text-purple-400' },
  syrup: { bg: 'from-amber-50 to-yellow-50', border: 'border-amber-100', icon: 'text-amber-500' },
  drops: { bg: 'from-cyan-50 to-sky-50', border: 'border-cyan-100', icon: 'text-cyan-500' },
  cream: { bg: 'from-pink-50 to-rose-50', border: 'border-pink-100', icon: 'text-pink-400' },
  injection: { bg: 'from-red-50 to-rose-50', border: 'border-red-100', icon: 'text-red-400' },
  device: { bg: 'from-teal-50 to-emerald-50', border: 'border-teal-100', icon: 'text-teal-500' },
  default: { bg: 'from-orange-50 to-amber-50', border: 'border-orange-100', icon: 'text-orange-400' },
};

export const ProductPlaceholder = ({ form, className = '' }) => {
  const formType = getFormType(form);
  const colors = FORM_COLORS[formType];
  const icon = PlaceholderIcons[formType];

  return (
    <div className={`w-full h-full bg-gradient-to-br ${colors.bg} border ${colors.border} flex items-center justify-center ${className}`}>
      <div className={`w-3/5 h-3/5 ${colors.icon}`}>
        {icon}
      </div>
    </div>
  );
};

export default ProductPlaceholder;

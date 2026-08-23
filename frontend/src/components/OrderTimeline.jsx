import React from 'react';
import { Check, Clock, Package, Truck, FlaskConical, FileCheck, MapPin } from 'lucide-react';

const PHARMACY_STEPS = [
  { key: 'placed', label: 'Placed', icon: Package },
  { key: 'confirmed', label: 'Confirmed', icon: Check },
  { key: 'processing', label: 'Processing', icon: Clock },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: MapPin },
];

const LAB_STEPS = [
  { key: 'placed', label: 'Booked', icon: FileCheck },
  { key: 'confirmed', label: 'Confirmed', icon: Check },
  { key: 'sample_collected', label: 'Collected', icon: FlaskConical },
  { key: 'processing', label: 'Processing', icon: Clock },
  { key: 'report_ready', label: 'Report', icon: FileCheck },
];

const statusToStep = (status, isPharmacy) => {
  const s = (status || '').toLowerCase().trim();
  if (s.includes('cancel')) return -1;
  if (isPharmacy) {
    if (s.includes('deliver') || s.includes('complet')) return 4;
    if (s.includes('ship') || s.includes('transit') || s.includes('out for')) return 3;
    if (s.includes('process') || s.includes('pack')) return 2;
    if (s.includes('confirm') || s.includes('booked') || s.includes('paid')) return 1;
    if (s.includes('pending') || s.includes('placed') || s.includes('order')) return 0;
    return 0;
  } else {
    if (s.includes('report') || s.includes('complet')) return 4;
    if (s.includes('process') || s.includes('testing') || s.includes('analys')) return 3;
    if (s.includes('collect') || s.includes('sample')) return 2;
    if (s.includes('confirm') || s.includes('booked') || s.includes('paid')) return 1;
    if (s.includes('pending') || s.includes('placed') || s.includes('draft')) return 0;
    return 0;
  }
};

const OrderTimeline = ({ status, orderType, isDark = false }) => {
  const isPharmacy = orderType === 'pharmacy';
  const steps = isPharmacy ? PHARMACY_STEPS : LAB_STEPS;
  const currentStep = statusToStep(status, isPharmacy);
  const isCancelled = currentStep === -1;
  const accentColor = isPharmacy ? '#EA580C' : '#0891B2';

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 py-2 px-1">
        <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center">
          <span className="text-red-500 text-xs font-bold">×</span>
        </div>
        <span className="text-xs font-medium text-red-500">Order Cancelled</span>
      </div>
    );
  }

  return (
    <div className="py-2 px-1" data-testid="order-timeline">
      <div className="flex items-center justify-between relative">
        {/* Connecting line (background) */}
        <div
          className="absolute top-[10px] left-[10px] right-[10px] h-[2px]"
          style={{ background: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB' }}
        />
        {/* Connecting line (progress) */}
        <div
          className="absolute top-[10px] left-[10px] h-[2px] transition-all duration-500"
          style={{
            width: `${(currentStep / (steps.length - 1)) * 100}%`,
            maxWidth: 'calc(100% - 20px)',
            background: accentColor,
          }}
        />

        {steps.map((step, i) => {
          const isDone = i <= currentStep;
          const isCurrent = i === currentStep;
          const StepIcon = step.icon;

          return (
            <div key={step.key} className="flex flex-col items-center relative z-10" style={{ flex: 1 }}>
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCurrent ? 'ring-2 ring-offset-1 scale-110' : ''
                }`}
                style={{
                  background: isDone ? accentColor : (isDark ? 'rgba(255,255,255,0.1)' : '#E5E7EB'),
                  ringColor: isCurrent ? accentColor : 'transparent',
                  ringOffsetColor: isDark ? '#111' : '#fff',
                }}
              >
                {isDone ? (
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                ) : (
                  <StepIcon className="w-2.5 h-2.5" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#9CA3AF' }} />
                )}
              </div>
              <span
                className={`text-[9px] mt-1 font-medium text-center leading-tight ${
                  isCurrent ? 'font-bold' : ''
                }`}
                style={{
                  color: isDone
                    ? (isDark ? '#fff' : '#374151')
                    : (isDark ? 'rgba(255,255,255,0.3)' : '#9CA3AF'),
                }}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderTimeline;

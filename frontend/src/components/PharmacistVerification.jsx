import React, { useState, useEffect } from 'react';
import { ShieldCheck, Phone, FileCheck, CheckCircle2, Loader2, Pill } from 'lucide-react';

const STEPS = [
  { icon: FileCheck, label: 'Verifying Prescription', desc: 'Our pharmacist is reviewing your order...', duration: 2200 },
  { icon: Phone, label: 'Doctor Confirmation', desc: 'Scheduling confirmation call for Rx items...', duration: 2000 },
  { icon: ShieldCheck, label: 'Order Approved', desc: 'Your medicines are verified and ready to dispatch!', duration: 1500 },
];

const PharmacistVerification = ({ hasRxItems = false, onComplete, visible = false }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setCurrentStep(0);
    setCompleted(false);

    let timeout;
    const advance = (step) => {
      if (step >= STEPS.length) {
        setCompleted(true);
        timeout = setTimeout(() => onComplete?.(), 1200);
        return;
      }
      setCurrentStep(step);
      timeout = setTimeout(() => advance(step + 1), STEPS[step].duration);
    };

    timeout = setTimeout(() => advance(0), 500);
    return () => clearTimeout(timeout);
  }, [visible, onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" data-testid="pharmacist-verification">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      <div className="relative w-full max-w-sm mx-4">
        {/* Animated pulse ring */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 rounded-full" style={{ width: 80, height: 80, border: '2px solid rgba(16,185,129,0.3)', animation: 'pvRipple 2s ease-out infinite' }} />
            <div className="absolute inset-0 rounded-full" style={{ width: 80, height: 80, border: '2px solid rgba(16,185,129,0.15)', animation: 'pvRipple 2s ease-out 0.5s infinite' }} />
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: completed ? 'linear-gradient(135deg, #10B981, #059669)' : 'linear-gradient(135deg, #3B82F6, #2563EB)', boxShadow: completed ? '0 8px 30px rgba(16,185,129,0.4)' : '0 8px 30px rgba(59,130,246,0.4)', transition: 'all 0.5s ease' }}>
              {completed ? (
                <CheckCircle2 className="w-9 h-9 text-white" style={{ animation: 'pvBounce 0.5s cubic-bezier(0.34,1.56,0.64,1)' }} />
              ) : (
                <Pill className="w-9 h-9 text-white" style={{ animation: 'pvSpin 2s linear infinite' }} />
              )}
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          {STEPS.map((step, idx) => {
            const StepIcon = step.icon;
            const isActive = idx === currentStep && !completed;
            const isDone = idx < currentStep || completed;

            return (
              <div
                key={idx}
                className="flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-500"
                style={{
                  background: isActive ? 'rgba(59,130,246,0.12)' : isDone ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isActive ? 'rgba(59,130,246,0.25)' : isDone ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)'}`,
                  opacity: idx > currentStep && !completed ? 0.4 : 1,
                  transform: isActive ? 'scale(1.02)' : 'scale(1)',
                }}
                data-testid={`verification-step-${idx}`}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{
                  background: isDone ? 'rgba(16,185,129,0.2)' : isActive ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
                }}>
                  {isDone ? (
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  ) : isActive ? (
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                  ) : (
                    <StepIcon className="w-5 h-5 text-white/30" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${isDone ? 'text-green-400' : isActive ? 'text-blue-300' : 'text-white/30'}`}>
                    {step.label}
                  </p>
                  <p className={`text-[11px] mt-0.5 ${isDone ? 'text-green-400/60' : isActive ? 'text-blue-300/60' : 'text-white/20'}`}>
                    {isDone ? 'Completed' : step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {hasRxItems && !completed && (
          <p className="text-center text-[10px] text-white/30 mt-4">
            Prescription medicines require pharmacist verification before dispatch
          </p>
        )}

        {completed && (
          <div className="mt-5 p-3 rounded-xl text-center" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <p className="text-green-400 text-xs font-semibold">All checks passed! Redirecting to confirmation...</p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pvRipple { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(2); opacity: 0; } }
        @keyframes pvBounce { 0% { transform: scale(0); } 60% { transform: scale(1.2); } 100% { transform: scale(1); } }
        @keyframes pvSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default PharmacistVerification;

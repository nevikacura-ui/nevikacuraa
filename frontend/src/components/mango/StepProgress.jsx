import React from 'react';
import { FlaskConical, Shield, CheckCircle2, ChevronRight } from 'lucide-react';

const StepProgress = ({ currentStep }) => {
  const steps = [
    { num: 1, label: 'Select Tests', icon: FlaskConical },
    { num: 2, label: 'Details', icon: Shield },
    { num: 3, label: 'Book', icon: CheckCircle2 }
  ];
  
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2">
      {steps.map((step, idx) => (
        <React.Fragment key={step.num}>
          <div className={`
            flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all
            ${currentStep === step.num 
              ? 'bg-green-500 text-white shadow-lg' 
              : currentStep > step.num 
                ? 'bg-green-700 text-white' 
                : 'bg-slate-100 text-slate-400'
            }
          `}>
            {currentStep > step.num ? <CheckCircle2 className="w-4 h-4" /> : <step.icon className="w-4 h-4" />}
            <span className="hidden sm:inline">{step.label}</span>
          </div>
          {idx < steps.length - 1 && (
            <ChevronRight className="w-4 h-4 text-slate-300" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default StepProgress;

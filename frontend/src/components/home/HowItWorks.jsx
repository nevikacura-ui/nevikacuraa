import React from 'react';
import { ArrowRight } from 'lucide-react';
import { howItWorksSteps } from '@/data/homeData';

const HowItWorks = () => {
  return (
    <div className="mb-12" data-testid="how-it-works">
      <h2 className="text-lg font-bold text-white mb-4 text-center" style={{ fontFamily: 'Outfit, sans-serif' }}>How It Works</h2>
      <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
        {howItWorksSteps.map((step, idx) => (
          <div key={idx} className="flex items-center">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-xl rounded-full border border-white/10 shadow-lg">
              <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center text-white font-bold text-sm`}>
                {step.step}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{step.title}</p>
                <p className="text-xs text-gray-400 hidden sm:block">{step.description}</p>
              </div>
            </div>
            {idx < 2 && (
              <ArrowRight className="w-5 h-5 text-gray-500 mx-1 sm:mx-2 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HowItWorks;

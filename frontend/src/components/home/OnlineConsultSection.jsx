import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Clock, MessageCircle, FileText, ArrowRight, CheckCircle } from 'lucide-react';

/**
 * Online Consultation Section with Symptom Chips
 * Based on reference screenshot
 */
const OnlineConsultSection = () => {
  const navigate = useNavigate();
  const [selectedSymptom, setSelectedSymptom] = useState(null);

  const benefits = [
    { icon: Clock, text: 'Talk within 30 mins' },
    { icon: MessageCircle, text: '3 day FREE follow up' },
    { icon: FileText, text: 'Get a valid prescription' }
  ];

  const symptoms = [
    'Fever', 'Cough', 'Headache', 'Stomach Pain', 'Loose Motions',
    'Acne/Pimples', 'Hairfall', 'Missed Period', 'Heavy Menstrual Bleeding',
    'Unprotected Sex', 'Obesity/Weight', 'Covid Concerns'
  ];

  const handleSymptomClick = (symptom) => {
    setSelectedSymptom(symptom);
    // Navigate to teleconsult with the symptom pre-selected
    navigate(`/teleconsult?symptom=${encodeURIComponent(symptom)}`);
  };

  return (
    <div className="py-6 bg-white rounded-2xl shadow-sm border border-slate-100 px-4 -mx-4" data-testid="online-consult-section">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-800 mb-1">
          Online doctor consultation with qualified doctors
        </h2>
        
        {/* Benefits Row */}
        <div className="flex flex-wrap gap-3 mt-3">
          {benefits.map((benefit, idx) => (
            <div key={idx} className="flex items-center gap-1.5 text-sm text-slate-600">
              <benefit.icon className="w-4 h-4 text-teal-500" />
              <span>{benefit.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing & CTA */}
      <div className="flex items-center justify-between bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-3 mb-4">
        <div>
          <p className="text-sm text-slate-600">Starting at</p>
          <p className="text-lg font-bold text-teal-600">Free Consultation</p>
          <p className="text-xs text-emerald-600 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Care Plan benefit available
          </p>
        </div>
        <Button 
          onClick={() => navigate('/teleconsult')}
          className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-xl px-6"
          data-testid="consult-now-btn"
        >
          Consult now
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-slate-200"></div>
        <span className="text-sm text-slate-400 font-medium">OR</span>
        <div className="flex-1 h-px bg-slate-200"></div>
      </div>

      {/* Symptom Selection */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-2">
          Consult Doctor in 1 click
        </h3>
        <p className="text-xs text-slate-500 mb-3">Select a symptom to book in 1 step</p>
        
        {/* Symptom Chips */}
        <div className="flex flex-wrap gap-2">
          {symptoms.map((symptom) => (
            <button
              key={symptom}
              onClick={() => handleSymptomClick(symptom)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                selectedSymptom === symptom
                  ? 'bg-teal-500 text-white border-teal-500'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-teal-50 hover:border-teal-300'
              }`}
              data-testid={`symptom-chip-${symptom.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
            >
              {symptom}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OnlineConsultSection;

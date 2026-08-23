import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';

// Test icons based on test type
const getTestIcon = (testName) => {
  const lowerName = testName.toLowerCase();
  
  // Blood/CBC tests
  if (lowerName.includes('cbc') || lowerName.includes('blood count') || lowerName.includes('hemoglobin') || lowerName.includes('rbc') || lowerName.includes('wbc') || lowerName.includes('platelet')) return '🩸';
  
  // Sugar/Diabetes tests
  if (lowerName.includes('sugar') || lowerName.includes('glucose') || lowerName.includes('hba1c') || lowerName.includes('diabetes') || lowerName.includes('insulin') || lowerName.includes('gtt') || lowerName.includes('ogtt')) return '🍬';
  
  // Thyroid tests
  if (lowerName.includes('thyroid') || lowerName.includes('tsh') || lowerName.includes('t3') || lowerName.includes('t4')) return '🦋';
  
  // Liver tests
  if (lowerName.includes('liver') || lowerName.includes('lft') || lowerName.includes('sgpt') || lowerName.includes('sgot') || lowerName.includes('bilirubin') || lowerName.includes('albumin')) return '🫀';
  
  // Kidney tests
  if (lowerName.includes('kidney') || lowerName.includes('renal') || lowerName.includes('creatinine') || lowerName.includes('urea') || lowerName.includes('uric') || lowerName.includes('rft') || lowerName.includes('egfr')) return '🫘';
  
  // Lipid tests
  if (lowerName.includes('lipid') || lowerName.includes('cholesterol') || lowerName.includes('triglyceride') || lowerName.includes('hdl') || lowerName.includes('ldl')) return '🧈';
  
  // Vitamin tests
  if (lowerName.includes('vitamin') || lowerName.includes('b12') || lowerName.includes('folate') || lowerName.includes('iron') || lowerName.includes('ferritin') || lowerName.includes('calcium') || lowerName.includes('zinc') || lowerName.includes('magnesium')) return '💊';
  
  // Hormone tests
  if (lowerName.includes('hormone') || lowerName.includes('lh') || lowerName.includes('fsh') || lowerName.includes('prolactin') || lowerName.includes('estradiol') || lowerName.includes('progesterone') || lowerName.includes('testosterone') || lowerName.includes('cortisol') || lowerName.includes('amh')) return '⚗️';
  
  // Pregnancy tests
  if (lowerName.includes('pregnancy') || lowerName.includes('hcg') || lowerName.includes('anc') || lowerName.includes('marker') || lowerName.includes('quadruple') || lowerName.includes('dual')) return '🤰';
  
  // Urine tests
  if (lowerName.includes('urine') || lowerName.includes('urinalysis')) return '🧪';
  
  // Cardiac tests
  if (lowerName.includes('cardiac') || lowerName.includes('heart') || lowerName.includes('troponin') || lowerName.includes('cpk') || lowerName.includes('bnp') || lowerName.includes('ecg')) return '❤️';
  
  // Infection tests
  if (lowerName.includes('hiv') || lowerName.includes('hepatitis') || lowerName.includes('dengue') || lowerName.includes('malaria') || lowerName.includes('typhoid') || lowerName.includes('culture') || lowerName.includes('viral')) return '🦠';
  
  // Cancer markers
  if (lowerName.includes('ca-') || lowerName.includes('cea') || lowerName.includes('afp') || lowerName.includes('psa') || lowerName.includes('tumor') || lowerName.includes('marker')) return '🔬';
  
  // Sonography/Imaging
  if (lowerName.includes('sono') || lowerName.includes('ultrasound') || lowerName.includes('usg') || lowerName.includes('scan')) return '📡';
  
  // ECG/EKG
  if (lowerName.includes('ecg') || lowerName.includes('ekg') || lowerName.includes('electro')) return '📈';
  
  // Default
  return '🔬';
};

const TestCheckbox = ({ test, checked, onToggle }) => (
  <label className={`flex items-center gap-2.5 py-2 px-3 rounded-xl cursor-pointer transition-all group ${checked ? 'bg-green-100 border border-green-300' : 'hover:bg-green-50'}`}>
    <Checkbox
      id={test}
      checked={checked}
      onCheckedChange={onToggle}
      className="border-2 border-green-400 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
    />
    <span className="text-lg" role="img" aria-label="test icon">{getTestIcon(test)}</span>
    <span className={`text-sm transition-colors ${checked ? 'text-green-700 font-medium' : 'text-slate-700 group-hover:text-green-600'}`} style={{ fontFamily: 'DM Sans, sans-serif' }}>
      {test}
    </span>
  </label>
);

export { getTestIcon };
export default TestCheckbox;

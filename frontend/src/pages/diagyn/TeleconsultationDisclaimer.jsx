import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { THEME } from './data';

const TeleconsultationDisclaimer = ({ isOpen, onClose, onAccept }) => {
  const [agreed, setAgreed] = useState(false);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(2,6,23,0.95)', backdropFilter: 'blur(12px)' }} onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl animate-in zoom-in-95 duration-200" style={{ background: THEME.surface, border: `1px solid ${THEME.border.default}` }} onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10 p-4 border-b" style={{ background: THEME.surface, borderColor: THEME.border.default }}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Teleconsultation Terms</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-800" style={{ background: THEME.surfaceLight }}>
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>
        <div className="p-5 space-y-5 text-sm">
          <div className="p-4 rounded-xl" style={{ background: '#F59E0B15', border: '1px solid #F59E0B30' }}>
            <h3 className="text-amber-400 font-semibold mb-2">Before Booking - Important</h3>
            <p className="text-slate-400 text-xs leading-relaxed">By booking, you agree to provide correct name, age, and contact details. A valid Government ID may be requested.</p>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-2">Scope of Online Consultation</h3>
            <ul className="text-slate-400 text-xs space-y-1 list-disc list-inside">
              <li>Non-emergency medical advice</li>
              <li>Chronic disease management</li>
              <li>Second opinion & report review</li>
            </ul>
          </div>
          <div className="p-4 rounded-xl" style={{ background: '#EF444415', border: '1px solid #EF444430' }}>
            <h3 className="text-red-400 font-semibold mb-2">Emergency Notice</h3>
            <p className="text-slate-400 text-xs">For chest pain, breathlessness, seizures, severe bleeding, or unconsciousness — <span className="text-red-400 font-medium">visit the nearest hospital immediately.</span> Online consultation is not a replacement for emergency care.</p>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-2">Prescription Policy</h3>
            <ul className="text-slate-400 text-xs space-y-1 list-disc list-inside">
              <li>Issued as per Indian Telemedicine Practice Guidelines</li>
              <li>Validity outside India depends on local regulations</li>
              <li>Patient responsible for medicine procurement</li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-2">Payment & Cancellation</h3>
            <ul className="text-slate-400 text-xs space-y-1 list-disc list-inside">
              <li>Fee must be paid before appointment confirmation</li>
              <li>Non-refundable once consultation starts</li>
              <li>One reschedule allowed if informed 6+ hours prior</li>
            </ul>
          </div>
          <div className="p-4 rounded-xl" style={{ background: '#3B82F615', border: '1px solid #3B82F630' }}>
            <h3 className="text-blue-400 font-semibold mb-2">International Patients</h3>
            <ul className="text-slate-400 text-xs space-y-1 list-disc list-inside">
              <li>Doctor is licensed to practice in India</li>
              <li>Consultation governed by Indian medical laws</li>
              <li>Prescriptions may not be legally valid in certain countries</li>
              <li>Patient assumes responsibility for local compliance</li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-2">After Consultation (within 30 min)</h3>
            <ul className="text-slate-400 text-xs space-y-1 list-disc list-inside">
              <li>E-Prescription (PDF with registration)</li>
              <li>Consultation Summary</li>
              <li>Investigation Advice (if applicable)</li>
              <li>Follow-up instructions</li>
            </ul>
          </div>
          <div className="p-3 rounded-xl text-center" style={{ background: THEME.surfaceLight }}>
            <p className="text-slate-500 text-xs">All consultations are confidential and conducted on secure platforms. Medical data is stored securely and not shared without consent.</p>
          </div>
          <label className="flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all hover:bg-slate-800/50" style={{ background: THEME.surfaceLight }}>
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 w-5 h-5 rounded accent-teal-500" />
            <span className="text-slate-300 text-xs leading-relaxed">I understand this consultation is online. I consent to telemedicine consultation, understand its limitations, and agree to provide accurate medical history. I acknowledge emergency conditions require physical hospital visit.</span>
          </label>
        </div>
        <div className="sticky bottom-0 p-4 border-t" style={{ background: THEME.surface, borderColor: THEME.border.default }}>
          <Button onClick={() => { if (agreed) onAccept(); }} disabled={!agreed} className="w-full py-5 rounded-full text-base font-bold transition-all" style={{ background: agreed ? 'linear-gradient(135deg, #14B8A6, #0D9488)' : THEME.surfaceLight, opacity: agreed ? 1 : 0.5 }}>
            {agreed ? 'I Accept & Continue' : 'Please accept terms to continue'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TeleconsultationDisclaimer;

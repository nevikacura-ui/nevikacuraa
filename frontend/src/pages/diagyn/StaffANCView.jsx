import React from 'react';
import { useStaff } from './StaffContext';
import { COLORS } from './staffConstants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Baby, Plus, Loader2, CheckCircle2 } from 'lucide-react';

const StaffANCView = () => {
  const s = useStaff();

  if (s.ancResult) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl p-6 text-center" style={{ background: COLORS.bgCard }}>
          <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3" style={{ background: '#EC4899' + '20' }}>
            <Baby className="w-8 h-8" style={{ color: '#EC4899' }} />
          </div>
          <h3 className="text-lg font-bold mb-1" style={{ color: COLORS.textLight }}>
            {s.ancResult.existing ? 'Already Registered' : 'Registration Successful'}
          </h3>
          <p className="text-2xl font-black mb-2" style={{ color: '#EC4899' }}>{s.ancResult.registration_id}</p>
          {s.ancResult.edd && <p className="text-sm" style={{ color: COLORS.textMuted }}>EDD: {s.ancResult.edd}</p>}
          <p className="text-xs mt-2" style={{ color: COLORS.teal }}>Form emailed to nevikacura@gmail.com</p>
          <Button onClick={s.resetAncForm} className="mt-4 rounded-xl font-bold" style={{ background: '#EC4899' }} data-testid="anc-new-btn">
            <Plus className="w-4 h-4 mr-1" /> New Registration
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl p-4 shadow-sm" style={{ background: '#EC4899' + '12', border: '1px solid #EC489930' }}>
        <div className="flex items-center gap-2">
          <Baby className="w-5 h-5" style={{ color: '#EC4899' }} />
          <span className="text-sm font-bold" style={{ color: '#EC4899' }}>ANC Registration</span>
        </div>
        <p className="text-xs mt-1" style={{ color: COLORS.textMuted }}>Fill details below. Form will be emailed to nevikacura@gmail.com</p>
      </div>

      {/* Patient Details */}
      <div className="rounded-2xl p-4 shadow-sm space-y-3" style={{ background: COLORS.bgCard }}>
        <h4 className="text-xs font-bold" style={{ color: '#3B82F6' }}>PATIENT DETAILS</h4>
        <Input value={s.ancForm.patient_name} onChange={e => s.updateAnc('patient_name', e.target.value)}
          placeholder="Patient Name *" className="h-10 rounded-xl" data-testid="anc-name"
          style={{ background: COLORS.bgCardHover, color: COLORS.textLight, borderColor: 'transparent' }} />
        <div className="grid grid-cols-2 gap-2">
          <Input value={s.ancForm.age} onChange={e => s.updateAnc('age', e.target.value.replace(/\D/g, ''))}
            placeholder="Age *" className="h-10 rounded-xl" data-testid="anc-age"
            style={{ background: COLORS.bgCardHover, color: COLORS.textLight, borderColor: 'transparent' }} />
          <Input value={s.ancForm.phone} maxLength={10} onChange={e => s.updateAnc('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="Phone (10 digit) *" className="h-10 rounded-xl" data-testid="anc-phone"
            style={{ background: COLORS.bgCardHover, color: COLORS.textLight, borderColor: 'transparent' }} />
        </div>
        <Input value={s.ancForm.address} onChange={e => s.updateAnc('address', e.target.value)}
          placeholder="Full Address *" className="h-10 rounded-xl" data-testid="anc-address"
          style={{ background: COLORS.bgCardHover, color: COLORS.textLight, borderColor: 'transparent' }} />
        <Input value={s.ancForm.aadhaar} maxLength={12} onChange={e => s.updateAnc('aadhaar', e.target.value.replace(/\D/g, '').slice(0, 12))}
          placeholder="Aadhaar (optional)" className="h-10 rounded-xl"
          style={{ background: COLORS.bgCardHover, color: COLORS.textLight, borderColor: 'transparent' }} />
      </div>

      {/* Husband Details */}
      <div className="rounded-2xl p-4 shadow-sm space-y-3" style={{ background: COLORS.bgCard }}>
        <h4 className="text-xs font-bold" style={{ color: '#8B5CF6' }}>HUSBAND DETAILS</h4>
        <Input value={s.ancForm.husband_name} onChange={e => s.updateAnc('husband_name', e.target.value)}
          placeholder="Husband Name *" className="h-10 rounded-xl" data-testid="anc-husband"
          style={{ background: COLORS.bgCardHover, color: COLORS.textLight, borderColor: 'transparent' }} />
        <div className="grid grid-cols-2 gap-2">
          <Input value={s.ancForm.husband_phone} maxLength={10} onChange={e => s.updateAnc('husband_phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="Husband Phone" className="h-10 rounded-xl"
            style={{ background: COLORS.bgCardHover, color: COLORS.textLight, borderColor: 'transparent' }} />
          <Input value={s.ancForm.husband_occupation} onChange={e => s.updateAnc('husband_occupation', e.target.value)}
            placeholder="Occupation" className="h-10 rounded-xl"
            style={{ background: COLORS.bgCardHover, color: COLORS.textLight, borderColor: 'transparent' }} />
        </div>
      </div>

      {/* Obstetric Details */}
      <div className="rounded-2xl p-4 shadow-sm space-y-3" style={{ background: COLORS.bgCard }}>
        <h4 className="text-xs font-bold" style={{ color: '#EC4899' }}>OBSTETRIC DETAILS</h4>
        <div>
          <label className="text-[11px] mb-1 block" style={{ color: COLORS.textMuted }}>LMP (Last Menstrual Period) *</label>
          <Input type="date" value={s.ancForm.lmp} onChange={e => s.updateAnc('lmp', e.target.value)}
            className="h-10 rounded-xl" data-testid="anc-lmp"
            style={{ background: COLORS.bgCardHover, color: COLORS.textLight, borderColor: 'transparent' }} />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { key: 'gravida', label: 'G' },
            { key: 'para', label: 'P' },
            { key: 'abortion', label: 'A' },
            { key: 'living', label: 'L' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-[10px] font-bold block text-center mb-1" style={{ color: '#EC4899' }}>{f.label}</label>
              <Input type="number" min="0" value={s.ancForm[f.key]}
                onChange={e => s.updateAnc(f.key, e.target.value)}
                className="h-10 rounded-xl text-center" data-testid={`anc-${f.key}`}
                style={{ background: COLORS.bgCardHover, color: COLORS.textLight, borderColor: 'transparent' }} />
            </div>
          ))}
        </div>
      </div>

      {/* Medical Details */}
      <div className="rounded-2xl p-4 shadow-sm space-y-3" style={{ background: COLORS.bgCard }}>
        <h4 className="text-xs font-bold" style={{ color: '#10B981' }}>MEDICAL DETAILS</h4>
        <div className="grid grid-cols-2 gap-2">
          <select value={s.ancForm.blood_group} onChange={e => s.updateAnc('blood_group', e.target.value)}
            className="h-10 rounded-xl px-3 text-sm" data-testid="anc-blood"
            style={{ background: COLORS.bgCardHover, color: COLORS.textLight, border: 'none' }}>
            <option value="">Blood Group</option>
            {['A', 'B', 'AB', 'O'].map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={s.ancForm.rh_factor} onChange={e => s.updateAnc('rh_factor', e.target.value)}
            className="h-10 rounded-xl px-3 text-sm"
            style={{ background: COLORS.bgCardHover, color: COLORS.textLight, border: 'none' }}>
            <option value="Positive">Rh +ve</option>
            <option value="Negative">Rh -ve</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input value={s.ancForm.weight_kg} onChange={e => s.updateAnc('weight_kg', e.target.value)}
            placeholder="Weight (kg)" className="h-10 rounded-xl"
            style={{ background: COLORS.bgCardHover, color: COLORS.textLight, borderColor: 'transparent' }} />
          <Input value={s.ancForm.height_cm} onChange={e => s.updateAnc('height_cm', e.target.value)}
            placeholder="Height (cm)" className="h-10 rounded-xl"
            style={{ background: COLORS.bgCardHover, color: COLORS.textLight, borderColor: 'transparent' }} />
        </div>
      </div>

      {/* Medical History */}
      <div className="rounded-2xl p-4 shadow-sm space-y-3" style={{ background: COLORS.bgCard }}>
        <h4 className="text-xs font-bold" style={{ color: '#F59E0B' }}>MEDICAL HISTORY</h4>
        <div className="grid grid-cols-2 gap-2">
          {[
            { key: 'previous_cesarean', label: 'Previous C-Section' },
            { key: 'diabetes', label: 'Diabetes' },
            { key: 'hypertension', label: 'Hypertension' },
            { key: 'thyroid', label: 'Thyroid' },
          ].map(c => (
            <button key={c.key} onClick={() => s.updateAnc(c.key, !s.ancForm[c.key])}
              className="flex items-center gap-2 rounded-xl p-2.5 transition-all text-left text-xs"
              style={{
                background: s.ancForm[c.key] ? '#F59E0B20' : COLORS.bgCardHover,
                color: s.ancForm[c.key] ? '#F59E0B' : COLORS.textMuted,
                border: s.ancForm[c.key] ? '1px solid #F59E0B40' : '1px solid transparent',
              }}>
              <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                style={{ background: s.ancForm[c.key] ? '#F59E0B' : COLORS.bgCard }}>
                {s.ancForm[c.key] && <CheckCircle2 className="w-3 h-3 text-white" />}
              </div>
              {c.label}
            </button>
          ))}
        </div>
        <Input value={s.ancForm.other_conditions} onChange={e => s.updateAnc('other_conditions', e.target.value)}
          placeholder="Other conditions (optional)" className="h-10 rounded-xl"
          style={{ background: COLORS.bgCardHover, color: COLORS.textLight, borderColor: 'transparent' }} />
      </div>

      {/* Clinic & Doctor */}
      <div className="rounded-2xl p-4 shadow-sm space-y-3" style={{ background: COLORS.bgCard }}>
        <h4 className="text-xs font-bold" style={{ color: '#06B6D4' }}>CLINIC & DOCTOR</h4>
        <div className="grid grid-cols-2 gap-2">
          <select value={s.ancForm.clinic} onChange={e => s.updateAnc('clinic', e.target.value)}
            className="h-10 rounded-xl px-3 text-sm" data-testid="anc-clinic"
            style={{ background: COLORS.bgCardHover, color: COLORS.textLight, border: 'none' }}>
            <option value="Pushpa Clinic">Pushpa Clinic</option>
            <option value="Amnion Clinic">Amnion Clinic</option>
          </select>
          <select value={s.ancForm.doctor_assigned} onChange={e => s.updateAnc('doctor_assigned', e.target.value)}
            className="h-10 rounded-xl px-3 text-sm"
            style={{ background: COLORS.bgCardHover, color: COLORS.textLight, border: 'none' }}>
            <option value="">Assign Doctor</option>
            <option value="Dr. Neha Patel">Dr. Neha Patel</option>
            <option value="Dr. Vikas Jha">Dr. Vikas Jha</option>
          </select>
        </div>
      </div>

      {/* Submit */}
      <Button onClick={s.submitAncRegistration} disabled={s.ancSubmitting}
        className="w-full h-12 rounded-xl font-bold text-white text-sm shadow-lg"
        style={{ background: 'linear-gradient(135deg, #EC4899, #8B5CF6)' }}
        data-testid="anc-submit-btn">
        {s.ancSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Baby className="w-5 h-5 mr-2" />}
        Register & Email Form
      </Button>
    </div>
  );
};

export default StaffANCView;

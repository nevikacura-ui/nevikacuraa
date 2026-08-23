import React, { useState, useMemo } from 'react';
import { X, Stethoscope, FileText, CheckCircle2 } from 'lucide-react';

const DoctorChargesModal = ({ appointment, feeCodes, scanFees, onComplete, onClose }) => {
  const [selectedFeeCode, setSelectedFeeCode] = useState(appointment?.doctor_fee_code || appointment?.fee_code || '');
  const [selectedScans, setSelectedScans] = useState(appointment?.doctor_scan_codes || appointment?.scan_codes || []);

  const doctorFees = feeCodes?.[appointment?.doctor] || {};
  const feeDetail = doctorFees[selectedFeeCode] || null;
  const consultationFee = feeDetail?.amount || 0;

  const scanTotal = useMemo(() =>
    selectedScans.reduce((sum, code) => sum + (scanFees?.[code]?.amount || 0), 0),
    [selectedScans, scanFees]
  );

  const toggleScan = (code) => {
    setSelectedScans(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()} data-testid="doctor-charges-modal">
        <div className="sticky top-0 bg-white z-10 px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Add Charges</h2>
              <p className="text-xs text-gray-500 mt-0.5">{appointment?.patient_name} — {appointment?.doctor}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center" data-testid="doctor-charges-close-btn">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Consultation Fee */}
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5" /> Consultation Fee
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {Object.entries(doctorFees).map(([code, detail]) => (
                <button key={code}
                  onClick={() => setSelectedFeeCode(code)}
                  className={`px-2 py-2 rounded-xl text-center transition-all ${selectedFeeCode === code ? 'shadow-md' : ''}`}
                  style={selectedFeeCode === code
                    ? { background: 'linear-gradient(135deg, #0D9488, #0F766E)', color: '#fff' }
                    : { background: '#F5F5F4', color: '#57534E' }
                  } data-testid={`doc-fee-${code}`}>
                  <span className="text-[11px] font-bold block">{code}</span>
                  <span className="text-[9px] block mt-0.5">{detail.label.split(' - ')[0]}</span>
                  <span className="text-xs font-bold mt-0.5 block">{detail.amount > 0 ? `${detail.amount}` : 'Free'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Scans */}
          {scanFees && Object.keys(scanFees).length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Scans & Sonography
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {Object.entries(scanFees).map(([code, detail]) => (
                  <button key={code}
                    onClick={() => toggleScan(code)}
                    className={`px-2 py-2 rounded-xl text-center transition-all ${selectedScans.includes(code) ? 'shadow-md' : ''}`}
                    style={selectedScans.includes(code)
                      ? { background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', color: '#fff' }
                      : { background: '#F5F5F4', color: '#57534E' }
                    } data-testid={`doc-scan-${code}`}>
                    <span className="text-[11px] font-bold block">{code}</span>
                    <span className="text-[9px] block mt-0.5">{detail.label}</span>
                    <span className="text-xs font-bold mt-0.5 block">{detail.amount}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="rounded-2xl p-4" style={{ background: '#1E293B' }}>
            <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-2">Doctor Charges Summary</p>
            <div className="flex justify-between text-sm text-white/80">
              <span>Consultation{feeDetail ? ` (${feeDetail.label})` : ''}</span>
              <span className="font-bold text-white">{consultationFee}</span>
            </div>
            {selectedScans.map(code => (
              <div key={code} className="flex justify-between text-sm text-white/80 mt-1">
                <span>{scanFees?.[code]?.label || code}</span>
                <span className="font-bold text-white">{scanFees?.[code]?.amount || 0}</span>
              </div>
            ))}
            <div className="border-t border-white/10 pt-2 mt-2 flex justify-between">
              <span className="text-sm font-bold text-white">Subtotal (Doctor)</span>
              <span className="text-lg font-black text-emerald-400">{consultationFee + scanTotal}</span>
            </div>
            <p className="text-[9px] text-white/40 mt-1">Staff will add medicines & misc charges at billing</p>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4">
          <button onClick={() => onComplete({ fee_code: selectedFeeCode, scan_codes: selectedScans })}
            disabled={!selectedFeeCode}
            className="w-full py-4 rounded-2xl text-base font-bold text-white transition-all active:scale-[0.97] disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: selectedFeeCode ? 'linear-gradient(135deg, #0D9488, #0F766E)' : '#D1D5DB' }}
            data-testid="save-doctor-charges-btn">
            <CheckCircle2 className="w-5 h-5" />
            Save Charges
          </button>
        </div>
      </div>
    </div>
  );
};

export default DoctorChargesModal;

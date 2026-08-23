import React, { useState, useMemo } from 'react';
import { X, Stethoscope, Clock, Building2, CreditCard, Pill, Package, FileText, CheckCircle2 } from 'lucide-react';

const BillingCheckoutModal = ({ appointment, feeCodes, scanFees, onComplete, onClose }) => {
  const doctorLocked = appointment?.doctor_charges_set === true;
  const [selectedFeeCode, setSelectedFeeCode] = useState(
    doctorLocked ? (appointment?.doctor_fee_code || '') : ''
  );
  const [selectedScans, setSelectedScans] = useState(
    doctorLocked ? (appointment?.doctor_scan_codes || []) : []
  );
  const [medicineAmount, setMedicineAmount] = useState('');
  const [miscAmount, setMiscAmount] = useState('');
  const [notes, setNotes] = useState('');

  const doctorFees = feeCodes?.[appointment?.doctor] || {};
  const feeDetail = doctorFees[selectedFeeCode] || null;
  const consultationFee = feeDetail?.amount || 0;

  const scanTotal = useMemo(() =>
    selectedScans.reduce((sum, code) => sum + (scanFees?.[code]?.amount || 0), 0),
    [selectedScans, scanFees]
  );

  const [paymentMethod, setPaymentMethod] = useState('cash');
  const medAmt = parseInt(medicineAmount) || 0;
  const miscAmt = parseInt(miscAmount) || 0;
  const grandTotal = consultationFee + scanTotal + medAmt + miscAmt;

  const toggleScan = (code) => {
    setSelectedScans(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  };

  const handleComplete = () => {
    onComplete({
      fee_code: selectedFeeCode,
      scan_codes: selectedScans,
      total_amount: grandTotal,
      medicine_amount: medAmt,
      misc_amount: miscAmt,
      payment_method: paymentMethod,
      notes,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()} data-testid="billing-checkout-modal">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Close Consultation</h2>
              <p className="text-xs text-gray-500 mt-0.5">Billing & Visit Summary</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center" data-testid="billing-close-btn">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Visit Summary */}
          <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, #F0FDFA, #ECFDF5)' }}>
            <p className="text-[10px] font-bold text-teal-700 uppercase tracking-wider mb-3">Visit Summary</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Stethoscope className="w-4 h-4 text-teal-600" />
                <span className="font-semibold text-gray-800">{appointment?.doctor}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4 text-teal-600" />
                <span className="text-gray-600">{appointment?.clinic}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-teal-600" />
                <span className="text-gray-600">{appointment?.time || 'Walk-in'} - {appointment?.date}</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-teal-200/50">
              <p className="text-sm font-bold text-gray-900">{appointment?.patient_name}</p>
              <p className="text-xs text-gray-500">{appointment?.patient_phone || appointment?.mobile || ''}</p>
            </div>
          </div>

          {/* Consultation Fee */}
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" /> Consultation Fee
              {doctorLocked && <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold ml-1">Set by Doctor</span>}
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {Object.entries(doctorFees).map(([code, detail]) => (
                <button key={code}
                  onClick={() => !doctorLocked && setSelectedFeeCode(code)}
                  disabled={doctorLocked}
                  className={`px-2 py-2 rounded-xl text-center transition-all ${selectedFeeCode === code ? 'shadow-md' : ''} ${doctorLocked && selectedFeeCode !== code ? 'opacity-30' : ''}`}
                  style={selectedFeeCode === code
                    ? { background: 'linear-gradient(135deg, #0D9488, #0F766E)', color: '#fff' }
                    : { background: '#F5F5F4', color: '#57534E' }
                  } data-testid={`fee-${code}`}>
                  <span className="text-[11px] font-bold block">{code}</span>
                  <span className="text-[9px] block mt-0.5">{detail.label.split(' - ')[0]}</span>
                  <span className="text-xs font-bold mt-0.5 block">{detail.amount > 0 ? `${detail.amount}` : 'Free'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Scan Fees */}
          {scanFees && Object.keys(scanFees).length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Scans & Tests
                {doctorLocked && <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold ml-1">Set by Doctor</span>}
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {Object.entries(scanFees).map(([code, detail]) => (
                  <button key={code}
                    onClick={() => !doctorLocked && toggleScan(code)}
                    disabled={doctorLocked}
                    className={`px-2 py-2 rounded-xl text-center transition-all ${selectedScans.includes(code) ? 'shadow-md' : ''} ${doctorLocked && !selectedScans.includes(code) ? 'opacity-30' : ''}`}
                    style={selectedScans.includes(code)
                      ? { background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', color: '#fff' }
                      : { background: '#F5F5F4', color: '#57534E' }
                    } data-testid={`scan-${code}`}>
                    <span className="text-[11px] font-bold block">{code}</span>
                    <span className="text-[9px] block mt-0.5">{detail.label}</span>
                    <span className="text-xs font-bold mt-0.5 block">{detail.amount}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Medicine & Misc — 4-digit entry */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Pill className="w-3.5 h-3.5" /> Medicines
              </p>
              <input type="number" inputMode="numeric" maxLength={4} placeholder="0000"
                value={medicineAmount} onChange={e => setMedicineAmount(e.target.value.slice(0, 4))}
                className="w-full px-3 py-3 rounded-xl text-center text-lg font-bold border-2 border-gray-200 focus:border-teal-400 focus:ring-0 outline-none transition-colors"
                style={{ letterSpacing: '0.2em' }}
                data-testid="medicine-amount" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Package className="w-3.5 h-3.5" /> Miscellaneous
              </p>
              <input type="number" inputMode="numeric" maxLength={4} placeholder="0000"
                value={miscAmount} onChange={e => setMiscAmount(e.target.value.slice(0, 4))}
                className="w-full px-3 py-3 rounded-xl text-center text-lg font-bold border-2 border-gray-200 focus:border-teal-400 focus:ring-0 outline-none transition-colors"
                style={{ letterSpacing: '0.2em' }}
                data-testid="misc-amount" />
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Payment</p>
            <div className="grid grid-cols-3 gap-1.5">
              {['cash', 'upi', 'card'].map(method => (
                <button key={method} onClick={() => setPaymentMethod(method)}
                  className={`py-2 rounded-xl text-xs font-bold text-center transition-all ${paymentMethod === method ? 'shadow-md' : ''}`}
                  style={paymentMethod === method
                    ? { background: '#1E293B', color: '#fff' }
                    : { background: '#F5F5F4', color: '#57534E' }
                  } data-testid={`payment-${method}`}>
                  {method.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Notes (optional)</p>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Visit notes..."
              className="w-full px-3 py-2 rounded-xl text-sm border-2 border-gray-200 focus:border-teal-400 focus:ring-0 outline-none resize-none" data-testid="billing-notes" />
          </div>

          {/* Total Breakdown */}
          <div className="rounded-2xl p-4 space-y-2" style={{ background: '#1E293B' }}>
            <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-2">Charges Breakdown</p>
            <div className="flex justify-between text-sm text-white/80">
              <span>Consultation{feeDetail ? ` (${feeDetail.label})` : ''}</span>
              <span className="font-bold text-white">{consultationFee}</span>
            </div>
            {selectedScans.map(code => (
              <div key={code} className="flex justify-between text-sm text-white/80">
                <span>{scanFees?.[code]?.label || code}</span>
                <span className="font-bold text-white">{scanFees?.[code]?.amount || 0}</span>
              </div>
            ))}
            {medAmt > 0 && (
              <div className="flex justify-between text-sm text-white/80">
                <span>Medicines</span>
                <span className="font-bold text-white">{medAmt}</span>
              </div>
            )}
            {miscAmt > 0 && (
              <div className="flex justify-between text-sm text-white/80">
                <span>Miscellaneous</span>
                <span className="font-bold text-white">{miscAmt}</span>
              </div>
            )}
            <div className="border-t border-white/10 pt-2 mt-2 flex justify-between">
              <span className="text-base font-bold text-white">Total Amount</span>
              <span className="text-xl font-black text-emerald-400">{grandTotal}</span>
            </div>
          </div>
        </div>

        {/* Sticky Footer — Complete Button */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4">
          <button onClick={handleComplete}
            disabled={!selectedFeeCode}
            className="w-full py-4 rounded-2xl text-base font-bold text-white transition-all active:scale-[0.97] disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: selectedFeeCode ? 'linear-gradient(135deg, #0D9488, #0F766E)' : '#D1D5DB' }}
            data-testid="complete-billing-btn">
            <CheckCircle2 className="w-5 h-5" />
            Collect {grandTotal} & Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillingCheckoutModal;

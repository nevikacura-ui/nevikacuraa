import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Input } from '@/components/ui/input';
import { User, Phone, Heart, ChevronDown, QrCode, Download, RotateCcw, Check, X, AlertTriangle } from 'lucide-react';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = ['Male', 'Female', 'Other'];
const STORAGE_KEY = 'nc_emergency_qr';

const EmergencyQRButton = () => {
  const [open, setOpen] = useState(false);
  const saved = localStorage.getItem(STORAGE_KEY);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full mb-5 flex items-center gap-3 px-4 py-3 rounded-2xl active:scale-[0.97] transition-all"
        style={{
          background: 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(249,115,22,0.08) 100%)',
          border: '1px solid rgba(239,68,68,0.2)',
        }}
        data-testid="emergency-qr-btn"
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #EF4444, #F97316)' }}>
          <QrCode className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-bold text-white">Emergency QR</p>
          <p className="text-[10px] text-white/40">{saved ? 'Tap to view your QR' : 'Create your clinic check-in QR'}</p>
        </div>
        {saved && (
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">SAVED</span>
        )}
      </button>

      {open && <EmergencyQRModal onClose={() => setOpen(false)} />}
    </>
  );
};

const EmergencyQRModal = ({ onClose }) => {
  const savedRaw = localStorage.getItem(STORAGE_KEY);
  const savedData = savedRaw ? JSON.parse(savedRaw) : null;

  const buildQrText = (d) => {
    let t = `NEVIKA CURA - Patient Details\n`;
    t += `Name: ${d.name}\n`;
    t += `Phone: ${d.phone}\n`;
    if (d.age) t += `Age: ${d.age}\n`;
    if (d.gender) t += `Gender: ${d.gender}\n`;
    if (d.blood_group) t += `Blood Group: ${d.blood_group}\n`;
    t += `Date: ${d.ts}\n`;
    t += `---\n`;
    t += JSON.stringify(d);
    return t;
  };

  const [form, setForm] = useState(savedData ? { name: savedData.name, phone: savedData.phone, age: savedData.age || '', gender: savedData.gender || '', blood_group: savedData.blood_group || '' } : { name: '', phone: '', age: '', gender: '', blood_group: '' });
  const [qrData, setQrData] = useState(savedData ? buildQrText(savedData) : null);
  const [showGender, setShowGender] = useState(false);
  const [showBlood, setShowBlood] = useState(false);
  const qrRef = useRef(null);

  const isValid = form.name.trim() && form.phone.trim().length >= 10;

  const generateQR = () => {
    if (!isValid) return;
    const data = {
      type: 'nevika_patient',
      name: form.name.trim(),
      phone: form.phone.trim(),
      age: form.age || '',
      gender: form.gender || '',
      blood_group: form.blood_group || '',
      ts: new Date().toISOString().split('T')[0],
    };
    // Build human-readable QR text so all details show when scanned
    let qrText = `NEVIKA CURA - Patient Details\n`;
    qrText += `Name: ${data.name}\n`;
    qrText += `Phone: ${data.phone}\n`;
    if (data.age) qrText += `Age: ${data.age}\n`;
    if (data.gender) qrText += `Gender: ${data.gender}\n`;
    if (data.blood_group) qrText += `Blood Group: ${data.blood_group}\n`;
    qrText += `Date: ${data.ts}\n`;
    qrText += `---\n`;
    qrText += JSON.stringify(data);
    setQrData(qrText);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const resetForm = () => {
    setForm({ name: '', phone: '', age: '', gender: '', blood_group: '' });
    setQrData(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const downloadQR = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 400; canvas.height = 400;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 400, 400);
      ctx.drawImage(img, 0, 0, 400, 400);
      const a = document.createElement('a');
      a.download = `emergency-qr-${form.name.trim().replace(/\s+/g, '-')}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'slideUp 0.3s ease-out' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-3 sm:hidden" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #EF4444, #F97316)' }}>
                <AlertTriangle className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Emergency QR</h2>
                <p className="text-[11px] text-gray-400">Show at clinic for instant check-in</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200" data-testid="close-qr-modal">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!qrData ? (
          /* Form */
          <div className="p-5 space-y-3.5">
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Full Name *"
                className="h-12 pl-11 bg-gray-50 border-gray-200 rounded-xl text-gray-900 text-sm placeholder:text-gray-400 focus:border-red-400 focus:ring-red-400/20"
                data-testid="qr-name-input" />
            </div>

            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input type="tel" value={form.phone}
                onChange={(e) => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                placeholder="Phone Number *" maxLength={10}
                className="h-12 pl-11 bg-gray-50 border-gray-200 rounded-xl text-gray-900 text-sm placeholder:text-gray-400 focus:border-red-400 focus:ring-red-400/20"
                data-testid="qr-phone-input" />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <Input type="number" value={form.age}
                onChange={(e) => setForm(f => ({ ...f, age: e.target.value.slice(0, 3) }))}
                placeholder="Age"
                className="h-12 bg-gray-50 border-gray-200 rounded-xl text-gray-900 text-sm text-center placeholder:text-gray-400 focus:border-red-400"
                data-testid="qr-age-input" />

              {/* Gender */}
              <div className="relative">
                <button onClick={() => { setShowGender(!showGender); setShowBlood(false); }}
                  className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl text-sm flex items-center justify-between px-3 hover:bg-gray-100 transition-colors"
                  data-testid="qr-gender-btn">
                  <span className={form.gender ? 'text-gray-900' : 'text-gray-400'}>{form.gender || 'Gender'}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>
                {showGender && (
                  <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-xl z-20 overflow-hidden shadow-lg">
                    {GENDERS.map(g => (
                      <button key={g} onClick={() => { setForm(f => ({ ...f, gender: g })); setShowGender(false); }}
                        className="w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left" data-testid={`qr-gender-${g.toLowerCase()}`}>{g}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Blood Group */}
              <div className="relative">
                <button onClick={() => { setShowBlood(!showBlood); setShowGender(false); }}
                  className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl text-sm flex items-center justify-between px-3 hover:bg-gray-100 transition-colors"
                  data-testid="qr-blood-btn">
                  <span className={form.blood_group ? 'text-gray-900' : 'text-gray-400'}>{form.blood_group || 'Blood'}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>
                {showBlood && (
                  <div className="absolute top-full right-0 mt-1 w-full bg-white border border-gray-200 rounded-xl z-20 overflow-hidden shadow-lg">
                    {BLOOD_GROUPS.map(b => (
                      <button key={b} onClick={() => { setForm(f => ({ ...f, blood_group: b })); setShowBlood(false); }}
                        className="w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left" data-testid={`qr-blood-${b}`}>{b}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <button onClick={generateQR} disabled={!isValid}
              className="w-full h-12 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40"
              style={{ background: isValid ? 'linear-gradient(135deg, #EF4444, #F97316)' : '#e5e7eb' }}
              data-testid="qr-generate-btn">
              <QrCode className="w-4 h-4" />
              Generate Emergency QR
            </button>
          </div>
        ) : (
          /* QR Display */
          <div className="p-5 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-4">
              <Check className="w-4 h-4 text-emerald-500" />
              <p className="text-emerald-600 text-xs font-semibold">QR Saved — Show this at the clinic</p>
            </div>

            <div ref={qrRef} className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100" data-testid="qr-code-display">
              <QRCodeSVG value={qrData} size={200} level="M" includeMargin={false} bgColor="#FFFFFF" fgColor="#111827" />
            </div>

            <p className="text-gray-900 font-bold text-base mb-0.5">{form.name}</p>
            <p className="text-gray-500 text-xs mb-4">
              {form.phone}{form.age ? ` | ${form.age}y` : ''}{form.gender ? ` | ${form.gender}` : ''}{form.blood_group ? ` | ${form.blood_group}` : ''}
            </p>

            <div className="flex gap-2 w-full">
              <button onClick={downloadQR}
                className="flex-1 h-11 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-1.5"
                style={{ background: 'linear-gradient(135deg, #EF4444, #F97316)' }}
                data-testid="qr-download-btn">
                <Download className="w-3.5 h-3.5" /> Save Image
              </button>
              <button onClick={resetForm}
                className="flex-1 h-11 rounded-xl text-xs font-semibold text-gray-600 flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 transition-colors"
                data-testid="qr-reset-btn">
                <RotateCcw className="w-3.5 h-3.5" /> New Form
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default EmergencyQRButton;

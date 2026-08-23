import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { QrCode, Camera, User, Phone, Calendar, Droplet, X, CheckCircle2, Loader2, Copy, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import StaffContext from './StaffContext';
import { COLORS } from './staffConstants';

const API = process.env.REACT_APP_BACKEND_URL;

const StaffQRScanView = () => {
  const { staffInfo } = useContext(StaffContext);
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [error, setError] = useState(null);
  const [manualInput, setManualInput] = useState('');
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  const startScanner = useCallback(async () => {
    setError(null);
    setScannedData(null);
    setScanning(true);

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader');
      html5QrCodeRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        (decodedText) => {
          try {
            // Try parsing new format: readable text + JSON after "---"
            let data;
            if (decodedText.includes('---\n')) {
              const jsonPart = decodedText.split('---\n').pop();
              data = JSON.parse(jsonPart);
            } else {
              data = JSON.parse(decodedText);
            }
            if (data.type === 'nevika_patient') {
              setScannedData(data);
              scanner.stop().catch(() => {});
              setScanning(false);
              toast.success('Patient QR scanned successfully');
            } else {
              setError('Not a Nevika Cura patient QR code');
            }
          } catch {
            setError('Invalid QR code format');
          }
        },
        () => {} // ignore scan failure
      );
    } catch (err) {
      setError(err.message || 'Camera access denied');
      setScanning(false);
    }
  }, []);

  const stopScanner = useCallback(() => {
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current.stop().catch(() => {});
      html5QrCodeRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const handleManualLookup = () => {
    if (!manualInput.trim()) return;
    const phone = manualInput.trim().replace(/\D/g, '');
    if (phone.length < 10) {
      toast.error('Enter a valid 10-digit phone number');
      return;
    }
    setScannedData({
      type: 'nevika_patient',
      name: '',
      phone: phone,
      age: '',
      gender: '',
      blood_group: '',
      ts: new Date().toISOString().split('T')[0],
      manual: true,
    });
    toast.success('Patient phone entered');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => toast.success('Copied!')).catch(() => {});
  };

  const resetScan = () => {
    setScannedData(null);
    setError(null);
    setManualInput('');
  };

  return (
    <div className="space-y-4" data-testid="staff-qr-scan-view">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${COLORS.gold}20` }}>
          <QrCode className="w-5 h-5" style={{ color: COLORS.gold }} />
        </div>
        <div>
          <h2 className="text-lg font-bold" style={{ color: COLORS.textDark }}>QR Scanner</h2>
          <p className="text-xs" style={{ color: COLORS.textMuted }}>Scan patient registration QR codes</p>
        </div>
      </div>

      {/* Scanner Area */}
      {!scannedData && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'white', border: `1px solid ${COLORS.creamDark}` }}>
          {scanning ? (
            <div className="relative">
              <div id="qr-reader" ref={scannerRef} style={{ width: '100%' }} data-testid="qr-camera-view" />
              <button
                onClick={stopScanner}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white z-10"
                data-testid="stop-scanner-btn"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="p-3 text-center" style={{ background: COLORS.cream }}>
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: COLORS.gold }} />
                  <p className="text-xs font-medium" style={{ color: COLORS.textMuted }}>Position QR code in the frame</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center">
              <div className="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-4" style={{ background: `${COLORS.gold}15` }}>
                <Camera className="w-10 h-10" style={{ color: COLORS.gold }} />
              </div>
              <h3 className="font-bold mb-1" style={{ color: COLORS.textDark }}>Scan Patient QR</h3>
              <p className="text-xs mb-4" style={{ color: COLORS.textMuted }}>
                Patients can generate a QR code from the Nevika Cura home page
              </p>
              <Button
                onClick={startScanner}
                className="w-full h-12 rounded-xl font-bold text-white"
                style={{ background: COLORS.gold }}
                data-testid="start-scanner-btn"
              >
                <Camera className="w-4 h-4 mr-2" />
                Open Camera
              </Button>
            </div>
          )}

          {error && (
            <div className="px-4 py-3 text-center bg-red-50 border-t border-red-100">
              <p className="text-xs text-red-600 font-medium">{error}</p>
              <button onClick={startScanner} className="text-xs text-red-500 underline mt-1">Try Again</button>
            </div>
          )}
        </div>
      )}

      {/* Manual Phone Input */}
      {!scannedData && (
        <div className="rounded-2xl p-4" style={{ background: 'white', border: `1px solid ${COLORS.creamDark}` }}>
          <p className="text-xs font-semibold mb-2" style={{ color: COLORS.textMuted }}>Or look up by phone number</p>
          <div className="flex gap-2">
            <input
              type="tel"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="Enter 10-digit phone"
              className="flex-1 h-11 px-3 rounded-xl text-sm border outline-none focus:ring-2"
              style={{ borderColor: COLORS.creamDark, focusRing: COLORS.gold }}
              maxLength={10}
              data-testid="manual-phone-input"
            />
            <Button
              onClick={handleManualLookup}
              disabled={manualInput.length < 10}
              className="h-11 px-4 rounded-xl font-semibold text-white"
              style={{ background: COLORS.gold, opacity: manualInput.length < 10 ? 0.5 : 1 }}
              data-testid="manual-lookup-btn"
            >
              Look Up
            </Button>
          </div>
        </div>
      )}

      {/* Scanned Patient Details */}
      {scannedData && (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'white', border: `2px solid ${COLORS.gold}40` }}>
          {/* Success Header */}
          <div className="px-4 py-3 flex items-center gap-2" style={{ background: `${COLORS.gold}15` }}>
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <span className="font-bold text-sm" style={{ color: COLORS.textDark }}>
              {scannedData.manual ? 'Phone Lookup' : 'QR Scanned'} — Patient Details
            </span>
          </div>

          {/* Patient Info Cards */}
          <div className="p-4 space-y-3">
            {scannedData.name && (
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: COLORS.cream }}>
                <User className="w-5 h-5 flex-shrink-0" style={{ color: COLORS.gold }} />
                <div className="flex-1">
                  <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: COLORS.textMuted }}>Name</p>
                  <p className="text-sm font-bold" style={{ color: COLORS.textDark }}>{scannedData.name}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: COLORS.cream }}>
              <Phone className="w-5 h-5 flex-shrink-0" style={{ color: COLORS.gold }} />
              <div className="flex-1">
                <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: COLORS.textMuted }}>Phone</p>
                <p className="text-sm font-bold" style={{ color: COLORS.textDark }}>{scannedData.phone}</p>
              </div>
              <button onClick={() => copyToClipboard(scannedData.phone)} className="p-1.5 rounded-lg hover:bg-black/5">
                <Copy className="w-3.5 h-3.5" style={{ color: COLORS.textMuted }} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {scannedData.age && (
                <div className="p-2.5 rounded-xl text-center" style={{ background: COLORS.cream }}>
                  <p className="text-[9px] uppercase font-bold" style={{ color: COLORS.textMuted }}>Age</p>
                  <p className="text-sm font-bold" style={{ color: COLORS.textDark }}>{scannedData.age}y</p>
                </div>
              )}
              {scannedData.gender && (
                <div className="p-2.5 rounded-xl text-center" style={{ background: COLORS.cream }}>
                  <p className="text-[9px] uppercase font-bold" style={{ color: COLORS.textMuted }}>Gender</p>
                  <p className="text-sm font-bold" style={{ color: COLORS.textDark }}>{scannedData.gender}</p>
                </div>
              )}
              {scannedData.blood_group && (
                <div className="p-2.5 rounded-xl text-center" style={{ background: COLORS.cream }}>
                  <p className="text-[9px] uppercase font-bold" style={{ color: COLORS.textMuted }}>Blood</p>
                  <p className="text-sm font-bold text-red-500">{scannedData.blood_group}</p>
                </div>
              )}
            </div>

            {scannedData.ts && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: `${COLORS.gold}08` }}>
                <Calendar className="w-3.5 h-3.5" style={{ color: COLORS.textMuted }} />
                <p className="text-[10px]" style={{ color: COLORS.textMuted }}>Registered on {scannedData.ts}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="px-4 pb-4 flex gap-2">
            <Button
              onClick={resetScan}
              className="flex-1 h-11 rounded-xl font-semibold text-sm"
              variant="outline"
              style={{ borderColor: COLORS.creamDark, color: COLORS.textMuted }}
              data-testid="scan-another-btn"
            >
              <QrCode className="w-4 h-4 mr-1.5" />
              Scan Another
            </Button>
            <Button
              onClick={() => {
                if (scannedData.phone) {
                  window.open(`https://wa.me/91${scannedData.phone}`, '_blank');
                }
              }}
              className="flex-1 h-11 rounded-xl font-semibold text-sm text-white"
              style={{ background: '#25D366' }}
              data-testid="whatsapp-patient-btn"
            >
              <UserPlus className="w-4 h-4 mr-1.5" />
              WhatsApp
            </Button>
          </div>
        </div>
      )}

      {/* Info Tip */}
      <div className="rounded-xl p-3 flex items-start gap-2.5" style={{ background: `${COLORS.gold}08`, border: `1px solid ${COLORS.gold}15` }}>
        <QrCode className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: COLORS.gold }} />
        <div>
          <p className="text-[11px] font-semibold" style={{ color: COLORS.textDark }}>How it works</p>
          <p className="text-[10px] mt-0.5" style={{ color: COLORS.textMuted }}>
            Patients fill out a quick form on the Nevika Cura home page, which generates a QR code.
            They can show or share this QR at reception for instant registration.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StaffQRScanView;

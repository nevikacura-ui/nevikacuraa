import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { MapPin, Phone, TestTube2, Clock, CheckCircle2, AlertTriangle, Loader2, ShieldCheck, KeyRound, Droplet, User } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function PhlebotomistTracker() {
  const { bookingId } = useParams();
  const [searchParams] = useSearchParams();
  const bookingIdFinal = bookingId || searchParams.get('id') || '';

  const [bookingInfo, setBookingInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [collected, setCollected] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  useEffect(() => {
    if (!bookingIdFinal) { setLoading(false); return; }
    fetch(`${API}/api/mango/collection/${bookingIdFinal}/info`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.success) setBookingInfo(data);
        else setError('Booking not found');
      })
      .catch(() => setError('Could not load booking'))
      .finally(() => setLoading(false));
  }, [bookingIdFinal]);

  const handleVerify = async () => {
    if (!verifyCode || verifyCode.length < 4) {
      setVerifyError('Enter the 6-digit booking number from patient');
      return;
    }
    setVerifying(true);
    setVerifyError('');
    try {
      const res = await fetch(`${API}/api/mango/collection/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingIdFinal, verification_code: verifyCode }),
      });
      const data = await res.json();
      if (data.success) {
        setCollected(true);
      } else {
        setVerifyError(data.error || 'Verification failed');
      }
    } catch {
      setVerifyError('Network error. Try again.');
    }
    setVerifying(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0E1F15' }}>
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!bookingIdFinal) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#0E1F15' }}>
        <div className="text-center">
          <TestTube2 className="w-12 h-12 mx-auto text-emerald-400 mb-3" />
          <p className="text-white font-semibold">No Booking ID</p>
          <p className="text-sm text-white/50 mt-1">Open the link sent by the lab to start collection</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#0E1F15' }} data-testid="phlebotomist-tracker">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
            <Droplet className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Sample Collection</h1>
            <p className="text-xs text-white/40">Mango Health Labs</p>
          </div>
        </div>
      </div>

      {/* Booking Card */}
      <div className="mx-5 mb-4 rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }} data-testid="booking-info-card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Booking</p>
            <p className="text-base font-bold text-white" data-testid="agent-booking-id">{bookingIdFinal}</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
            collected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
          }`}>
            {collected ? 'Collected' : bookingInfo?.status?.replace(/_/g, ' ') || 'Pending'}
          </span>
        </div>

        {/* Patient Info */}
        {bookingInfo?.patient_name && (
          <div className="flex items-center gap-2.5 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <User className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs text-white/40">Patient</p>
              <p className="text-sm text-white/80">{bookingInfo.patient_name}</p>
            </div>
          </div>
        )}

        {/* Address */}
        {bookingInfo?.address && (
          <div className="flex items-start gap-2.5 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <MapPin className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-white/40">Collection Address</p>
              <p className="text-sm text-white/80 mt-0.5">
                {typeof bookingInfo.address === 'object'
                  ? [bookingInfo.address.line1, bookingInfo.address.city, bookingInfo.address.pincode].filter(Boolean).join(', ')
                  : bookingInfo.address}
              </p>
            </div>
          </div>
        )}

        {/* Collection Time */}
        {bookingInfo?.collection_time && (
          <div className="flex items-center gap-2.5 mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs text-white/40">Preferred Time</p>
              <p className="text-sm text-white/80">{bookingInfo.collection_time}</p>
            </div>
          </div>
        )}

        {/* Tests */}
        {bookingInfo?.tests?.length > 0 && (
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Tests ({bookingInfo.tests.length})</p>
            {bookingInfo.tests.map((test, i) => (
              <div key={i} className="flex justify-between text-xs py-0.5">
                <span className="text-white/60 flex items-center gap-1.5">
                  <TestTube2 className="w-3 h-3 text-emerald-500/50" />
                  {test.name}
                </span>
                {test.price > 0 && <span className="text-white/40">{'\u20B9'}{test.price}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Collection Verified Success */}
      {collected && (
        <div className="mx-5 mb-6 rounded-2xl p-6 text-center" style={{ background: 'linear-gradient(135deg, #065F46, #047857)' }} data-testid="collection-success">
          <ShieldCheck className="w-14 h-14 text-emerald-300 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white mb-1">Collection Verified</h2>
          <p className="text-emerald-200 text-sm">Booking #{bookingIdFinal} — sample collected</p>
        </div>
      )}

      {/* Verification Section */}
      {bookingInfo && !collected && (
        <div className="mx-5 mb-4 rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }} data-testid="verify-section">
          <div className="flex items-center gap-2.5 mb-3">
            <KeyRound className="w-4 h-4 text-emerald-400" />
            <p className="text-sm font-semibold text-white">Confirm Collection</p>
          </div>
          <p className="text-xs text-white/40 mb-3">Ask the patient for their 6-digit booking number to confirm sample collection.</p>
          <div className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={verifyCode}
              onChange={e => { setVerifyCode(e.target.value.replace(/\D/g, '')); setVerifyError(''); }}
              placeholder="Enter 6-digit code"
              className="flex-1 h-12 px-4 rounded-xl text-center text-lg font-bold tracking-[0.3em] bg-white/10 text-white placeholder-white/30 outline-none border border-white/10 focus:border-emerald-500/50"
              data-testid="verify-code-input"
            />
            <button
              onClick={handleVerify}
              disabled={verifying || verifyCode.length < 4}
              className="h-12 px-5 rounded-xl font-bold text-sm text-white disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
              data-testid="verify-btn">
              {verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify'}
            </button>
          </div>
          {verifyError && (
            <p className="text-xs text-red-400 mt-2" data-testid="verify-error">{verifyError}</p>
          )}
        </div>
      )}

      {/* Error */}
      {error && !bookingInfo && (
        <div className="mx-5 mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
          <AlertTriangle className="w-6 h-6 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Quick Actions */}
      {bookingInfo && !collected && (
        <div className="mx-5 mb-8 grid grid-cols-2 gap-3">
          {bookingInfo.patient_phone && (
            <a href={`tel:${bookingInfo.patient_phone}`} className="flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold text-white/70 no-underline"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              data-testid="call-patient-btn">
              <Phone className="w-4 h-4" /> Call Patient
            </a>
          )}
          <a href={`https://maps.google.com/?q=${typeof bookingInfo.address === 'object'
              ? [bookingInfo.address.line1, bookingInfo.address.city].filter(Boolean).join(', ')
              : bookingInfo.address || ''}`}
            target="_blank" rel="noopener noreferrer"
            className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold text-white/70 no-underline ${bookingInfo.patient_phone ? '' : 'col-span-2'}`}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            data-testid="open-maps-btn">
            <MapPin className="w-4 h-4" /> Open in Google Maps
          </a>
        </div>
      )}

      {/* Footer */}
      <div className="text-center pb-8">
        <p className="text-[10px] text-white/15">Mango Health Labs Collection</p>
      </div>
    </div>
  );
}

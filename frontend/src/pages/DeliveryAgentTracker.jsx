import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { MapPin, Navigation, Pause, Play, Phone, Package, Clock, CheckCircle2, AlertTriangle, Loader2, ShieldCheck, KeyRound } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function DeliveryAgentTracker() {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const orderIdFinal = orderId || searchParams.get('id') || '';

  const [tracking, setTracking] = useState(false);
  const [position, setPosition] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [speed, setSpeed] = useState(null);
  const [heading, setHeading] = useState(null);
  const [updateCount, setUpdateCount] = useState(0);
  const [lastSent, setLastSent] = useState(null);
  const [error, setError] = useState('');
  const [orderInfo, setOrderInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gpsStatus, setGpsStatus] = useState('idle');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [delivered, setDelivered] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  const watchIdRef = useRef(null);
  const sendIntervalRef = useRef(null);
  const latestPositionRef = useRef(null);

  // Fetch order info
  useEffect(() => {
    if (!orderIdFinal) { setLoading(false); return; }
    fetch(`${API}/api/pharmacy/orders/${orderIdFinal}/live-tracking`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.success) setOrderInfo(data);
        else setError('Order not found');
      })
      .catch(() => setError('Could not load order'))
      .finally(() => setLoading(false));
  }, [orderIdFinal]);

  // Verify delivery with code
  const handleVerify = async () => {
    if (!verifyCode || verifyCode.length < 4) {
      setVerifyError('Enter the 6-digit order number from customer');
      return;
    }
    setVerifying(true);
    setVerifyError('');
    try {
      const res = await fetch(`${API}/api/pharmacy/delivery/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderIdFinal, verification_code: verifyCode }),
      });
      const data = await res.json();
      if (data.success) {
        setDelivered(true);
        stopTracking();
      } else {
        setVerifyError(data.error || 'Verification failed');
      }
    } catch {
      setVerifyError('Network error. Try again.');
    }
    setVerifying(false);
  };

  // Send location to backend
  const sendLocation = useCallback(async () => {
    const pos = latestPositionRef.current;
    if (!pos || !orderIdFinal) return;

    try {
      const res = await fetch(`${API}/api/pharmacy/delivery/location`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderIdFinal,
          latitude: pos.latitude,
          longitude: pos.longitude,
          heading: pos.heading,
          speed: pos.speed,
        }),
      });
      if (res.ok) {
        setUpdateCount(c => c + 1);
        setLastSent(new Date());
      }
    } catch (e) {
      console.error('Failed to send location:', e);
    }
  }, [orderIdFinal]);

  // Start GPS tracking
  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('GPS not supported on this device');
      return;
    }
    setError('');
    setGpsStatus('acquiring');
    setTracking(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy: acc, speed: spd, heading: hdg } = pos.coords;
        latestPositionRef.current = { latitude, longitude, heading: hdg, speed: spd };
        setPosition({ lat: latitude, lng: longitude });
        setAccuracy(acc ? Math.round(acc) : null);
        setSpeed(spd ? Math.round(spd * 3.6) : 0);
        setHeading(hdg);
        setGpsStatus('active');
      },
      (err) => {
        setGpsStatus('error');
        if (err.code === 1) setError('Location permission denied. Please allow GPS access.');
        else if (err.code === 2) setError('GPS unavailable. Please try outdoors.');
        else setError('GPS timeout. Retrying...');
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    // Send location every 10 seconds
    sendIntervalRef.current = setInterval(sendLocation, 10000);
    // Also send immediately on first fix
    setTimeout(sendLocation, 2000);
  };

  // Stop tracking
  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (sendIntervalRef.current) {
      clearInterval(sendIntervalRef.current);
      sendIntervalRef.current = null;
    }
    setTracking(false);
    setGpsStatus('idle');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (sendIntervalRef.current) clearInterval(sendIntervalRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0E1A25' }}>
        <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
      </div>
    );
  }

  if (!orderIdFinal) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: '#0E1A25' }}>
        <div className="text-center">
          <Package className="w-12 h-12 mx-auto text-orange-400 mb-3" />
          <p className="text-white font-semibold">No Order ID</p>
          <p className="text-sm text-white/50 mt-1">Open the link sent by the pharmacy to start tracking</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#0E1A25' }} data-testid="delivery-agent-tracker">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}>
            <Navigation className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Delivery Tracker</h1>
            <p className="text-xs text-white/40">Orange Pharmacy</p>
          </div>
        </div>
      </div>

      {/* Order Card */}
      <div className="mx-5 mb-4 rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }} data-testid="order-info-card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider">Order</p>
            <p className="text-base font-bold text-white" data-testid="agent-order-id">{orderIdFinal}</p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-400">
            {orderInfo?.status_label || orderInfo?.status || 'Active'}
          </span>
        </div>

        {orderInfo?.delivery_address && (
          <div className="flex items-start gap-2.5 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <MapPin className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-white/40">Deliver to</p>
              <p className="text-sm text-white/80 mt-0.5">
                {typeof orderInfo.delivery_address === 'object'
                  ? [orderInfo.delivery_address.line1, orderInfo.delivery_address.city, orderInfo.delivery_address.pincode].filter(Boolean).join(', ')
                  : orderInfo.delivery_address}
              </p>
            </div>
          </div>
        )}

        {orderInfo?.items?.length > 0 && (
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Items ({orderInfo.items.length})</p>
            {orderInfo.items.slice(0, 4).map((item, i) => (
              <div key={i} className="flex justify-between text-xs py-0.5">
                <span className="text-white/60">{item.name} x{item.qty}</span>
                {item.price > 0 && <span className="text-white/40">{'\u20B9'}{item.price}</span>}
              </div>
            ))}
            {orderInfo.items.length > 4 && (
              <p className="text-xs text-white/30 mt-1">+{orderInfo.items.length - 4} more items</p>
            )}
          </div>
        )}
      </div>

      {/* GPS Status Panel */}
      <div className="mx-5 mb-4 rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Status Row */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-3 h-3 rounded-full ${
              gpsStatus === 'active' ? 'bg-emerald-400 animate-pulse' :
              gpsStatus === 'acquiring' ? 'bg-amber-400 animate-pulse' :
              gpsStatus === 'error' ? 'bg-red-400' : 'bg-white/20'
            }`} />
            <span className="text-sm text-white/70 font-medium">
              {gpsStatus === 'active' ? 'GPS Active' :
               gpsStatus === 'acquiring' ? 'Acquiring GPS...' :
               gpsStatus === 'error' ? 'GPS Error' : 'GPS Off'}
            </span>
          </div>
          {position && accuracy && (
            <span className="text-[10px] text-white/30">{'\u00B1'}{accuracy}m accuracy</span>
          )}
        </div>

        {/* Metrics Grid */}
        {tracking && (
          <div className="grid grid-cols-3 gap-px bg-white/5">
            <MetricCell label="Updates Sent" value={updateCount} icon={CheckCircle2} />
            <MetricCell label="Speed" value={speed ? `${speed} km/h` : '0 km/h'} icon={Navigation} />
            <MetricCell label="Last Sent" value={lastSent ? lastSent.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--'} icon={Clock} />
          </div>
        )}

        {/* Coordinates */}
        {position && (
          <div className="px-4 py-2 text-[10px] text-white/20 font-mono" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mx-5 mb-4 p-3 rounded-xl flex items-start gap-2.5 bg-red-500/10 border border-red-500/20" data-testid="gps-error">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {/* Start/Stop Button */}
      <div className="mx-5 mb-6">
        {!tracking ? (
          <button
            onClick={startTracking}
            className="w-full py-4 rounded-2xl text-base font-bold text-white flex items-center justify-center gap-3 active:scale-[0.98] transition-transform"
            style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)', boxShadow: '0 8px 32px rgba(249,115,22,0.3)' }}
            data-testid="start-tracking-btn">
            <Play className="w-5 h-5" fill="white" />
            Start Sharing Location
          </button>
        ) : (
          <button
            onClick={stopTracking}
            className="w-full py-4 rounded-2xl text-base font-bold text-white flex items-center justify-center gap-3 active:scale-[0.98] transition-transform"
            style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)', boxShadow: '0 8px 32px rgba(239,68,68,0.3)' }}
            data-testid="stop-tracking-btn">
            <Pause className="w-5 h-5" fill="white" />
            Stop Sharing Location
          </button>
        )}
      </div>

      {/* Help Text */}
      <div className="mx-5 mb-8 text-center">
        {!tracking ? (
          <p className="text-xs text-white/25 leading-relaxed">
            Tap the button above to start sharing your live location with the customer. Keep this page open during delivery.
          </p>
        ) : (
          <p className="text-xs text-emerald-400/60 leading-relaxed">
            Your location is being shared every 10 seconds. The customer can see you on the map in real-time.
          </p>
        )}
      </div>

      {/* Delivered Success State */}
      {delivered && (
        <div className="mx-5 mb-6 rounded-2xl p-6 text-center" style={{ background: 'linear-gradient(135deg, #065F46, #047857)' }} data-testid="delivery-success">
          <ShieldCheck className="w-14 h-14 text-emerald-300 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white mb-1">Delivery Verified</h2>
          <p className="text-emerald-200 text-sm">Order #{orderIdFinal} marked as delivered</p>
        </div>
      )}

      {/* Verification Section */}
      {orderInfo && !delivered && (
        <div className="mx-5 mb-4 rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }} data-testid="verify-section">
          <div className="flex items-center gap-2.5 mb-3">
            <KeyRound className="w-4 h-4 text-emerald-400" />
            <p className="text-sm font-semibold text-white">Confirm Delivery</p>
          </div>
          <p className="text-xs text-white/40 mb-3">Ask the customer for their 6-digit order number to complete delivery.</p>
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

      {/* Quick Actions */}
      {orderInfo && !delivered && (
        <div className="mx-5 mb-8 grid grid-cols-2 gap-3">
          {orderInfo.driver?.phone && (
            <a href={`tel:${orderInfo.driver.phone}`} className="flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold text-white/70 no-underline"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Phone className="w-4 h-4" /> Call Pharmacy
            </a>
          )}
          <a href={`https://maps.google.com/?q=${typeof orderInfo.delivery_address === 'object'
              ? [orderInfo.delivery_address.line1, orderInfo.delivery_address.city].filter(Boolean).join(', ')
              : orderInfo.delivery_address || ''}`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold text-white/70 col-span-2 no-underline"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            data-testid="open-maps-btn">
            <MapPin className="w-4 h-4" /> Open in Google Maps
          </a>
        </div>
      )}

      {/* Footer */}
      <div className="text-center pb-8">
        <p className="text-[10px] text-white/15">Orange Pharmacy Delivery</p>
      </div>
    </div>
  );
}

const MetricCell = ({ label, value, icon: Icon }) => (
  <div className="px-3 py-2.5 text-center" style={{ background: 'rgba(255,255,255,0.02)' }}>
    <Icon className="w-3.5 h-3.5 text-white/20 mx-auto mb-1" />
    <p className="text-xs font-bold text-white/80">{value}</p>
    <p className="text-[9px] text-white/25 mt-0.5">{label}</p>
  </div>
);

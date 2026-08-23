import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Navigation, ChevronDown, X, Check, AlertCircle, Truck, Zap, Loader2 } from 'lucide-react';
import { getDeliveryZone, getDeliveryEstimate } from '@/utils/discountUtils';

const DeliveryBar = ({ lightMode = false }) => {
  const [pincode, setPincode] = useState(() => localStorage.getItem('nc_pincode') || '');
  const [inputPin, setInputPin] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [zone, setZone] = useState(null);
  const [estimate, setEstimate] = useState(null);

  useEffect(() => {
    if (pincode) {
      const z = getDeliveryZone(pincode);
      setZone(z);
      setEstimate(getDeliveryEstimate(pincode));
    }
  }, [pincode]);

  // Auto-detect location using browser Geolocation + reverse geocoding
  const detectLocation = useCallback(async () => {
    if (!navigator.geolocation) return;
    setDetecting(true);
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, enableHighAccuracy: false });
      });
      const { latitude, longitude } = pos.coords;
      // Reverse geocode via OpenStreetMap Nominatim (free, no key needed)
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18`);
      const data = await res.json();
      const detectedPin = data?.address?.postcode;
      if (detectedPin) {
        setPincode(detectedPin);
        localStorage.setItem('nc_pincode', detectedPin);
        setIsOpen(false);
      }
    } catch (err) {
      console.warn('Location detection failed:', err);
    }
    setDetecting(false);
  }, []);

  // Auto-detect on first visit if no pincode saved
  useEffect(() => {
    if (!pincode && !localStorage.getItem('nc_pin_asked')) {
      localStorage.setItem('nc_pin_asked', '1');
      detectLocation();
    }
  }, []);

  const handleSubmit = () => {
    if (inputPin.length === 6) {
      setPincode(inputPin);
      localStorage.setItem('nc_pincode', inputPin);
      setIsOpen(false);
      setInputPin('');
    }
  };

  const bgColor = lightMode ? 'bg-white' : 'bg-zinc-900';
  const borderColor = lightMode ? 'border-stone-200' : 'border-zinc-800';
  const textColor = lightMode ? 'text-stone-800' : 'text-white';
  const subColor = lightMode ? 'text-stone-500' : 'text-zinc-400';

  return (
    <>
      {/* Delivery Bar */}
      <button
        onClick={() => setIsOpen(true)}
        className={`w-full flex items-center gap-2.5 px-4 py-2.5 ${bgColor} border-b ${borderColor} transition-all active:bg-opacity-80`}
        data-testid="delivery-bar"
      >
        <MapPin className="w-4 h-4 text-orange-500 flex-shrink-0" />
        <div className="flex-1 text-left min-w-0">
          {pincode && zone ? (
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold ${textColor} truncate`}>
                Deliver to {pincode}
              </span>
              {zone.zone === 'unserviceable' ? (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 font-semibold flex-shrink-0">Not Serviceable</span>
              ) : (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 font-semibold flex-shrink-0 flex items-center gap-0.5">
                  <Check className="w-2.5 h-2.5" /> We deliver here
                </span>
              )}
            </div>
          ) : detecting ? (
            <span className={`text-xs ${subColor} flex items-center gap-1`}>
              <Loader2 className="w-3 h-3 animate-spin" /> Detecting your location...
            </span>
          ) : (
            <span className={`text-xs ${subColor}`}>Enter delivery pincode</span>
          )}
          {zone?.zone !== 'unserviceable' && estimate && (
            <div className="flex items-center gap-3 mt-0.5">
              <span className={`text-[10px] ${subColor} flex items-center gap-0.5`}>
                <Zap className="w-2.5 h-2.5 text-amber-500" /> Express 3hr: {'\u20B9'}{zone.express}
              </span>
              <span className={`text-[10px] ${subColor} flex items-center gap-0.5`}>
                <Truck className="w-2.5 h-2.5 text-green-500" /> {estimate.freeBy}: {zone.nextDay === 0 ? 'FREE' : `\u20B9${zone.nextDay}`}
              </span>
            </div>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 ${subColor} flex-shrink-0`} />
      </button>

      {/* Pincode Entry Sheet */}
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)}>
          <div className="bg-zinc-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 border border-zinc-700" onClick={e => e.stopPropagation()} data-testid="pincode-sheet">
            <div className="w-12 h-1 bg-zinc-600 rounded-full mx-auto mb-4 sm:hidden" />
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-white">Delivery Location</h3>
                <p className="text-xs text-zinc-400 mt-0.5">Enter pincode or use auto-detect</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Auto-detect */}
            <button
              onClick={detectLocation}
              disabled={detecting}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl mb-4 transition-all active:scale-[0.98]"
              style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }}
              data-testid="auto-detect-btn"
            >
              {detecting ? (
                <Loader2 className="w-5 h-5 text-orange-400 animate-spin" />
              ) : (
                <Navigation className="w-5 h-5 text-orange-400" />
              )}
              <div className="text-left">
                <p className="text-sm font-bold text-orange-300">{detecting ? 'Detecting...' : 'Use Current Location'}</p>
                <p className="text-[10px] text-orange-400/60">Auto-detect via GPS</p>
              </div>
            </button>

            {/* Manual pincode */}
            <div className="flex gap-2 mb-4">
              <input
                type="tel"
                maxLength={6}
                value={inputPin}
                onChange={e => setInputPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit pincode"
                className="flex-1 h-12 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none text-center text-lg tracking-[0.3em] font-bold"
                data-testid="pincode-input"
                autoFocus
              />
              <button
                onClick={handleSubmit}
                disabled={inputPin.length !== 6}
                className="h-12 px-5 rounded-xl font-bold text-white transition-all disabled:opacity-30"
                style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}
                data-testid="pincode-submit"
              >
                Check
              </button>
            </div>

            {/* Zone result */}
            {pincode && zone && (
              <div className={`rounded-xl p-3.5 flex items-center gap-3 ${zone.zone === 'unserviceable' ? 'bg-red-500/10 border border-red-500/20' : 'bg-green-500/10 border border-green-500/20'}`}>
                {zone.zone === 'unserviceable' ? (
                  <>
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-red-300">Not Serviceable</p>
                      <p className="text-[10px] text-red-400/70">Sorry, we don't deliver to {pincode} yet</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-green-300">We deliver to {pincode}!</p>
                      <p className="text-[10px] text-green-400/70">{zone.label} — Express 3hr ({'\u20B9'}{zone.express}) | Next day {zone.nextDay === 0 ? 'FREE' : `\u20B9${zone.nextDay}`}</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Serviceable areas hint */}
            <p className="text-[10px] text-zinc-500 text-center mt-4">
              Currently serving Virar, Nalasopara, Vasai & Mumbai areas
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default DeliveryBar;

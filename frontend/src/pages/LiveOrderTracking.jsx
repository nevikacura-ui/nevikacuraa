import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Package, Phone, MapPin, Clock, CheckCircle, Truck, BoxSelect, Star, Navigation, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const API = process.env.REACT_APP_BACKEND_URL;

const STEPS = [
  { key: 'order_placed', altKeys: ['booked'], label: 'Order Placed', icon: Package, color: '#6366F1' },
  { key: 'prescription_validated', altKeys: ['pharmacist_call'], label: 'Confirmed', icon: Phone, color: '#8B5CF6' },
  { key: 'in_process', altKeys: ['packing'], label: 'Packing', icon: BoxSelect, color: '#F59E0B' },
  { key: 'shipped', altKeys: ['out_for_delivery'], label: 'Out for Delivery', icon: Truck, color: '#3B82F6' },
  { key: 'delivered', altKeys: ['completed'], label: 'Delivered', icon: CheckCircle, color: '#10B981' },
];

const matchStep = (status, step) =>
  step.key === status || (step.altKeys && step.altKeys.includes(status));

const getStepIndex = (status) => {
  const idx = STEPS.findIndex(s => matchStep(status, s));
  return idx >= 0 ? idx : 0;
};

/* ===== Leaflet Map (loaded dynamically to avoid SSR issues) ===== */
const DeliveryMap = ({ currentLocation, pharmacyLocation, deliveryLocation, routeTrail, driverName }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    // Dynamic import of Leaflet
    const initMap = async () => {
      const L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');

      // Fix default icon paths
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const center = currentLocation
        ? [currentLocation.lat, currentLocation.lng]
        : [19.3750, 72.8480];

      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView(center, 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapInstance.current = map;

      // Create custom icons
      const driverIcon = L.divIcon({
        className: 'driver-marker',
        html: `<div style="width:36px;height:36px;background:#3B82F6;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
        </div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const pharmacyIcon = L.divIcon({
        className: 'pharmacy-marker',
        html: `<div style="width:32px;height:32px;background:#F97316;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 10h-4v4h-4v-4H6v-4h4V5h4v4h4v4z"/></svg>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const homeIcon = L.divIcon({
        className: 'home-marker',
        html: `<div style="width:32px;height:32px;background:#10B981;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      // Add markers
      if (pharmacyLocation) {
        markersRef.current.pharmacy = L.marker([pharmacyLocation.lat, pharmacyLocation.lng], { icon: pharmacyIcon })
          .addTo(map)
          .bindPopup('Orange Pharmacy');
      }
      if (deliveryLocation) {
        markersRef.current.delivery = L.marker([deliveryLocation.lat, deliveryLocation.lng], { icon: homeIcon })
          .addTo(map)
          .bindPopup('Delivery Address');
      }
      if (currentLocation) {
        markersRef.current.driver = L.marker([currentLocation.lat, currentLocation.lng], { icon: driverIcon })
          .addTo(map)
          .bindPopup(driverName || 'Delivery Partner');
      }

      // Draw route trail
      if (routeTrail && routeTrail.length > 1) {
        const coords = routeTrail.map(p => [p.lat, p.lng]);
        L.polyline(coords, { color: '#3B82F6', weight: 4, opacity: 0.7, dashArray: '8, 8' }).addTo(map);
      }

      // Fit bounds to show all markers
      const allPoints = [];
      if (pharmacyLocation) allPoints.push([pharmacyLocation.lat, pharmacyLocation.lng]);
      if (deliveryLocation) allPoints.push([deliveryLocation.lat, deliveryLocation.lng]);
      if (currentLocation) allPoints.push([currentLocation.lat, currentLocation.lng]);
      if (allPoints.length > 1) {
        map.fitBounds(allPoints, { padding: [50, 50] });
      }
    };

    initMap();

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Update driver marker position on location change
  useEffect(() => {
    if (!mapInstance.current || !currentLocation || !markersRef.current.driver) return;
    const L = window.L || {};
    markersRef.current.driver.setLatLng([currentLocation.lat, currentLocation.lng]);
  }, [currentLocation]);

  return (
    <div ref={mapRef} style={{ height: '100%', width: '100%', borderRadius: 'inherit' }}
      data-testid="live-delivery-map" />
  );
};

/* ===== Driver Card ===== */
const DriverCard = ({ driver, lastUpdated }) => (
  <div className="rounded-2xl p-4 mt-4" style={{ background: 'linear-gradient(135deg, #1F4F46 0%, #2A6B5E 100%)' }}>
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg">
        {driver?.name?.[0] || 'D'}
      </div>
      <div className="flex-1">
        <p className="text-white font-semibold text-sm">{driver?.name || 'Delivery Partner'}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <Navigation className="w-3 h-3 text-emerald-300" />
          <span className="text-white/70 text-xs">
            {lastUpdated ? `Updated ${new Date(lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : 'Tracking...'}
          </span>
        </div>
      </div>
      <a href={`tel:${driver?.phone || ''}`}
        className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center"
        data-testid="call-driver-btn">
        <Phone className="w-5 h-5 text-white" />
      </a>
    </div>
    <div className="mt-3 p-3 rounded-xl bg-white/10 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-white/60" />
        <span className="text-white text-sm font-medium">Estimated Arrival</span>
      </div>
      <span className="text-white font-bold">{driver?.estimated_minutes || 30} mins</span>
    </div>
  </div>
);

/* ===== Step Tracker ===== */
const StepTracker = ({ currentStep }) => {
  const currentIdx = getStepIndex(currentStep);

  return (
    <div className="relative py-2">
      {STEPS.map((step, i) => {
        const isActive = i <= currentIdx;
        const isCurrent = i === currentIdx;
        const StepIcon = step.icon;
        return (
          <div key={step.key} className="flex items-start gap-4 relative" data-testid={`step-${step.key}`}>
            {i < STEPS.length - 1 && (
              <div className="absolute left-5 top-10 w-0.5 h-12"
                style={{ background: isActive && i < currentIdx ? step.color : '#E5E7EB' }} />
            )}
            <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${isCurrent ? 'scale-110 shadow-lg' : ''}`}
              style={{
                background: isActive ? step.color : '#F3F4F6',
                boxShadow: isCurrent ? `0 0 0 4px ${step.color}20, 0 4px 12px ${step.color}30` : 'none',
              }}>
              <StepIcon className={`w-4.5 h-4.5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
              {isCurrent && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-white border-2 animate-pulse" style={{ borderColor: step.color }} />}
            </div>
            <div className="pt-2 pb-6">
              <p className={`font-semibold text-sm ${isActive ? 'text-[#1A2B28]' : 'text-gray-400'}`}>{step.label}</p>
              {isCurrent && <p className="text-xs text-[#4A6B64] mt-0.5">In progress...</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ===== Main Page ===== */
export default function LiveOrderTracking() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [trackingId, setTrackingId] = useState(searchParams.get('id') || '');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    if (trackingId) fetchOrder(trackingId);
  }, []);

  // Auto-refresh tracking data every 10s when live
  useEffect(() => {
    if (!autoRefresh || !trackingId) return;
    const interval = setInterval(() => fetchOrder(trackingId, true), 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, trackingId]);

  const fetchOrder = async (id, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API}/api/pharmacy/orders/${id}/live-tracking`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setOrder(data);
          setAutoRefresh(data.is_live_tracking);
        }
      }
    } catch (e) {
      console.error('Tracking fetch error:', e);
    }
    if (!silent) setLoading(false);
  };

  const isLive = order?.is_live_tracking;

  return (
    <div className="min-h-screen pb-24" style={{ background: '#F7FAF9' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(180deg, #1F4F46 0%, #2A6B5E 100%)' }} className="px-4 pt-4 pb-6">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-white/10" data-testid="back-btn">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-bold text-white">Track Order</h1>
          {isLive && (
            <span className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-300 font-medium">LIVE</span>
            </span>
          )}
        </div>

        <div className="relative">
          <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            value={trackingId}
            onChange={e => setTrackingId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchOrder(trackingId)}
            placeholder="Enter Order ID"
            className="w-full h-11 pl-10 pr-20 rounded-xl text-sm bg-white/10 text-white placeholder-white/40 outline-none border border-white/10"
            data-testid="tracking-input"
          />
          <Button onClick={() => fetchOrder(trackingId)}
            className="absolute right-1 top-1 h-9 px-4 rounded-lg text-xs font-bold"
            style={{ background: '#F4A43A' }}
            data-testid="track-btn">
            Track
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-3 border-[#1F4F46] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : order ? (
        <div className="px-4 -mt-2">
          {/* Live Map */}
          {isLive && (
            <div className="rounded-2xl overflow-hidden mb-4 relative shadow-lg" style={{ height: 240, border: '1px solid rgba(31,79,70,0.1)' }} data-testid="map-container">
              <DeliveryMap
                currentLocation={order.current_location}
                pharmacyLocation={order.pharmacy_location}
                deliveryLocation={order.delivery_location}
                routeTrail={order.route_trail}
                driverName={order.driver?.name}
              />
              {/* Refresh overlay */}
              <button onClick={() => fetchOrder(trackingId, true)}
                className="absolute top-3 right-3 p-2 rounded-full bg-white shadow-md z-[1000]"
                data-testid="refresh-map-btn">
                <RefreshCw className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          )}

          {/* Non-live map placeholder */}
          {!isLive && ['shipped', 'out_for_delivery'].includes(order.status) && (
            <div className="rounded-2xl overflow-hidden h-40 relative mb-4" style={{
              background: 'linear-gradient(135deg, #e8f5f0 0%, #d4ece5 100%)',
              border: '1px solid rgba(31,79,70,0.08)',
            }}>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <MapPin className="w-8 h-8 text-[#1F4F46] animate-bounce" />
                <p className="text-sm text-[#4A6B64] font-medium mt-2">Delivery in progress</p>
                <p className="text-xs text-[#8A9E99] mt-1">Live map activates when driver shares location</p>
              </div>
            </div>
          )}

          {/* Order Summary */}
          <div className="rounded-2xl p-4 bg-white shadow-sm" style={{ border: '1px solid rgba(31,79,70,0.06)' }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-[#8A9E99]">Order ID</p>
                <p className="font-bold text-[#1A2B28]" data-testid="order-id">{order.order_id}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                ['completed','delivered'].includes(order.status) ? 'bg-emerald-50 text-emerald-600' :
                ['out_for_delivery','shipped'].includes(order.status) ? 'bg-blue-50 text-blue-600' :
                'bg-amber-50 text-amber-600'
              }`} data-testid="order-status-badge">
                {order.status_label || order.status?.replace(/_/g, ' ')}
              </span>
            </div>

            {order.items?.length > 0 && (
              <div className="space-y-2 mb-3 pt-3" style={{ borderTop: '1px solid #f0f0f0' }}>
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-[#4A6B64]">{item.name} x{item.qty}</span>
                    <span className="font-medium text-[#1A2B28]">{item.price > 0 ? `\u20B9${item.price}` : ''}</span>
                  </div>
                ))}
                {order.total_amount > 0 && (
                  <div className="flex justify-between text-sm font-bold pt-2" style={{ borderTop: '1px dashed #e0e0e0' }}>
                    <span className="text-[#1A2B28]">Total</span>
                    <span className="text-[#1F4F46]">{'\u20B9'}{order.total_amount}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step Tracker */}
          <div className="mt-4 rounded-2xl p-5 bg-white shadow-sm" style={{ border: '1px solid rgba(31,79,70,0.06)' }}>
            <h3 className="font-bold text-[#1A2B28] mb-3">Order Progress</h3>
            <StepTracker currentStep={order.status} />
          </div>

          {/* Driver Card */}
          {isLive && order.driver && (
            <DriverCard driver={order.driver} lastUpdated={order.last_updated} />
          )}
        </div>
      ) : (
        <div className="text-center py-20 px-6">
          <Truck className="w-14 h-14 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">Enter your order ID to track</p>
          <p className="text-sm text-gray-400 mt-1">You'll see real-time delivery updates with live map</p>
        </div>
      )}
    </div>
  );
}

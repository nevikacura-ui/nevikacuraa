import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Truck, Phone, Clock, Package, RefreshCw, Loader2, Navigation, User, ChevronDown } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;
const getAuth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('staffToken')}` } });

const OrangeDeliveryDashboard = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef({});
  const leafletRef = useRef(null);

  const fetchDeliveries = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`${API}/api/pharmacy/delivery/active`, getAuth());
      if (res.ok) {
        const data = await res.json();
        setDeliveries(data.deliveries || []);
        updateMapMarkers(data.deliveries || []);
      }
    } catch (e) {
      console.error('Failed to fetch deliveries:', e);
    }
    if (!silent) setLoading(false);
  }, []);

  useEffect(() => { fetchDeliveries(); }, [fetchDeliveries]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => fetchDeliveries(true), 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchDeliveries]);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    const initMap = async () => {
      const L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');

      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([19.3750, 72.8480], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapInstance.current = map;
      leafletRef.current = L;
    };

    initMap();
    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, []);

  const updateMapMarkers = (deliveryList) => {
    const L = leafletRef.current;
    const map = mapInstance.current;
    if (!L || !map) return;

    // Remove old markers
    Object.values(markersRef.current).forEach(m => map.removeLayer(m));
    markersRef.current = {};

    const allPoints = [];

    deliveryList.forEach((d) => {
      if (!d.current_location) return;
      const { lat, lng } = d.current_location;
      allPoints.push([lat, lng]);

      const icon = L.divIcon({
        className: 'delivery-marker',
        html: `<div style="position:relative">
          <div style="width:40px;height:40px;background:linear-gradient(135deg,#F97316,#EA580C);border-radius:50%;border:3px solid #fff;box-shadow:0 3px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;cursor:pointer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          </div>
          <div style="position:absolute;top:-8px;left:50%;transform:translateX(-50%);background:#1F2937;color:#fff;font-size:9px;font-weight:700;padding:1px 5px;border-radius:4px;white-space:nowrap">#${d.order_id}</div>
        </div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const marker = L.marker([lat, lng], { icon }).addTo(map);
      marker.on('click', () => setSelected(d));
      markersRef.current[d.order_id] = marker;

      // Also show delivery destination
      if (d.delivery_location) {
        const destIcon = L.divIcon({
          className: 'dest-marker',
          html: `<div style="width:24px;height:24px;background:#10B981;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
          </div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
        L.marker([d.delivery_location.lat, d.delivery_location.lng], { icon: destIcon }).addTo(map);
        allPoints.push([d.delivery_location.lat, d.delivery_location.lng]);

        // Draw dotted line from driver to destination
        L.polyline([[lat, lng], [d.delivery_location.lat, d.delivery_location.lng]], {
          color: '#F97316', weight: 2, opacity: 0.5, dashArray: '6, 6'
        }).addTo(map);
      }
    });

    if (allPoints.length > 1) {
      map.fitBounds(allPoints, { padding: [40, 40] });
    } else if (allPoints.length === 1) {
      map.setView(allPoints[0], 15);
    }
  };

  const timeAgo = (ts) => {
    if (!ts) return '--';
    const diff = (Date.now() - new Date(ts).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div className="h-full flex flex-col" data-testid="delivery-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between px-1 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#F97316,#EA580C)' }}>
            <Navigation className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-800">Live Deliveries</h2>
            <p className="text-[10px] text-gray-400">{deliveries.length} active</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-colors ${autoRefresh ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}
            data-testid="auto-refresh-toggle">
            {autoRefresh ? 'Auto 15s' : 'Paused'}
          </button>
          <button onClick={() => fetchDeliveries()} className="p-1.5 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100" data-testid="refresh-deliveries">
            <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="rounded-2xl overflow-hidden relative mb-3 border border-gray-200" style={{ height: 300 }} data-testid="deliveries-map">
        {loading && (
          <div className="absolute inset-0 bg-white/80 z-[500] flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          </div>
        )}
        <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
      </div>

      {/* Selected Delivery Card */}
      {selected && (
        <div className="mb-3 rounded-2xl p-4 border-2 border-orange-200 bg-orange-50/50" data-testid="selected-delivery">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-orange-600" />
              <span className="font-bold text-sm text-gray-800">Order #{selected.order_id}</span>
            </div>
            <button onClick={() => setSelected(null)} className="text-xs text-gray-400 hover:text-gray-600">Close</button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-gray-400">Driver</p>
              <p className="font-semibold text-gray-700">{selected.driver_name}</p>
            </div>
            <div>
              <p className="text-gray-400">Customer</p>
              <p className="font-semibold text-gray-700">{selected.customer_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-400">ETA</p>
              <p className="font-semibold text-gray-700">{selected.estimated_minutes} mins</p>
            </div>
            <div>
              <p className="text-gray-400">Last Update</p>
              <p className="font-semibold text-gray-700">{timeAgo(selected.last_updated)}</p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-400">Address</p>
              <p className="font-semibold text-gray-700">{selected.address || 'N/A'}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <a href={`tel:${selected.driver_phone}`} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-100 text-orange-700 text-xs font-semibold no-underline" data-testid="call-driver">
              <Phone className="w-3 h-3" /> Call Driver
            </a>
            <a href={`${window.location.origin}/live-tracking?id=${selected.order_id}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 text-xs font-semibold no-underline" data-testid="view-customer-tracking">
              <MapPin className="w-3 h-3" /> Customer View
            </a>
          </div>
        </div>
      )}

      {/* Delivery List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {deliveries.length === 0 && !loading && (
          <div className="text-center py-10">
            <Truck className="w-10 h-10 mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400 font-medium">No active deliveries</p>
            <p className="text-xs text-gray-300 mt-1">Assigned deliveries will appear here with live GPS</p>
          </div>
        )}
        {deliveries.map((d) => (
          <button key={d.order_id} onClick={() => { setSelected(d); }}
            className={`w-full text-left p-3 rounded-xl border transition-all ${selected?.order_id === d.order_id ? 'border-orange-300 bg-orange-50' : 'border-gray-100 bg-white hover:border-orange-200'}`}
            data-testid={`delivery-card-${d.order_id}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Truck className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800">#{d.order_id}</p>
                  <p className="text-[10px] text-gray-400">{d.driver_name} &middot; {d.item_count} items</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-orange-600">{d.estimated_minutes}m</p>
                <p className="text-[10px] text-gray-400">{timeAgo(d.last_updated)}</p>
              </div>
            </div>
            {d.customer_name && (
              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-50 text-[10px] text-gray-400">
                <User className="w-3 h-3" />
                <span className="truncate">{d.customer_name}</span>
                <span className="mx-1">&middot;</span>
                <span className="truncate flex-1">{d.address}</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default OrangeDeliveryDashboard;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';
import {
  ArrowLeft, MapPin, Search, Pill, Stethoscope, Building2,
  FlaskConical, Droplets, Ambulance, Phone, Clock, Star,
  Navigation, AlertTriangle, Loader2, ChevronRight, Shield
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';

const API = process.env.REACT_APP_BACKEND_URL;

const SERVICE_TYPES = [
  { id: 'all', label: 'All', icon: MapPin, color: '#8B5CF6' },
  { id: 'pharmacy', label: 'Pharmacy', icon: Pill, color: '#F97316' },
  { id: 'clinic', label: 'Clinic', icon: Stethoscope, color: '#06B6D4' },
  { id: 'hospital', label: 'Hospital', icon: Building2, color: '#EF4444' },
  { id: 'lab', label: 'Lab', icon: FlaskConical, color: '#10B981' },
  { id: 'blood_bank', label: 'Blood Bank', icon: Droplets, color: '#DC2626' },
  { id: 'ambulance', label: 'Ambulance', icon: Ambulance, color: '#F59E0B' },
];

const TYPE_ICON_MAP = {
  pharmacy: Pill, clinic: Stethoscope, hospital: Building2,
  lab: FlaskConical, blood_bank: Droplets, ambulance: Ambulance,
};

const HyperlocalPage = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedType, setSelectedType] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => { detectLocation(); }, []);
  useEffect(() => { fetchServices(); }, [selectedType, location]);

  const detectLocation = () => {
    setLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
        () => { setLocation({ lat: 19.3691, lng: 72.8304 }); setLocating(false); }, // Default: Vasai
        { timeout: 5000 }
      );
    } else {
      setLocation({ lat: 19.3691, lng: 72.8304 });
      setLocating(false);
    }
  };

  const fetchServices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (location) { params.set('lat', location.lat); params.set('lng', location.lng); }
      if (selectedType !== 'all') params.set('type', selectedType);
      params.set('radius', '25');

      const [servicesRes, statsRes] = await Promise.all([
        axios.get(`${API}/api/hyperlocal/services?${params}`),
        axios.get(`${API}/api/hyperlocal/stats`),
      ]);
      setServices(servicesRes.data.services || []);
      setStats(statsRes.data);
    } catch {
      toast.error('Failed to load services');
    }
    setLoading(false);
  };

  const filtered = services.filter(s =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.area?.toLowerCase().includes(search.toLowerCase())
  );

  const emergencyServices = services.filter(s => s.emergency_available);

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0A0A12' }} data-testid="hyperlocal-page">
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-3" style={{ background: 'rgba(10,10,18,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-base text-white flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-purple-400" /> Nearby Health Services
            </h1>
            <p className="text-[11px] text-gray-500">
              {locating ? 'Detecting location...' : location ? 'Services near you' : 'Using default location'}
            </p>
          </div>
          <button onClick={detectLocation} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.15)' }}>
            <Navigation className="w-4 h-4 text-purple-400" />
          </button>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search pharmacies, hospitals, labs..."
            className="pl-10 h-11 bg-white/5 border-white/10 text-white placeholder:text-gray-500 rounded-xl"
            data-testid="search-input" />
        </div>

        {/* Emergency Banner */}
        {emergencyServices.length > 0 && (
          <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-red-300">Emergency Services Available</p>
              <p className="text-[10px] text-red-400/70">{emergencyServices.length} emergency-ready services nearby</p>
            </div>
            <a href="tel:112" className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white">Call 112</a>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Total', val: stats.total_services, color: '#8B5CF6' },
              { label: 'Hospitals', val: stats.hospitals, color: '#EF4444' },
              { label: 'Pharmacies', val: stats.pharmacies, color: '#F97316' },
            ].map((s, i) => (
              <div key={i} className="p-2.5 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p className="text-lg font-bold text-white">{s.val}</p>
                <p className="text-[10px]" style={{ color: s.color }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Type Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
          {SERVICE_TYPES.map(t => (
            <button key={t.id} onClick={() => setSelectedType(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition ${
                selectedType === t.id ? 'text-white' : 'text-gray-400'
              }`}
              style={{
                background: selectedType === t.id ? `${t.color}25` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${selectedType === t.id ? `${t.color}50` : 'rgba(255,255,255,0.06)'}`,
              }}
              data-testid={`filter-${t.id}`}>
              <t.icon className="w-3.5 h-3.5" style={{ color: selectedType === t.id ? t.color : undefined }} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Service Cards */}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-10 h-10 text-gray-700 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No services found nearby</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((svc, i) => {
              const TypeIcon = TYPE_ICON_MAP[svc.type] || MapPin;
              const typeConfig = SERVICE_TYPES.find(t => t.id === svc.type) || SERVICE_TYPES[0];
              return (
                <div key={i} className="p-3.5 rounded-xl transition-all active:scale-[0.99]"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  data-testid={`service-card-${i}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `${typeConfig.color}15` }}>
                      <TypeIcon className="w-5 h-5" style={{ color: typeConfig.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-white truncate">{svc.name}</h3>
                        {svc.emergency_available && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400 shrink-0">24/7</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{svc.address}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        {svc.distance_km != null && (
                          <span className="flex items-center gap-1 text-[11px] text-purple-400">
                            <Navigation className="w-3 h-3" /> {svc.distance_km} km
                          </span>
                        )}
                        {svc.rating && (
                          <span className="flex items-center gap-1 text-[11px] text-amber-400">
                            <Star className="w-3 h-3 fill-current" /> {svc.rating}
                          </span>
                        )}
                        {svc.open_hours && (
                          <span className="flex items-center gap-1 text-[11px] text-gray-500">
                            <Clock className="w-3 h-3" /> {svc.open_hours}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Services tags */}
                  {svc.services?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 pl-13">
                      {svc.services.slice(0, 4).map((s, j) => (
                        <span key={j} className="px-2 py-0.5 rounded-full text-[10px] text-gray-400"
                          style={{ background: 'rgba(255,255,255,0.04)' }}>
                          {s.replace(/_/g, ' ')}
                        </span>
                      ))}
                      {svc.services.length > 4 && (
                        <span className="text-[10px] text-gray-600">+{svc.services.length - 4}</span>
                      )}
                    </div>
                  )}
                  {/* Call & Maps buttons */}
                  <div className="mt-2 pl-13 flex gap-2">
                    {svc.phone && (
                      <a href={`tel:${svc.phone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-400"
                        style={{ background: 'rgba(16,185,129,0.1)' }}
                        data-testid={`call-${i}`}>
                        <Phone className="w-3 h-3" /> Call
                      </a>
                    )}
                    <a href={svc.google_maps_link || `https://maps.google.com/?q=${encodeURIComponent(svc.name + ' ' + svc.address)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-blue-400"
                      style={{ background: 'rgba(59,130,246,0.1)' }}
                      data-testid={`maps-${i}`}>
                      <Navigation className="w-3 h-3" /> Map
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default HyperlocalPage;

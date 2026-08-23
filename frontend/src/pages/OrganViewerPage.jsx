import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, ChevronRight, TestTube, AlertCircle, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ServiceHeader from '@/components/ServiceHeader';
import BottomNav from '@/components/BottomNav';

const API = process.env.REACT_APP_BACKEND_URL;

// SVG organ coordinates (relative to a 200x400 viewbox body outline)
const ORGAN_POSITIONS = {
  brain:        { x: 100, y: 28, r: 18, color: '#A78BFA' },
  eyes:         { x: 100, y: 50, r: 10, color: '#60A5FA' },
  thyroid:      { x: 100, y: 80, r: 12, color: '#2DD4BF' },
  heart:        { x: 88,  y: 130, r: 16, color: '#F43F5E' },
  lungs:        { x: 112, y: 125, r: 20, color: '#38BDF8' },
  liver:        { x: 75,  y: 168, r: 16, color: '#F97316' },
  stomach:      { x: 108, y: 175, r: 14, color: '#FBBF24' },
  pancreas:     { x: 95,  y: 195, r: 12, color: '#A3E635' },
  kidneys:      { x: 100, y: 210, r: 14, color: '#FB923C' },
  reproductive: { x: 100, y: 250, r: 14, color: '#F472B6' },
  bones:        { x: 55,  y: 300, r: 14, color: '#94A3B8' },
  blood:        { x: 145, y: 300, r: 14, color: '#EF4444' },
};

const OrganViewerPage = () => {
  const navigate = useNavigate();
  const [organMap, setOrganMap] = useState({});
  const [selectedOrgan, setSelectedOrgan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/family-vault/organ-map`)
      .then(r => r.json())
      .then(d => setOrganMap(d.organs || {}))
      .catch(() => toast.error('Failed to load organ data'))
      .finally(() => setLoading(false));
  }, []);

  const handleOrganClick = (organKey) => {
    setSelectedOrgan(organKey === selectedOrgan ? null : organKey);
  };

  const organData = selectedOrgan ? organMap[selectedOrgan] : null;
  const pos = selectedOrgan ? ORGAN_POSITIONS[selectedOrgan] : null;

  return (
    <div className="min-h-screen bg-[#0a0b14]" data-testid="organ-viewer-page">
      <ServiceHeader />
      <main className="max-w-lg mx-auto px-4 py-5 pb-28">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5" data-testid="organ-back-btn">
            <ArrowLeft className="w-5 h-5 text-white/70" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Body Health Map</h1>
            <p className="text-xs text-white/40">Tap an organ to explore related tests</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-5">
            {/* Body SVG */}
            <div className="relative mx-auto" style={{ width: '220px' }}>
              <svg viewBox="0 0 200 400" className="w-full" style={{ filter: 'drop-shadow(0 0 20px rgba(20,184,166,0.1))' }}>
                {/* Body silhouette */}
                <path
                  d="M100,8 C115,8 125,20 125,35 C125,50 115,58 100,58 C85,58 75,50 75,35 C75,20 85,8 100,8 Z
                     M70,65 L50,75 L30,120 L40,125 L55,100 L60,140 L55,200 L50,280 L40,350 L55,355 L70,280 L80,250 L100,270
                     L120,250 L130,280 L145,355 L160,350 L150,280 L145,200 L140,140 L145,100 L160,125 L170,120 L150,75 L130,65 Z"
                  fill="rgba(255,255,255,0.03)"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="1"
                />

                {/* Organ hotspots */}
                {Object.entries(ORGAN_POSITIONS).map(([key, p]) => {
                  const isSelected = selectedOrgan === key;
                  return (
                    <g key={key} onClick={() => handleOrganClick(key)} className="cursor-pointer" data-testid={`organ-${key}`}>
                      {/* Pulse ring when selected */}
                      {isSelected && (
                        <circle cx={p.x} cy={p.y} r={p.r + 6} fill="none" stroke={p.color} strokeWidth="1" opacity="0.3">
                          <animate attributeName="r" from={p.r + 2} to={p.r + 10} dur="1.5s" repeatCount="indefinite" />
                          <animate attributeName="opacity" from="0.5" to="0" dur="1.5s" repeatCount="indefinite" />
                        </circle>
                      )}
                      {/* Organ circle */}
                      <circle
                        cx={p.x} cy={p.y} r={p.r}
                        fill={isSelected ? p.color : `${p.color}30`}
                        stroke={p.color}
                        strokeWidth={isSelected ? 2 : 1}
                        opacity={isSelected ? 1 : 0.7}
                        style={{ transition: 'all 0.3s ease' }}
                      />
                      {/* Label */}
                      <text
                        x={p.x} y={p.y + 3}
                        textAnchor="middle"
                        fill={isSelected ? '#fff' : p.color}
                        fontSize="7"
                        fontWeight="600"
                        style={{ pointerEvents: 'none', textTransform: 'capitalize' }}
                      >
                        {key.length > 6 ? key.slice(0, 5) : key}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Organ Detail Panel */}
            <div className="flex-1 min-w-0">
              {!selectedOrgan ? (
                <div className="text-center py-8">
                  <Activity className="w-10 h-10 text-white/10 mx-auto mb-3" />
                  <p className="text-sm text-white/30">Select an organ on the body map</p>
                  <p className="text-xs text-white/15 mt-1">to see related tests and conditions</p>
                </div>
              ) : organData ? (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  {/* Organ Title */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${pos?.color}20` }}>
                        <Activity className="w-5 h-5" style={{ color: pos?.color }} />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-white">{organData.label}</h2>
                        <p className="text-[10px] text-white/30">{organData.tests?.length || 0} tests available</p>
                      </div>
                    </div>
                    <button onClick={() => setSelectedOrgan(null)} className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center">
                      <X className="w-3.5 h-3.5 text-white/40" />
                    </button>
                  </div>

                  {/* Related Tests */}
                  <div className="mb-4">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2 font-semibold">Related Tests</p>
                    <div className="space-y-1.5">
                      {organData.tests?.map((test, i) => (
                        <button
                          key={i}
                          onClick={() => navigate(`/mango?search=${encodeURIComponent(test)}`)}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/8 transition-all text-left active:scale-[0.98]"
                          data-testid={`test-${i}`}
                        >
                          <TestTube className="w-4 h-4 flex-shrink-0" style={{ color: pos?.color }} />
                          <span className="text-sm text-white/80 flex-1">{test}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-white/20" />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Common Conditions */}
                  <div>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2 font-semibold">Common Conditions</p>
                    <div className="flex flex-wrap gap-1.5">
                      {organData.conditions?.map((cond, i) => (
                        <span key={i} className="px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ background: `${pos?.color}12`, color: pos?.color, border: `1px solid ${pos?.color}20` }}>
                          {cond}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Book Test CTA */}
                  <Button
                    onClick={() => navigate('/mango')}
                    className="w-full h-10 mt-5 rounded-xl font-semibold text-sm"
                    style={{ background: pos?.color }}
                    data-testid="book-test-btn"
                  >
                    <TestTube className="w-4 h-4 mr-2" /> Book Test at Mango Labs
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default OrganViewerPage;

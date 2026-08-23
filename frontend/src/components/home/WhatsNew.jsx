import { useNavigate } from 'react-router-dom';
import { Video, Trophy, Brain, Watch, MapPin, Crown, Sparkles } from 'lucide-react';

const features = [
  { path: '/video-consult', icon: Video, label: 'Video Consult', desc: 'HD video calls with doctors', grad: 'linear-gradient(135deg, #3B82F6 0%, #6366F1 100%)', iconBg: 'rgba(255,255,255,0.25)' },
  { path: '/health-assistant', icon: Brain, label: 'CuraBot AI', desc: 'AI health assistant', grad: 'linear-gradient(135deg, #8B5CF6 0%, #D946EF 100%)', iconBg: 'rgba(255,255,255,0.25)' },
  { path: '/health-streaks', icon: Trophy, label: 'Health Streaks', desc: 'Daily streaks & badges', grad: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)', iconBg: 'rgba(255,255,255,0.25)' },
  { path: '/nearby', icon: MapPin, label: 'Nearby Services', desc: 'Find clinics & labs', grad: 'linear-gradient(135deg, #EF4444 0%, #F97316 100%)', iconBg: 'rgba(255,255,255,0.25)' },
  { path: '/wearables', icon: Watch, label: 'Wearables', desc: 'Sync your fitness data', grad: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)', iconBg: 'rgba(255,255,255,0.25)' },
  { path: '/cura-one', icon: Crown, label: 'CuraOne', desc: 'Health plans & perks', grad: 'linear-gradient(135deg, #F97316 0%, #FBBF24 100%)', iconBg: 'rgba(255,255,255,0.25)' },
];

export default function WhatsNew() {
  const navigate = useNavigate();

  return (
    <div className="mb-5" data-testid="whats-new-section">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <h2 className="text-sm font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>What's New</h2>
        </div>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-1.5 -mx-1 px-1 scrollbar-hide" style={{ scrollSnapType: 'x mandatory' }}>
        {features.map((f, i) => (
          <button
            key={f.path}
            onClick={() => navigate(f.path)}
            className="flex-shrink-0 w-[140px] rounded-2xl p-3 text-left active:scale-[0.95] transition-all duration-200 shadow-lg"
            style={{
              background: f.grad,
              scrollSnapAlign: 'start',
            }}
            data-testid={`whats-new-${f.path.slice(1)}`}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center mb-2"
              style={{ background: f.iconBg }}
            >
              <f.icon className="w-[18px] h-[18px] text-white" />
            </div>
            <p className="text-[11px] font-bold text-white leading-tight mb-0.5">{f.label}</p>
            <p className="text-[9px] text-white/70 leading-tight">{f.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

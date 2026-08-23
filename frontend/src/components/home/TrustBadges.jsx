import React from 'react';
import { Shield, Stethoscope, Home, Clock } from 'lucide-react';

/**
 * Trust Badges Section - Dark theme matching header/page
 */
const TrustBadges = () => {
  const badges = [
    {
      id: 'trusted-labs',
      icon: Shield,
      title: 'Trusted &',
      subtitle: 'Accredited Labs',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'doctor-curated',
      icon: Stethoscope,
      title: 'Doctor',
      subtitle: 'Curated Packages',
      gradient: 'from-teal-500 to-emerald-500',
    },
    {
      id: 'home-sample',
      icon: Home,
      title: 'Home Sample',
      subtitle: 'Collection',
      gradient: 'from-pink-500 to-rose-500',
    },
    {
      id: 'fast-reports',
      icon: Clock,
      title: 'Accurate &',
      subtitle: 'Fast Reports',
      gradient: 'from-amber-500 to-orange-500',
    }
  ];

  return (
    <div className="py-5 bg-slate-900" data-testid="trust-badges-section">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className="flex flex-col items-center text-center min-w-[80px] flex-1 group cursor-pointer"
              data-testid={`trust-badge-${badge.id}`}
            >
              {/* Icon Container */}
              <div className="relative w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mb-2 border border-slate-700 transition-all duration-300 group-hover:scale-110 group-hover:border-slate-600">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${badge.gradient} flex items-center justify-center`}>
                  <badge.icon className="w-5 h-5 text-white" />
                </div>
              </div>
              {/* Text */}
              <p className="text-xs font-medium text-white/90 leading-tight">{badge.title}</p>
              <p className="text-xs font-medium text-white/60 leading-tight">{badge.subtitle}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrustBadges;

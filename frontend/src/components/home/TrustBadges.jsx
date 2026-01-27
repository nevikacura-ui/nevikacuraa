import React from 'react';
import { Shield, Stethoscope, Home, Clock } from 'lucide-react';

/**
 * Trust Badges Section - Based on reference screenshot
 * Shows: Trusted Labs, Doctor curated, Home Sample, Fast Reports
 */
const TrustBadges = () => {
  const badges = [
    {
      id: 'trusted-labs',
      icon: Shield,
      title: 'Trusted &',
      subtitle: 'Accredited Labs',
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'bg-blue-50'
    },
    {
      id: 'doctor-curated',
      icon: Stethoscope,
      title: 'Doctor',
      subtitle: 'Curated Packages',
      color: 'from-blue-600 to-blue-700',
      bgColor: 'bg-blue-50'
    },
    {
      id: 'home-sample',
      icon: Home,
      title: 'Home Sample',
      subtitle: 'Collection',
      color: 'from-pink-500 to-rose-500',
      bgColor: 'bg-pink-50'
    },
    {
      id: 'fast-reports',
      icon: Clock,
      title: 'Accurate &',
      subtitle: 'Fast Reports',
      color: 'from-orange-500 to-amber-500',
      bgColor: 'bg-orange-50'
    }
  ];

  return (
    <div className="py-4 border-t border-b border-slate-100 bg-white/50 backdrop-blur-sm" data-testid="trust-badges-section">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className="flex flex-col items-center text-center min-w-[80px] flex-1"
              data-testid={`trust-badge-${badge.id}`}
            >
              {/* Icon Container */}
              <div className={`w-14 h-14 rounded-2xl ${badge.bgColor} flex items-center justify-center mb-2 shadow-sm`}>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${badge.color} flex items-center justify-center`}>
                  <badge.icon className="w-5 h-5 text-white" />
                </div>
              </div>
              {/* Text */}
              <p className="text-xs font-medium text-slate-700 leading-tight">{badge.title}</p>
              <p className="text-xs font-medium text-slate-700 leading-tight">{badge.subtitle}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrustBadges;

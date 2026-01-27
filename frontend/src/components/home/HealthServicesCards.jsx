import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Stethoscope, Shield, Sparkles, TrendingUp } from 'lucide-react';

/**
 * Health Services Cards - Insurance, Adult Vaccines, Health Insights
 * Based on reference screenshot
 */
const HealthServicesCards = () => {
  const navigate = useNavigate();

  const services = [
    {
      id: 'consults',
      name: 'Consults',
      description: 'Talk to a doctor',
      icon: Stethoscope,
      path: '/teleconsult',
      gradient: 'from-teal-500 to-cyan-500',
      bgGradient: 'from-teal-50 to-cyan-50'
    },
    {
      id: 'vaccines',
      name: 'Adult Vaccines',
      description: 'Stay protected',
      icon: Shield,
      path: '/proton?category=vaccines',
      gradient: 'from-purple-500 to-violet-500',
      bgGradient: 'from-purple-50 to-violet-50'
    },
    {
      id: 'insurance',
      name: 'Insurance',
      description: 'Starting ₹2/day',
      icon: Shield,
      path: '/features',
      gradient: 'from-red-500 to-rose-500',
      bgGradient: 'from-red-50 to-rose-50',
      badge: 'New'
    },
    {
      id: 'health-insights',
      name: 'Health Insights',
      description: 'Track your health',
      icon: TrendingUp,
      path: '/health-dashboard',
      gradient: 'from-emerald-500 to-green-500',
      bgGradient: 'from-emerald-50 to-green-50'
    }
  ];

  return (
    <div className="py-4" data-testid="health-services-cards-section">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {services.map((service) => (
          <button
            key={service.id}
            onClick={() => navigate(service.path)}
            className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${service.bgGradient} border border-white/50 p-4 flex flex-col items-center justify-center min-h-[120px] transition-all duration-300 hover:scale-105 hover:shadow-lg group`}
            data-testid={`health-service-${service.id}`}
          >
            {/* Badge */}
            {service.badge && (
              <span className="absolute top-2 right-2 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-bold rounded-full flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" />
                {service.badge}
              </span>
            )}

            {/* Icon */}
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${service.gradient} flex items-center justify-center mb-2 shadow-md group-hover:scale-110 transition-transform`}>
              <service.icon className="w-6 h-6 text-white" />
            </div>
            
            {/* Text */}
            <span className="text-sm font-semibold text-slate-800">{service.name}</span>
            <span className="text-xs text-slate-500">{service.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default HealthServicesCards;

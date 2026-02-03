import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

/**
 * Service Tiles Section - Existing Services Only
 * DiaGyn - Consultation, Orange - Pharmacy, Proton - Diagnostic
 */
const ServiceTiles = () => {
  const navigate = useNavigate();

  const services = [
    {
      id: 'pharmacy',
      name: 'Orange Pharmacy',
      subtitle: 'Medicines & Wellness',
      path: '/pharmacy',
      image: 'https://customer-assets.emergentagent.com/job_f5403b1d-d7a8-45c0-83cb-7e33d189f13d/artifacts/n45xwyrx_3_20260107_021040_0000.jpg',
      gradient: 'from-orange-100 to-amber-50',
      borderColor: 'border-orange-200'
    },
    {
      id: 'mango',
      name: 'Mango Health Labs',
      subtitle: 'Lab Tests & Packages',
      path: '/mango',
      image: 'https://customer-assets.emergentagent.com/job_orange-mango/artifacts/3n17yxpx_mango-logo.png',
      gradient: 'from-orange-100 to-amber-50',
      borderColor: 'border-orange-200'
    },
    {
      id: 'diagyn',
      name: 'DiaGyn',
      subtitle: 'Doctor Consultations',
      path: '/diagyn',
      image: 'https://customer-assets.emergentagent.com/job_f5403b1d-d7a8-45c0-83cb-7e33d189f13d/artifacts/e4jrn2os_6_20260107_021040_0003.jpg',
      gradient: 'from-teal-100 to-cyan-50',
      borderColor: 'border-teal-200'
    },
    {
      id: 'evara',
      name: 'Evara',
      subtitle: "Women's Wellness",
      path: '/evara',
      badge: 'Evara',
      gradient: 'from-pink-100 to-rose-50',
      borderColor: 'border-pink-200',
      icon: '👩‍⚕️'
    }
  ];

  return (
    <div className="py-6" data-testid="service-tiles-section">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800">Our Services</h2>
        <button 
          onClick={() => navigate('/features')}
          className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
        >
          View All
          <Sparkles className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {services.map((service) => (
          <button
            key={service.id}
            onClick={() => navigate(service.path)}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${service.gradient} border ${service.borderColor} p-4 h-32 flex flex-col items-center justify-center transition-all duration-300 hover:scale-105 hover:shadow-lg group`}
            data-testid={`service-tile-${service.id}`}
          >
            {/* Badge */}
            {service.badge && (
              <span className="absolute top-2 right-2 px-2 py-0.5 bg-pink-500 text-white text-[10px] font-bold rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {service.badge}
              </span>
            )}

            {/* Service Image or Icon */}
            {service.image ? (
              <img 
                src={service.image} 
                alt={service.name}
                className="h-14 w-auto object-contain mb-2 group-hover:scale-110 transition-transform duration-300"
              />
            ) : (
              <span className="text-4xl mb-2 group-hover:scale-110 transition-transform duration-300">{service.icon}</span>
            )}

            {/* Service Name */}
            <span className="text-sm font-semibold text-slate-700">{service.name}</span>
            <span className="text-[10px] text-slate-500">{service.subtitle}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ServiceTiles;

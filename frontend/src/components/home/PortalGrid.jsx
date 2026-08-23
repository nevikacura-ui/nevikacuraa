import React from 'react';
import { useNavigate } from 'react-router-dom';

const PortalGrid = ({ services }) => {
  const navigate = useNavigate();
  
  return (
    <div className="mb-16">
      <h2 className="text-xl font-bold text-white mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>More Portals</h2>
      
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {services.map((service) => (
          <div
            key={service.id}
            className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.03] shadow-lg"
            onClick={() => navigate(service.path)}
            data-testid={`service-card-${service.id}`}
          >
            {/* Logo fills entire square - no padding */}
            <div 
              className="aspect-square flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: service.bgColor }}
            >
              <img 
                src={service.logo} 
                alt={service.name} 
                className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                data-testid={`service-logo-${service.id}`}
                loading="lazy"
              />
            </div>
            {/* Explore button below the logo with gradient */}
            <div className="bg-gradient-to-r from-[#1a1a2e] via-[#16213e] to-[#0f3460] py-2.5 flex justify-center border-t border-white/10 group-hover:from-[#16213e] group-hover:via-[#1a1a3e] group-hover:to-[#0f4060] transition-all">
              <span className="text-[10px] sm:text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 group-hover:from-cyan-300 group-hover:via-teal-200 group-hover:to-emerald-300 transition-all tracking-wide uppercase">
                Explore
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PortalGrid;

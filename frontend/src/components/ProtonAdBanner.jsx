import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/**
 * Mango Health Labs Promotional Banner
 * Displays on DiaGyn, Evara, Glydex, Orange Pharmacy pages
 * Orange/Amber theme to match Mango branding
 */
const ProtonAdBanner = () => {
  const navigate = useNavigate();

  return (
    <div 
      className="mx-4 my-4 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 rounded-3xl overflow-hidden shadow-lg border border-orange-100 cursor-pointer hover:shadow-xl transition-all"
      onClick={() => navigate('/mango')}
      data-testid="mango-ad-banner"
    >
      <div className="flex items-center justify-between p-5">
        {/* Left Content */}
        <div className="flex-1">
          {/* NEW Badge + Brand */}
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-orange-500 text-white text-xs font-bold px-2.5 py-1 rounded-md">
              NEW
            </span>
            <span className="text-orange-600 font-bold text-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>
              mango
            </span>
            <span className="text-amber-600 font-medium text-lg">
              health labs
            </span>
          </div>

          {/* Main Headline */}
          <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3 leading-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Trusted lab tests<br />in 60 mins
          </h3>

          {/* Coupon Code */}
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-orange-100 text-orange-700 font-bold text-sm px-3 py-1.5 rounded-lg border border-orange-200">
              MANGO15
            </span>
            <span className="text-slate-600 text-sm">
              Get flat <span className="font-bold text-orange-600">15% off</span> on all orders
            </span>
          </div>

          {/* CTA Button */}
          <button 
            className="bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 hover:from-orange-600 hover:to-amber-600 transition-colors shadow-md"
            onClick={(e) => {
              e.stopPropagation();
              navigate('/mango');
            }}
          >
            Book now
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Right - Person Image */}
        <div className="hidden sm:block relative">
          <img 
            src="https://images.unsplash.com/photo-1653379670999-f7f03d702125?w=300&h=300&fit=crop" 
            alt="Happy patient"
            className="w-32 h-32 md:w-40 md:h-40 object-cover rounded-2xl"
          />
        </div>
      </div>

      {/* Powered By Footer */}
      <div className="bg-white/60 backdrop-blur-sm px-5 py-2 border-t border-orange-100">
        <p className="text-sm text-slate-500">
          Powered by <span className="font-bold text-orange-600">Mango</span><span className="font-bold text-amber-600">HealthLabs</span>
        </p>
      </div>
    </div>
  );
};

export default ProtonAdBanner;

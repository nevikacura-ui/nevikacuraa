import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/**
 * Proton Diagnostics Promotional Banner
 * Displays on DiaGyn, Evara, Glydex, Orange Pharmacy pages
 * Purple/Pink theme to match Proton branding
 */
const ProtonAdBanner = () => {
  const navigate = useNavigate();

  return (
    <div 
      className="mx-4 my-4 bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 rounded-3xl overflow-hidden shadow-lg border border-purple-100 cursor-pointer hover:shadow-xl transition-all"
      onClick={() => navigate('/proton')}
      data-testid="proton-ad-banner"
    >
      <div className="flex items-center justify-between p-5">
        {/* Left Content */}
        <div className="flex-1">
          {/* NEW Badge + Brand */}
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-pink-500 text-white text-xs font-bold px-2.5 py-1 rounded-md">
              NEW
            </span>
            <span className="text-purple-600 font-bold text-lg" style={{ fontFamily: 'Outfit, sans-serif' }}>
              proton
            </span>
            <span className="text-pink-500 font-medium text-lg">
              diagnostics
            </span>
          </div>

          {/* Main Headline */}
          <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3 leading-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Trusted lab tests<br />in 60 mins
          </h3>

          {/* Coupon Code */}
          <div className="flex items-center gap-2 mb-4">
            <span className="bg-purple-100 text-purple-700 font-bold text-sm px-3 py-1.5 rounded-lg border border-purple-200">
              PROTON15
            </span>
            <span className="text-slate-600 text-sm">
              Get flat <span className="font-bold text-pink-600">15% off</span> on all orders
            </span>
          </div>

          {/* CTA Button */}
          <button 
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 hover:from-purple-700 hover:to-pink-700 transition-colors shadow-md"
            onClick={(e) => {
              e.stopPropagation();
              navigate('/proton');
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
      <div className="bg-white/60 backdrop-blur-sm px-5 py-2 border-t border-purple-100">
        <p className="text-sm text-slate-500">
          Powered by <span className="font-bold text-purple-600">Proton</span><span className="font-bold text-pink-500">Diagnostics</span>
        </p>
      </div>
    </div>
  );
};

export default ProtonAdBanner;

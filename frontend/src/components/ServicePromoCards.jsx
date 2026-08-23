import React from 'react';
import { useNavigate } from 'react-router-dom';

const MANGO_AD_IMG = "https://customer-assets.emergentagent.com/job_0d019e93-1fbb-4dda-bdab-4bb9509372b9/artifacts/8yim8mr5_file_00000000fe0c7208b2a0a769e39b1fb3%20%281%29%20%281%29.png";
const ORANGE_AD_IMG = "https://customer-assets.emergentagent.com/job_0d019e93-1fbb-4dda-bdab-4bb9509372b9/artifacts/4t19ev3t_file_000000007fe87208ab2acfede927a95b%20%282%29.png";
const DIAGYN_AD_IMG = "https://customer-assets.emergentagent.com/job_0d019e93-1fbb-4dda-bdab-4bb9509372b9/artifacts/r4d1vm3u_file_0000000094f87208928a69cc30732479%20%281%29.png";

export const MangoPromoCard = () => {
  const navigate = useNavigate();
  return (
    <button 
      onClick={() => navigate('/mango')}
      className="w-full rounded-2xl overflow-hidden hover:scale-[1.01] active:scale-[0.99] transition-transform duration-200 shadow-lg relative group"
      data-testid="mango-promo-card"
    >
      <div className="w-full overflow-hidden rounded-2xl relative">
        <img 
          src={MANGO_AD_IMG}
          alt="Mango Health Labs"
          className="w-full h-auto object-cover"
        />
        <div className="absolute bottom-4 right-4">
          <span className="text-white/90 text-sm font-semibold bg-white/20 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/30">Book Now</span>
        </div>
      </div>
    </button>
  );
};

export const OrangePromoCard = () => {
  const navigate = useNavigate();
  return (
    <button 
      onClick={() => navigate('/pharmacy')}
      className="w-full rounded-2xl overflow-hidden hover:scale-[1.01] active:scale-[0.99] transition-transform duration-200 shadow-lg relative group"
      data-testid="orange-promo-card"
    >
      <div className="w-full overflow-hidden rounded-2xl relative">
        <img 
          src={ORANGE_AD_IMG}
          alt="Orange Pharmacy"
          className="w-full h-auto object-cover"
        />
        <div className="absolute bottom-4 right-4">
          <span className="text-white/90 text-sm font-semibold bg-white/20 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/30">Order Now</span>
        </div>
      </div>
    </button>
  );
};

export const DiaGynPromoCard = () => {
  const navigate = useNavigate();
  return (
    <button 
      onClick={() => navigate('/diagyn')}
      className="w-full rounded-2xl overflow-hidden hover:scale-[1.01] active:scale-[0.99] transition-transform duration-200 shadow-lg relative group"
      data-testid="diagyn-promo-card"
    >
      <div className="w-full overflow-hidden rounded-2xl relative">
        <img 
          src={DIAGYN_AD_IMG}
          alt="DiaGyn Healthcare"
          className="w-full h-auto object-cover"
        />
        <div className="absolute bottom-4 right-4">
          <span className="text-white/90 text-sm font-semibold bg-white/20 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/30">Book Now</span>
        </div>
      </div>
    </button>
  );
};

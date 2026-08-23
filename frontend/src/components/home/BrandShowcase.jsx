import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const MANGO_AD = 'https://customer-assets.emergentagent.com/job_0d019e93-1fbb-4dda-bdab-4bb9509372b9/artifacts/8yim8mr5_file_00000000fe0c7208b2a0a769e39b1fb3%20%281%29%20%281%29.png';
const ORANGE_AD = 'https://customer-assets.emergentagent.com/job_0d019e93-1fbb-4dda-bdab-4bb9509372b9/artifacts/4t19ev3t_file_000000007fe87208ab2acfede927a95b%20%282%29.png';
const DIAGYN_AD = 'https://customer-assets.emergentagent.com/job_0d019e93-1fbb-4dda-bdab-4bb9509372b9/artifacts/r4d1vm3u_file_0000000094f87208928a69cc30732479%20%281%29.png';

const SLIDES = [
  { id: 'diagyn', image: DIAGYN_AD, path: '/diagyn' },
  { id: 'mango', image: MANGO_AD, path: '/mango' },
  { id: 'orange', image: ORANGE_AD, path: '/pharmacy' },
];

const BrandShowcase = () => {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const [active, setActive] = useState(0);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.offsetWidth);
    setActive(idx);
  };

  return (
    <div className="mb-5" data-testid="brand-showcase">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory gap-3"
      >
        {SLIDES.map((slide) => (
          <div
            key={slide.id}
            onClick={() => navigate(slide.path)}
            className="flex-shrink-0 w-[80%] rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-transform duration-200 shadow-lg snap-start"
            data-testid={`showcase-${slide.id}`}
          >
            <img
              src={slide.image}
              alt=""
              className="w-full h-auto max-h-40"
              loading="lazy"
              style={{ objectFit: 'cover' }}
            />
          </div>
        ))}
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-1.5 mt-3">
        {SLIDES.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === active
                ? 'w-5 h-[6px] bg-white/50'
                : 'w-[6px] h-[6px] bg-white/15'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default BrandShowcase;

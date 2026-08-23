import React, { useState, useRef, useEffect } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';

const GOOGLE_LOGO = 'https://www.gstatic.com/images/branding/googlelogo/svg/googlelogo_clr_74x24px.svg';

const REVIEWS = [
  {
    id: 1,
    name: 'Priya Sharma',
    initial: 'P',
    color: '#4285F4',
    rating: 5,
    time: '2 weeks ago',
    text: 'Excellent experience at DiaGyn Healthcare! Dr. Vikas Jha is very thorough and patient. The staff was friendly and the clinic is very clean. Highly recommend for women\'s health checkups.',
  },
  {
    id: 2,
    name: 'Rahul Mehta',
    initial: 'R',
    color: '#EA4335',
    rating: 5,
    time: '1 month ago',
    text: 'Mango Health Labs gave reports within 4 hours! Very impressed with the speed and accuracy. The home collection service was punctual. Best lab experience in Nagpur.',
  },
  {
    id: 3,
    name: 'Anjali Deshmukh',
    initial: 'A',
    color: '#34A853',
    rating: 5,
    time: '3 weeks ago',
    text: 'Orange Pharmacy delivers medicines right to my doorstep. Great prices and genuine products. The Nevika Cura app makes ordering so easy!',
  },
  {
    id: 4,
    name: 'Suresh Patil',
    initial: 'S',
    color: '#FBBC05',
    rating: 4,
    time: '1 month ago',
    text: 'Very happy with the sonography service. Modern equipment and professional staff. Dr. Jha explained everything clearly. The online booking through the app is super convenient.',
  },
  {
    id: 5,
    name: 'Neha Kulkarni',
    initial: 'N',
    color: '#4285F4',
    rating: 5,
    time: '2 months ago',
    text: 'The best healthcare platform in Nagpur! From booking appointments to ordering medicines, everything is seamless. Love the CuraPay feature for easy payments.',
  },
];

const StarRow = ({ rating, size = 12 }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <Star
        key={i}
        className={`flex-shrink-0`}
        style={{
          width: size,
          height: size,
          fill: i <= rating ? '#FBBC05' : 'rgba(255,255,255,0.15)',
          color: i <= rating ? '#FBBC05' : 'rgba(255,255,255,0.15)',
        }}
      />
    ))}
  </div>
);

const GoogleReviews = () => {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    checkScroll();
  }, []);

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 260, behavior: 'smooth' });
    setTimeout(checkScroll, 350);
  };

  return (
    <div className="mb-6" data-testid="google-reviews">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <img src={GOOGLE_LOGO} alt="Google" className="h-5" />
          <span className="text-white/40 text-xs">|</span>
          <div className="flex items-center gap-1.5">
            <span className="text-white font-bold text-sm">4.8</span>
            <StarRow rating={5} size={11} />
          </div>
          <span className="text-white/40 text-[10px]">(120+)</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => scroll(-1)}
            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
              canScrollLeft ? 'bg-white/10 text-white/60 hover:bg-white/15' : 'bg-white/5 text-white/15'
            }`}
            disabled={!canScrollLeft}
            data-testid="reviews-scroll-left"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => scroll(1)}
            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
              canScrollRight ? 'bg-white/10 text-white/60 hover:bg-white/15' : 'bg-white/5 text-white/15'
            }`}
            disabled={!canScrollRight}
            data-testid="reviews-scroll-right"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Review Cards */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {REVIEWS.map((r) => (
          <div
            key={r.id}
            className="flex-shrink-0 w-[72%] rounded-2xl p-3.5 transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.07)',
              backdropFilter: 'blur(8px)',
              scrollSnapAlign: 'start',
            }}
            data-testid={`review-card-${r.id}`}
          >
            <div className="flex items-center gap-2.5 mb-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ background: r.color }}
              >
                {r.initial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-semibold truncate">{r.name}</p>
                <p className="text-white/35 text-[10px]">{r.time}</p>
              </div>
              {/* Google G icon */}
              <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
            <StarRow rating={r.rating} size={10} />
            <p className="text-white/60 text-[11px] leading-relaxed mt-2 line-clamp-3">{r.text}</p>
          </div>
        ))}

        {/* Write a Review CTA */}
        <a
          href="https://g.page/r/CZBa3QPJ_1lXEAE/review"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 w-[55%] rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2"
          style={{
            background: 'rgba(66, 133, 244, 0.08)',
            border: '1px dashed rgba(66, 133, 244, 0.25)',
            scrollSnapAlign: 'start',
          }}
          data-testid="write-review-cta"
        >
          <svg viewBox="0 0 24 24" className="w-7 h-7">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span className="text-[#4285F4] text-xs font-semibold">Rate us on Google</span>
          <StarRow rating={0} size={14} />
        </a>
      </div>
    </div>
  );
};

export default GoogleReviews;

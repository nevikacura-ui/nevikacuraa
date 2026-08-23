import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const STORIES = [
  {
    id: 'diagyn',
    brand: 'DiaGyn',
    avatar: 'https://customer-assets.emergentagent.com/job_4625448c-b743-44eb-9c92-5eb654622ad3/artifacts/mo04g1pk_file_0000000032dc720798054d00d20ce907%20%281%29.png',
    ring: 'linear-gradient(135deg, #14b8a6, #06b6d4)',
    stories: [
      { bg: 'linear-gradient(135deg, #0d9488, #0e7490)', title: 'Managing Diabetes', text: 'Did you know? Walking 30 minutes daily can reduce blood sugar by 25%. Start your streak today!', tag: 'Diabetes Tip' },
      { bg: 'linear-gradient(135deg, #ec4899, #a855f7)', title: 'PCOD Awareness', text: 'Regular exercise + balanced diet can manage PCOD symptoms effectively. Consult Dr. Neha for personalized care.', tag: 'Womens Health' },
      { bg: 'linear-gradient(135deg, #14b8a6, #3b82f6)', title: 'Thyroid Check', text: 'Feeling tired, gaining weight? Get your thyroid tested. Early detection = easy management.', tag: 'Health Alert' },
    ]
  },
  {
    id: 'orange',
    brand: 'Orange',
    avatar: 'https://customer-assets.emergentagent.com/job_52fac319-eb99-4766-978d-d2bba8458f97/artifacts/nfvq7jld_Picsart_25-02-20_01-00-31-839%20%281%29.png',
    ring: 'linear-gradient(135deg, #f97316, #ea580c)',
    stories: [
      { bg: 'linear-gradient(135deg, #ea580c, #c2410c)', title: 'Medicine Reminder', text: 'Set daily reminders for your medicines. Never miss a dose! Use our Medicine Reminder feature.', tag: 'Pharmacy Tip' },
      { bg: 'linear-gradient(135deg, #f97316, #f59e0b)', title: 'Generic = Smart', text: 'Generic medicines save 40-80% with same quality & efficacy. Ask our pharmacist about alternatives.', tag: 'Save Money' },
    ]
  },
  {
    id: 'mango',
    brand: 'Mango',
    avatar: 'https://customer-assets.emergentagent.com/job_52fac319-eb99-4766-978d-d2bba8458f97/artifacts/8spn81z0_Picsart_25-02-20_01-02-08-700%20%281%29.png',
    ring: 'linear-gradient(135deg, #22c55e, #16a34a)',
    stories: [
      { bg: 'linear-gradient(135deg, #16a34a, #15803d)', title: 'Annual Checkup', text: 'Complete health checkup at home starting at just Rs.999. 40+ tests including CBC, Thyroid, Sugar.', tag: 'Lab Offer' },
      { bg: 'linear-gradient(135deg, #22c55e, #14b8a6)', title: 'Vitamin D Alert', text: '76% of Indians are Vitamin D deficient. Get tested from home. Results in 24 hours.', tag: 'Did You Know' },
    ]
  },
  {
    id: 'wellness',
    brand: 'Wellness',
    avatar: null,
    emoji: '💪',
    ring: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
    stories: [
      { bg: 'linear-gradient(135deg, #7c3aed, #ec4899)', title: 'Health Streak', text: 'Walk 10,000 steps daily for 21 days and unlock: 10% off consultations, free home delivery on pharmacy!', tag: 'Challenge' },
      { bg: 'linear-gradient(135deg, #8b5cf6, #6366f1)', title: 'Sleep Better', text: '7-8 hours of sleep boosts immunity by 70%. Put your phone down 30 min before bed.', tag: 'Sleep Tip' },
    ]
  }
];

const CuraStories = () => {
  const [activeStory, setActiveStory] = useState(null);
  const [storyIdx, setStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [viewed, setViewed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('viewedStories') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    if (!activeStory) return;
    setProgress(0);
    const duration = 5000;
    const interval = 50;
    let elapsed = 0;
    const timer = setInterval(() => {
      elapsed += interval;
      setProgress((elapsed / duration) * 100);
      if (elapsed >= duration) {
        clearInterval(timer);
        handleNext();
      }
    }, interval);
    return () => clearInterval(timer);
  }, [activeStory, storyIdx]);

  const openStory = (brand) => {
    setActiveStory(brand);
    setStoryIdx(0);
    if (!viewed.includes(brand.id)) {
      const newViewed = [...viewed, brand.id];
      setViewed(newViewed);
      localStorage.setItem('viewedStories', JSON.stringify(newViewed));
    }
  };

  const handleNext = () => {
    if (!activeStory) return;
    if (storyIdx < activeStory.stories.length - 1) {
      setStoryIdx(storyIdx + 1);
    } else {
      const currentIdx = STORIES.findIndex(s => s.id === activeStory.id);
      if (currentIdx < STORIES.length - 1) {
        const next = STORIES[currentIdx + 1];
        setActiveStory(next);
        setStoryIdx(0);
        if (!viewed.includes(next.id)) {
          const newViewed = [...viewed, next.id];
          setViewed(newViewed);
          localStorage.setItem('viewedStories', JSON.stringify(newViewed));
        }
      } else {
        setActiveStory(null);
      }
    }
  };

  const handlePrev = () => {
    if (storyIdx > 0) setStoryIdx(storyIdx - 1);
  };

  const story = activeStory?.stories?.[storyIdx];

  return (
    <>
      {/* Story circles */}
      <div className="flex gap-3 overflow-x-auto px-4 py-3 scrollbar-hide" data-testid="cura-stories">
        {STORIES.map(brand => {
          const isViewed = viewed.includes(brand.id);
          return (
            <button key={brand.id} onClick={() => openStory(brand)} className="flex flex-col items-center gap-1 flex-shrink-0" data-testid={`story-${brand.id}`}>
              <div className="w-[58px] h-[58px] rounded-full p-[2.5px]" style={{ background: isViewed ? 'rgba(255,255,255,0.15)' : brand.ring }}>
                <div className="w-full h-full rounded-full bg-[#0a0b14] p-[2px]">
                  <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
                    {brand.avatar ? (
                      <img src={brand.avatar} alt={brand.brand} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl">{brand.emoji}</span>
                    )}
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-white/60 font-medium">{brand.brand}</span>
            </button>
          );
        })}
      </div>

      {/* Fullscreen story viewer */}
      {activeStory && story && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.95)' }}>
          <div className="w-full max-w-md h-full max-h-[85vh] relative rounded-2xl overflow-hidden" style={{ background: story.bg }}>
            {/* Progress bars */}
            <div className="absolute top-3 left-3 right-3 flex gap-1 z-20">
              {activeStory.stories.map((_, i) => (
                <div key={i} className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <div className="h-full rounded-full transition-all duration-100" style={{
                    background: '#fff',
                    width: i < storyIdx ? '100%' : i === storyIdx ? `${progress}%` : '0%'
                  }} />
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-white/20 flex items-center justify-center">
                  {activeStory.avatar ? <img src={activeStory.avatar} alt="" className="w-full h-full object-cover" /> : <span className="text-lg">{activeStory.emoji}</span>}
                </div>
                <span className="text-white text-sm font-bold">{activeStory.brand}</span>
              </div>
              <button onClick={() => setActiveStory(null)} className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center" data-testid="close-story">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center z-10">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold text-white/80 bg-white/15 mb-4 uppercase tracking-wider">{story.tag}</span>
              <h2 className="text-2xl font-black text-white mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>{story.title}</h2>
              <p className="text-white/80 text-sm leading-relaxed max-w-xs">{story.text}</p>
            </div>

            {/* Touch zones */}
            <div className="absolute inset-0 flex z-30">
              <button className="w-1/3 h-full" onClick={handlePrev} />
              <div className="w-1/3 h-full" />
              <button className="w-1/3 h-full" onClick={handleNext} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CuraStories;

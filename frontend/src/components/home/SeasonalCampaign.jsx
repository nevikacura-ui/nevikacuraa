import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Droplets, Sun, Wind, ChevronRight, X } from 'lucide-react';

const CAMPAIGNS = [
  {
    id: 'summer-hydration',
    months: [3, 4, 5],
    icon: Sun,
    title: 'Beat the Heat',
    subtitle: 'Summer Health Essentials',
    text: 'Stay hydrated & protect yourself. Get electrolyte panels, Vitamin D tests at 20% off.',
    gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)',
    accent: '#f59e0b',
    cta: 'Book Health Check',
    path: '/mango',
  },
  {
    id: 'monsoon-immunity',
    months: [6, 7, 8],
    icon: Droplets,
    title: 'Monsoon Guard',
    subtitle: 'Immunity Booster Campaign',
    text: 'Dengue, Malaria & Typhoid tests available. Protect your family this monsoon season.',
    gradient: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
    accent: '#3b82f6',
    cta: 'Get Tested',
    path: '/mango',
  },
  {
    id: 'diwali-wellness',
    months: [10, 11],
    icon: Heart,
    title: 'Festival of Health',
    subtitle: 'Diwali Wellness Check',
    text: 'Gift health to your loved ones. Full body checkup packages from Rs.999. Air quality lung tests available.',
    gradient: 'linear-gradient(135deg, #f97316, #eab308)',
    accent: '#eab308',
    cta: 'Gift a Checkup',
    path: '/mango',
  },
  {
    id: 'winter-care',
    months: [12, 1, 2],
    icon: Wind,
    title: 'Winter Wellness',
    subtitle: 'Cold-Weather Care',
    text: 'Thyroid, Vitamin D & joint health checkups. Keep your immunity strong this winter.',
    gradient: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
    accent: '#8b5cf6',
    cta: 'Check Now',
    path: '/mango',
  },
];

const SeasonalCampaign = () => {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const [campaign, setCampaign] = useState(null);

  useEffect(() => {
    const month = new Date().getMonth() + 1;
    const match = CAMPAIGNS.find((c) => c.months.includes(month));
    if (match) {
      const key = `campaign_dismissed_${match.id}`;
      const wasDismissed = sessionStorage.getItem(key);
      if (!wasDismissed) setCampaign(match);
    }
  }, []);

  if (!campaign || dismissed) return null;

  const Icon = campaign.icon;

  const handleDismiss = (e) => {
    e.stopPropagation();
    sessionStorage.setItem(`campaign_dismissed_${campaign.id}`, '1');
    setDismissed(true);
  };

  return (
    <div className="mb-5" data-testid="seasonal-campaign">
      <div
        onClick={() => navigate(campaign.path)}
        className="w-full rounded-2xl p-4 relative overflow-hidden group active:scale-[0.98] transition-transform text-left cursor-pointer"
        style={{ background: campaign.gradient }}
        data-testid={`campaign-${campaign.id}`}
      >
        <button
          onClick={handleDismiss}
          className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-black/20 flex items-center justify-center z-10 hover:bg-black/40 transition-colors"
          data-testid="dismiss-campaign"
        >
          <X className="w-3 h-3 text-white/70" />
        </button>

        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10 -mr-12 -mt-12 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5 -ml-8 -mb-8 blur-xl" />

        <div className="relative">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[9px] text-white/60 font-bold uppercase tracking-widest">
                {campaign.subtitle}
              </span>
              <h3 className="text-white font-bold text-base mt-0.5">{campaign.title}</h3>
              <p className="text-white/75 text-xs mt-1 leading-relaxed">{campaign.text}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3 ml-14">
            <span className="text-xs font-bold text-white">{campaign.cta}</span>
            <ChevronRight className="w-3.5 h-3.5 text-white/70 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeasonalCampaign;

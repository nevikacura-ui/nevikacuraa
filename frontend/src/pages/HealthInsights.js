import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, FlaskConical, Upload, ChevronRight, TrendingUp, Activity, Heart, HeartPulse, Droplet, Users, Sparkles, MessageCircle, Send, Pencil, Share2, Lock, Crown, Star, Trophy, Medal } from 'lucide-react';

const HEALTH_METRICS = [
  { name: 'Cholesterol - LDL', range: '<99.9 mg/dL', prev: 165, current: 154.2, status: 'high', color: '#EF4444' },
  { name: 'Hemoglobin', range: '8.5-10.2 mg/dL', prev: 9.2, current: 12.2, status: 'normal', color: '#22C55E' },
  { name: 'Blood Sugar (Fasting)', range: '70-100 mg/dL', prev: 112, current: 98, status: 'normal', color: '#22C55E' },
  { name: 'Vitamin D', range: '30-100 ng/mL', prev: 18, current: 25, status: 'low', color: '#F59E0B' },
];

const ATTENTION_ITEMS = [
  { icon: Heart, label: 'Cholesterol', level: 'Needs Attention', color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
  { icon: Droplet, label: 'Diabetes', level: 'Monitor', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
  { icon: Activity, label: 'Thyroid', level: 'Normal', color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
];

const AI_PROMPTS = [
  'How can I improve my health?',
  'Best foods for cholesterol?',
  'How is my heart health?',
  'Should I take supplements?',
];

// --- Family data for the Family Hub ---
const DEFAULT_FAMILY = [
  { id: 'all', name: 'Family View', initials: 'F', gradient: 'linear-gradient(135deg, #7C3AED, #A855F7)', isGroup: true },
  { id: 'user', name: 'You', initials: 'Y', gradient: 'linear-gradient(135deg, #EA580C, #F97316)', score: 78, trend: 'up' },
  { id: 'spouse', name: 'Spouse', initials: 'S', gradient: 'linear-gradient(135deg, #EC4899, #F472B6)', score: 65, trend: 'stable' },
  { id: 'parent', name: 'Parent', initials: 'P', gradient: 'linear-gradient(135deg, #0D9488, #14B8A6)', score: 52, trend: 'down' },
  { id: 'child', name: 'Child', initials: 'C', gradient: 'linear-gradient(135deg, #3B82F6, #60A5FA)', score: 88, trend: 'up' },
];

// --- Family Hub Component (Podium + Leaderboard) ---
const FamilyHub = () => {
  const navigate = useNavigate();
  const [family, setFamily] = useState(DEFAULT_FAMILY);
  const [selectedMember, setSelectedMember] = useState('all');

  // Load family from localStorage if exists
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('nc_family_members') || 'null');
      if (saved && saved.length > 0) setFamily(saved);
    } catch {}
  }, []);

  // Sort by score for leaderboard (excluding group view)
  const ranked = family
    .filter(m => !m.isGroup && m.score > 0)
    .sort((a, b) => b.score - a.score);

  const top3 = ranked.slice(0, 3);
  // Podium order: 2nd, 1st, 3rd
  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;

  return (
    <div className="pb-8">
      {/* Family Illustration Header */}
      <div className="text-center pt-2 pb-4">
        <div className="w-48 h-48 mx-auto mb-3 rounded-3xl overflow-hidden">
          <img 
            src="https://customer-assets.emergentagent.com/job_bd8fdecc-86b3-4cad-8629-2d2ce95785cf/artifacts/ynnfs8yh_file_000000003e6c71fa992fe45dc53b284e.png" 
            alt="Family Health" 
            className="w-full h-full object-contain"
            style={{ mixBlendMode: 'multiply' }}
            loading="lazy"
          />
        </div>
        <h2 className="text-2xl font-black text-white mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>Family Hub</h2>
      </div>

      {/* Purple Banner */}
      <div className="mx-4 mb-3 rounded-2xl py-3 px-4 text-center" style={{ background: 'linear-gradient(135deg, #4C1D95, #5B21B6)' }}>
        <p className="text-white text-sm font-medium">Track family&apos;s health data in one view</p>
      </div>

      {/* Cross-link to Family Health Science */}
      <div className="mx-4 mb-5">
        <button
          onClick={() => navigate('/family-health')}
          className="w-full flex items-center gap-3 p-3 rounded-xl active:scale-[0.98] transition-all"
          style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}
          data-testid="family-health-science-link"
        >
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.2)' }}>
            <HeartPulse className="w-4.5 h-4.5 text-purple-400" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-white">Family Health Science</p>
            <p className="text-[10px] text-white/40">Health records, allergies & medical history</p>
          </div>
          <ChevronRight className="w-4 h-4 text-white/30" />
        </button>
      </div>

      {/* Your Family Carousel */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Your family</h3>
          <button className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }} data-testid="edit-family-btn">
            <Pencil className="w-3.5 h-3.5 text-white/50" />
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" data-testid="family-carousel">
          {family.map((member) => (
            <button
              key={member.id}
              onClick={() => setSelectedMember(member.id)}
              className="flex-shrink-0 flex flex-col items-center gap-1.5 transition-all active:scale-[0.95]"
              data-testid={`family-member-${member.id}`}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg relative"
                style={{
                  background: member.gradient,
                  boxShadow: selectedMember === member.id ? '0 0 0 3px rgba(255,255,255,0.3), 0 4px 12px rgba(124,58,237,0.4)' : '0 2px 8px rgba(0,0,0,0.2)',
                }}
              >
                {member.isGroup ? (
                  <Users className="w-7 h-7" />
                ) : (
                  <span style={{ fontFamily: 'Outfit, sans-serif' }}>{member.initials}</span>
                )}
                {selectedMember === member.id && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 border-2" style={{ borderColor: '#7C3AED' }} />
                )}
              </div>
              <span className={`text-[10px] font-medium ${selectedMember === member.id ? 'text-white' : 'text-white/50'}`}>
                {member.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard / Podium */}
      <div className="mx-4 rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(180deg, #2E1065 0%, #4C1D95 50%, #5B21B6 100%)' }} data-testid="leaderboard">
        <div className="text-center pt-6 pb-4">
          <h3 className="text-xl font-black text-white tracking-wide" style={{ fontFamily: 'Outfit, sans-serif' }}>LEADERBOARD</h3>
          <p className="text-purple-300/60 text-xs mt-0.5">Your top {Math.min(3, ranked.length)} family members</p>
        </div>

        {/* Podium */}
        <div className="flex items-end justify-center gap-2 px-4 pb-6 pt-2" data-testid="podium">
          {podiumOrder.map((member, idx) => {
            // Determine position: 0=2nd, 1=1st, 2=3rd
            const rank = idx === 1 ? 1 : idx === 0 ? 2 : 3;
            const barHeight = rank === 1 ? 120 : rank === 2 ? 90 : 70;
            const medalColor = rank === 1 ? '#FBBF24' : rank === 2 ? '#C0C0C0' : '#CD7F32';
            const medalIcon = rank === 1 ? Crown : rank === 2 ? Medal : Star;
            const MedalIcon = medalIcon;

            return (
              <div key={member.id} className="flex flex-col items-center" style={{ width: rank === 1 ? '110px' : '90px' }} data-testid={`podium-position-${rank}`}>
                {/* Medal/Crown */}
                <div className="mb-1">
                  <MedalIcon className="w-5 h-5" style={{ color: medalColor, filter: rank === 1 ? 'drop-shadow(0 0 6px rgba(251,191,36,0.5))' : 'none' }} />
                </div>

                {/* Avatar */}
                <div
                  className="rounded-full flex items-center justify-center text-white font-bold relative mb-2"
                  style={{
                    width: rank === 1 ? 64 : 52,
                    height: rank === 1 ? 64 : 52,
                    background: member.gradient,
                    fontSize: rank === 1 ? '20px' : '16px',
                    boxShadow: `0 4px 16px ${rank === 1 ? 'rgba(251,191,36,0.3)' : 'rgba(0,0,0,0.3)'}`,
                    border: `3px solid ${medalColor}`,
                  }}
                >
                  <span style={{ fontFamily: 'Outfit, sans-serif' }}>{member.initials}</span>
                  {rank === 1 && (
                    <div className="absolute -top-2 -right-1 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#FBBF24', boxShadow: '0 2px 8px rgba(251,191,36,0.5)' }}>
                      <Crown className="w-3.5 h-3.5 text-amber-900" />
                    </div>
                  )}
                </div>

                {/* Name */}
                <p className="text-white text-xs font-semibold mb-1 flex items-center gap-1">
                  {member.name}
                  <ChevronRight className="w-3 h-3 text-white/30" />
                </p>

                {/* Score Bar */}
                <div
                  className="w-full rounded-t-2xl flex items-start justify-center pt-3 relative"
                  style={{
                    height: `${barHeight}px`,
                    background: rank === 1
                      ? 'linear-gradient(180deg, rgba(251,191,36,0.25) 0%, rgba(251,191,36,0.08) 100%)'
                      : rank === 2
                        ? 'linear-gradient(180deg, rgba(192,192,192,0.2) 0%, rgba(192,192,192,0.06) 100%)'
                        : 'linear-gradient(180deg, rgba(205,127,50,0.2) 0%, rgba(205,127,50,0.06) 100%)',
                    border: `1px solid ${rank === 1 ? 'rgba(251,191,36,0.2)' : rank === 2 ? 'rgba(192,192,192,0.15)' : 'rgba(205,127,50,0.15)'}`,
                    borderBottom: 'none',
                  }}
                >
                  <span className="text-2xl font-black text-white" style={{ fontFamily: 'Outfit, sans-serif', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }} data-testid={`score-rank-${rank}`}>
                    {member.score}
                  </span>
                  {/* Rank Number */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <span className="text-[10px] font-bold text-white/50">{rank}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Locked members / remaining */}
        {ranked.length > 3 && (
          <div className="px-4 pb-4">
            {ranked.slice(3).map((member, idx) => (
              <div key={member.id} className="flex items-center gap-3 py-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="w-6 text-center text-xs font-bold text-white/30">{idx + 4}</span>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: member.gradient }}>
                  {member.initials}
                </div>
                <span className="text-white/70 text-sm font-medium flex-1">{member.name}</span>
                <span className="text-white/40 text-sm font-bold">{member.score}</span>
              </div>
            ))}
          </div>
        )}

        {/* Share Button */}
        <div className="px-4 pb-5 flex justify-end">
          <button className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }} data-testid="share-leaderboard-btn">
            <Share2 className="w-4 h-4 text-white/60" />
          </button>
        </div>
      </div>

      {/* Family Health Tips */}
      <div className="px-4 mt-5 space-y-3">
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.95)' }}>
          <h4 className="text-sm font-bold text-gray-900 mb-2">Family Health Actions</h4>
          <div className="space-y-2">
            <button onClick={() => navigate('/mango')} className="w-full flex items-center gap-3 p-2.5 rounded-xl active:scale-[0.98] transition-all" style={{ background: '#F0FDF4' }} data-testid="family-book-test">
              <FlaskConical className="w-5 h-5 text-teal-600" />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-900">Book family health checkup</p>
                <p className="text-[10px] text-gray-500">Comprehensive panels for the whole family</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
            <button onClick={() => navigate('/medical-records')} className="w-full flex items-center gap-3 p-2.5 rounded-xl active:scale-[0.98] transition-all" style={{ background: '#EDE9FE' }} data-testid="family-upload-report">
              <FileText className="w-5 h-5 text-purple-600" />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-900">Upload family lab reports</p>
                <p className="text-[10px] text-gray-500">Track everyone&apos;s health in one place</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Health Insights Page ---
const HealthInsights = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('you');
  const [aiQuery, setAiQuery] = useState('');

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #7C3AED 0%, #9333EA 30%, #A855F7 60%, #C084FC 100%)' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 pt-4 pb-3" style={{ background: 'rgba(124,58,237,0.85)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }} data-testid="health-insights-back">
            <ArrowLeft className="w-4.5 h-4.5 text-white" />
          </button>
          <h1 className="text-lg font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Health Insights</h1>
        </div>

        {/* For You / Your Family Toggle */}
        <div className="flex rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }} data-testid="insights-tab-toggle">
          <button
            onClick={() => setActiveTab('you')}
            className="flex-1 py-3 px-4 text-center transition-all"
            style={{
              background: activeTab === 'you' ? 'rgba(0,0,0,0.3)' : 'transparent',
              borderRadius: activeTab === 'you' ? '14px' : '0',
            }}
            data-testid="tab-for-you"
          >
            <p className="text-white text-sm font-bold">For you</p>
            <p className="text-white/50 text-[10px] flex items-center justify-center gap-1">
              <Sparkles className="w-3 h-3" /> Powered by AI
            </p>
          </button>
          <button
            onClick={() => setActiveTab('family')}
            className="flex-1 py-3 px-4 text-center transition-all"
            style={{
              background: activeTab === 'family' ? 'rgba(0,0,0,0.3)' : 'transparent',
              borderRadius: activeTab === 'family' ? '14px' : '0',
            }}
            data-testid="tab-family"
          >
            <p className={`text-sm font-bold ${activeTab === 'family' ? 'text-white' : 'text-white/70'}`}>Your family</p>
            <p className="text-white/40 text-[10px]">All at one place</p>
          </button>
        </div>
      </div>

      {/* ===== FOR YOU TAB ===== */}
      {activeTab === 'you' && (
        <div className="px-4 pb-8">
          <div className="text-center py-6">
            <p className="text-white/50 text-[10px] tracking-[3px] uppercase mb-1">Introducing</p>
            <h2 className="text-3xl font-black text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Health Insights</h2>
          </div>

          <div className="mb-4">
            <h3 className="text-[10px] tracking-[2px] uppercase text-white/50 mb-1 font-bold">What is Health Insights</h3>
            <p className="text-white/80 text-sm">A summary of your health based on your lab reports</p>
          </div>

          {/* Health Metrics Scroll */}
          <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4 mb-6" data-testid="health-metrics-scroll">
            <div className="flex-shrink-0 w-[280px] rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.95)' }}>
              {HEALTH_METRICS.slice(0, 2).map((metric, i) => (
                <div key={i} className={`${i > 0 ? 'mt-3 pt-3 border-t border-gray-100' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-900 text-sm font-bold">{metric.name}</p>
                      <p className="text-gray-400 text-[10px]">Range: {metric.range}</p>
                      <div className="mt-1 h-1.5 w-16 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: '60%', background: metric.color }} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold" style={{ color: metric.status === 'normal' ? '#22C55E' : '#EF4444' }}>{metric.prev}</span>
                      <TrendingUp className="w-3 h-3 text-gray-400" />
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: metric.color }}>{metric.current}</span>
                    </div>
                  </div>
                </div>
              ))}
              <p className="text-purple-600 text-xs font-bold mt-3 text-center">Track changes in your health</p>
            </div>

            <div className="flex-shrink-0 w-[240px] rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.95)' }}>
              {ATTENTION_ITEMS.map((item, i) => (
                <div key={i} className={`flex items-center gap-3 ${i > 0 ? 'mt-3 pt-3 border-t border-gray-100' : ''}`}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: item.bg }}>
                    <item.icon className="w-5 h-5" style={{ color: item.color }} />
                  </div>
                  <div>
                    <p className="text-gray-900 text-sm font-bold">{item.label}</p>
                    <p className="text-xs" style={{ color: item.color }}>{item.level}</p>
                  </div>
                </div>
              ))}
              <p className="text-purple-600 text-xs font-bold mt-3 text-center">Know what needs attention</p>
            </div>
          </div>

          <div className="text-center mb-4">
            <p className="text-white/40 text-[10px] tracking-[3px] uppercase flex items-center justify-center gap-2">
              <Sparkles className="w-3 h-3" /> Let&apos;s get started <Sparkles className="w-3 h-3" />
            </p>
          </div>

          {/* Action Cards */}
          <div className="space-y-3 mb-6" data-testid="action-cards">
            <button onClick={() => navigate('/health-score')} className="w-full rounded-2xl p-4 text-left active:scale-[0.98] transition-all flex items-center gap-4" style={{ background: 'rgba(255,255,255,0.95)' }} data-testid="action-health-insights">
              <div className="flex-1">
                <p className="text-gray-900 text-base font-bold flex items-center gap-1">Your health insights <ChevronRight className="w-4 h-4" /></p>
                <p className="text-gray-500 text-xs mt-0.5">A quick snapshot of your overall health</p>
              </div>
              <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #E0F2FE, #BAE6FD)' }}>
                <Activity className="w-7 h-7 text-sky-500" />
              </div>
            </button>
            <button onClick={() => setActiveTab('family')} className="w-full rounded-2xl p-4 text-left active:scale-[0.98] transition-all flex items-center gap-4" style={{ background: 'rgba(255,255,255,0.95)' }} data-testid="action-family-insights">
              <div className="flex-1">
                <p className="text-gray-900 text-base font-bold flex items-center gap-1">Your family insights <ChevronRight className="w-4 h-4" /></p>
                <p className="text-gray-500 text-xs mt-0.5">Track family&apos;s health data in one view</p>
              </div>
              <div className="w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)' }}>
                <Users className="w-7 h-7 text-amber-500" />
              </div>
            </button>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-white/20" />
            <span className="text-white/40 text-xs">OR</span>
            <div className="flex-1 h-px bg-white/20" />
          </div>
          <p className="text-white/40 text-xs text-center mb-4">if you don&apos;t have any lab report</p>

          <div className="space-y-3 mb-8" data-testid="upload-action-cards">
            <button onClick={() => navigate('/medical-records')} className="w-full rounded-2xl p-4 text-left active:scale-[0.98] transition-all flex items-center gap-4" style={{ background: 'rgba(255,255,255,0.95)' }} data-testid="action-upload-report">
              <div className="flex-1">
                <p className="text-gray-900 text-base font-bold flex items-center gap-1">Upload a lab report <ChevronRight className="w-4 h-4" /></p>
                <p className="text-gray-500 text-xs mt-0.5">Turn your lab report into AI insights</p>
              </div>
              <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #EDE9FE, #DDD6FE)' }}>
                <FileText className="w-8 h-8 text-purple-500" />
              </div>
            </button>
            <button onClick={() => navigate('/prescription-scanner')} className="w-full rounded-2xl p-4 text-left active:scale-[0.98] transition-all flex items-center gap-4" style={{ background: 'rgba(255,255,255,0.95)' }} data-testid="action-upload-rx">
              <div className="flex-1">
                <p className="text-gray-900 text-base font-bold flex items-center gap-1">Upload prescription <ChevronRight className="w-4 h-4" /></p>
                <p className="text-gray-500 text-xs mt-0.5">Understand diagnosis, medicines, dosage and how to take them</p>
              </div>
              <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)' }}>
                <Upload className="w-7 h-7 text-amber-600" />
              </div>
            </button>
            <button onClick={() => navigate('/mango')} className="w-full rounded-2xl p-4 text-left active:scale-[0.98] transition-all flex items-center gap-4" style={{ background: 'rgba(255,255,255,0.95)' }} data-testid="action-book-test">
              <div className="flex-1">
                <p className="text-gray-900 text-base font-bold flex items-center gap-1">Book a lab test <ChevronRight className="w-4 h-4" /></p>
                <p className="text-gray-500 text-xs mt-0.5">Book tests to understand your health better</p>
              </div>
              <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #CCFBF1, #99F6E4)' }}>
                <FlaskConical className="w-7 h-7 text-teal-600" />
              </div>
            </button>
          </div>

          {/* Ask AI */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.95)' }} data-testid="ask-ai-section">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
              Ask AI about your health <Sparkles className="w-5 h-5 text-purple-500" />
            </h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {AI_PROMPTS.map((prompt, i) => (
                <button key={i} onClick={() => setAiQuery(prompt)}
                  className="px-3 py-2 rounded-full text-xs font-medium flex items-center gap-1.5 active:scale-[0.96] transition-all"
                  style={{ background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' }}
                  data-testid={`ai-prompt-${i}`}
                >
                  <MessageCircle className="w-3 h-3 text-purple-500" />{prompt}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-full px-4 py-2.5" style={{ background: '#F3F4F6', border: '1px solid #E5E7EB' }}>
              <input type="text" value={aiQuery} onChange={(e) => setAiQuery(e.target.value)}
                placeholder='"Ask AI about your health"'
                className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none"
                data-testid="ai-health-input" />
              <button onClick={() => { if (aiQuery.trim()) navigate(`/health-assistant?q=${encodeURIComponent(aiQuery)}`); }}
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #9333EA)' }}
                data-testid="ai-health-submit"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== YOUR FAMILY TAB — Family Hub with Podium ===== */}
      {activeTab === 'family' && <FamilyHub />}
    </div>
  );
};

export default HealthInsights;

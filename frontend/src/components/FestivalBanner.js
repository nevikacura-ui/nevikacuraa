import React, { createContext, useContext, useEffect, useMemo } from 'react';

// ═══════════════════════════════════════
// 2026 INDIAN FESTIVAL CALENDAR
// ═══════════════════════════════════════
const EID_BG = 'https://customer-assets.emergentagent.com/job_86db1c05-774a-4493-88c5-4bcf71757330/artifacts/apkeae3m_file_000000009fe47208b7e69b6215eff51e.png';
const HOLI_BG = 'https://static.prod-images.emergentagent.com/jobs/86db1c05-774a-4493-88c5-4bcf71757330/images/7bc5891258c1b360137012341ef0a26ea947c4c1bf68fc6dc4699b694cfbfed9.png';
const DIWALI_BG = 'https://customer-assets.emergentagent.com/job_86db1c05-774a-4493-88c5-4bcf71757330/artifacts/q24k5tjh_file_000000004a787208a850416bbbd2329f.png';
const JANMASHTAMI_BG = 'https://customer-assets.emergentagent.com/job_86db1c05-774a-4493-88c5-4bcf71757330/artifacts/68pkh0eg_file_00000000bee47208b2de0217134ab232.png';
const GANESH_BG = 'https://customer-assets.emergentagent.com/job_86db1c05-774a-4493-88c5-4bcf71757330/artifacts/rzou86o8_file_00000000e9d47208be35962d79e44f45.png';

const FESTIVALS_2026 = [
  {
    id: 'holi',
    name: 'Holi',
    date: '2026-03-04',
    endDate: '2026-03-05',
    greeting: 'Happy Holi!',
    sub: 'May colors of joy fill your life with health and happiness',
    image: 'https://static.prod-images.emergentagent.com/jobs/88649287-a174-4949-9431-9b17c5cd2f07/images/a3141c4a327492b6844c812b26b4a2c2bb480c63e4cf64c02bc38ba0b3f9816e.png',
    bgImage: HOLI_BG,
    colors: ['#ec4899', '#f59e0b', '#22c55e', '#6366f1', '#ef4444'],
    accent: '#ec4899',
    accentRgb: '236,72,153',
    bgGlow: 'radial-gradient(ellipse at 30% 20%, rgba(236,72,153,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(234,179,8,0.06) 0%, transparent 60%)',
  },
  {
    id: 'eid_fitr',
    name: 'Eid al-Fitr',
    date: '2026-03-19',
    endDate: '2026-03-20',
    greeting: 'Eid Mubarak!',
    sub: 'May this Eid bring blessings of health, peace and prosperity',
    image: 'https://static.prod-images.emergentagent.com/jobs/88649287-a174-4949-9431-9b17c5cd2f07/images/a734cf67ca2ad10d3d3a0f2717f077af313dc03e29f32d777b50eb84da81cef9.png',
    bgImage: EID_BG,
    colors: ['#10b981', '#059669', '#d4a017'],
    accent: '#10b981',
    accentRgb: '16,185,129',
    bgGlow: 'radial-gradient(ellipse at 50% 30%, rgba(16,185,129,0.07) 0%, transparent 60%)',
  },
  {
    id: 'navroz',
    name: 'Navroz',
    date: '2026-03-21',
    endDate: '2026-03-21',
    greeting: 'Navroz Mubarak!',
    sub: 'A festival of transformation — wishing abundance, growth & happiness',
    image: 'https://static.prod-images.emergentagent.com/jobs/88649287-a174-4949-9431-9b17c5cd2f07/images/4d657c76d409ebca7c9b56892e99c910e4312216ce3bf3edd6b5ac9b7db275e4.png',
    bgImage: EID_BG,
    colors: ['#14b8a6', '#0d9488', '#d4a017'],
    accent: '#14b8a6',
    accentRgb: '20,184,166',
    bgGlow: 'radial-gradient(ellipse at 50% 30%, rgba(20,184,166,0.07) 0%, transparent 60%)',
  },
  {
    id: 'ram_navami',
    name: 'Ram Navami',
    date: '2026-03-26',
    endDate: '2026-03-26',
    greeting: 'Happy Ram Navami!',
    sub: 'Jai Shri Ram — May Lord Rama bless you with good health',
    image: 'https://static.prod-images.emergentagent.com/jobs/88649287-a174-4949-9431-9b17c5cd2f07/images/7b77580f08f30fe5e3bb429f2779375726481864284a94f185b1b469ed966240.png',
    bgImage: DIWALI_BG,
    colors: ['#f97316', '#eab308'],
    accent: '#f97316',
    accentRgb: '249,115,22',
    bgGlow: 'radial-gradient(ellipse at 50% 30%, rgba(249,115,22,0.07) 0%, transparent 60%)',
  },
  {
    id: 'good_friday',
    name: 'Good Friday',
    date: '2026-04-03',
    endDate: '2026-04-03',
    greeting: 'Good Friday',
    sub: 'A day of reflection, hope and renewal',
    image: 'https://static.prod-images.emergentagent.com/jobs/88649287-a174-4949-9431-9b17c5cd2f07/images/974fbbd2e8c40bd127cb9440b4100e4d7f0e6388e73603f882ac83ede3d3c9e2.png',
    bgImage: DIWALI_BG,
    colors: ['#8b5cf6', '#7c3aed'],
    accent: '#8b5cf6',
    accentRgb: '139,92,246',
    bgGlow: 'radial-gradient(ellipse at 50% 30%, rgba(139,92,246,0.06) 0%, transparent 60%)',
  },
  {
    id: 'easter',
    name: 'Easter',
    date: '2026-04-05',
    endDate: '2026-04-05',
    greeting: 'Happy Easter!',
    sub: 'Wishing you joy, love and good health this Easter',
    image: 'https://static.prod-images.emergentagent.com/jobs/88649287-a174-4949-9431-9b17c5cd2f07/images/974fbbd2e8c40bd127cb9440b4100e4d7f0e6388e73603f882ac83ede3d3c9e2.png',
    bgImage: DIWALI_BG,
    colors: ['#c084fc', '#f9a8d4', '#a7f3d0'],
    accent: '#c084fc',
    accentRgb: '192,132,252',
    bgGlow: 'radial-gradient(ellipse at 50% 30%, rgba(192,132,252,0.06) 0%, transparent 60%)',
  },
  {
    id: 'eid_adha',
    name: 'Eid al-Adha',
    date: '2026-05-27',
    endDate: '2026-05-28',
    greeting: 'Eid Mubarak!',
    sub: 'Blessings of health, peace and prosperity to you and your family',
    image: 'https://static.prod-images.emergentagent.com/jobs/88649287-a174-4949-9431-9b17c5cd2f07/images/a734cf67ca2ad10d3d3a0f2717f077af313dc03e29f32d777b50eb84da81cef9.png',
    bgImage: EID_BG,
    colors: ['#10b981', '#059669', '#d4a017'],
    accent: '#10b981',
    accentRgb: '16,185,129',
    bgGlow: 'radial-gradient(ellipse at 50% 30%, rgba(16,185,129,0.07) 0%, transparent 60%)',
  },
  {
    id: 'janmashtami',
    name: 'Janmashtami',
    date: '2026-09-04',
    endDate: '2026-09-04',
    greeting: 'Happy Janmashtami!',
    sub: 'Hare Krishna! May Lord Krishna bless your health journey',
    image: 'https://static.prod-images.emergentagent.com/jobs/88649287-a174-4949-9431-9b17c5cd2f07/images/5808edb57cf09e5fa26b89e922b5a5162616ece636149bc00a2745b6dbeebd8b.png',
    bgImage: JANMASHTAMI_BG,
    colors: ['#3b82f6', '#6366f1', '#eab308'],
    accent: '#6366f1',
    accentRgb: '99,102,241',
    bgGlow: 'radial-gradient(ellipse at 50% 30%, rgba(99,102,241,0.07) 0%, transparent 60%)',
  },
  {
    id: 'ganesh_chaturthi',
    name: 'Ganesh Chaturthi',
    date: '2026-09-14',
    endDate: '2026-09-14',
    greeting: 'Ganpati Bappa Morya!',
    sub: 'May Lord Ganesha remove all obstacles from your health path',
    image: 'https://static.prod-images.emergentagent.com/jobs/88649287-a174-4949-9431-9b17c5cd2f07/images/f54d71535ce53a975b54e613b92752779e9593cd88ab23cc316a0864f227e6d7.png',
    bgImage: GANESH_BG,
    colors: ['#f97316', '#ef4444', '#eab308'],
    accent: '#f97316',
    accentRgb: '249,115,22',
    bgGlow: 'radial-gradient(ellipse at 50% 30%, rgba(249,115,22,0.08) 0%, transparent 60%)',
  },
  {
    id: 'navratri',
    name: 'Navratri',
    date: '2026-10-11',
    endDate: '2026-10-19',
    greeting: 'Happy Navratri!',
    sub: 'Nine nights of divine energy — Jai Mata Di!',
    image: 'https://static.prod-images.emergentagent.com/jobs/88649287-a174-4949-9431-9b17c5cd2f07/images/67ece23cd42a06e7aba57d190f18c730321167ba73b8dcdf2c82699a28c8c6d7.png',
    bgImage: DIWALI_BG,
    colors: ['#ef4444', '#f59e0b', '#22c55e'],
    accent: '#ef4444',
    accentRgb: '239,68,68',
    bgGlow: 'radial-gradient(ellipse at 30% 20%, rgba(239,68,68,0.06) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(234,179,8,0.05) 0%, transparent 60%)',
  },
  {
    id: 'dussehra',
    name: 'Dussehra',
    date: '2026-10-20',
    endDate: '2026-10-20',
    greeting: 'Happy Dussehra!',
    sub: 'Victory of good over evil — stay healthy, stay victorious',
    image: 'https://static.prod-images.emergentagent.com/jobs/88649287-a174-4949-9431-9b17c5cd2f07/images/2f8a5a6055dccad108ab9af42f9c52d3ace221a9ec431ad77906f66d37496234.png',
    bgImage: DIWALI_BG,
    colors: ['#f97316', '#ef4444', '#eab308'],
    accent: '#f97316',
    accentRgb: '249,115,22',
    bgGlow: 'radial-gradient(ellipse at 50% 30%, rgba(249,115,22,0.07) 0%, transparent 60%)',
  },
  {
    id: 'diwali',
    name: 'Diwali',
    date: '2026-11-08',
    endDate: '2026-11-09',
    greeting: 'Happy Diwali!',
    sub: 'Festival of Lights — May your health shine bright this Diwali',
    image: 'https://static.prod-images.emergentagent.com/jobs/88649287-a174-4949-9431-9b17c5cd2f07/images/4185ef85b7d128a4576bfe3ed4204e335f341e4bf83d7f603e9a8e2b89a9b58a.png',
    bgImage: DIWALI_BG,
    colors: ['#f59e0b', '#ef4444', '#a855f7'],
    accent: '#f59e0b',
    accentRgb: '245,158,11',
    bgGlow: 'radial-gradient(ellipse at 30% 20%, rgba(245,158,11,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(239,68,68,0.05) 0%, transparent 60%)',
  },
  {
    id: 'christmas',
    name: 'Christmas',
    date: '2026-12-25',
    endDate: '2026-12-25',
    greeting: 'Merry Christmas!',
    sub: 'Wishing you health, happiness and holiday cheer',
    image: 'https://static.prod-images.emergentagent.com/jobs/88649287-a174-4949-9431-9b17c5cd2f07/images/99a153f956ad69a93379630c75fd6d896fec4cb6681bff95cc580dac3b276f9d.png',
    bgImage: DIWALI_BG,
    colors: ['#ef4444', '#22c55e'],
    accent: '#ef4444',
    accentRgb: '239,68,68',
    bgGlow: 'radial-gradient(ellipse at 30% 30%, rgba(239,68,68,0.06) 0%, transparent 60%), radial-gradient(ellipse at 70% 70%, rgba(34,197,94,0.05) 0%, transparent 60%)',
  },
];

function getActiveFestival() {
  const now = new Date();
  for (const f of FESTIVALS_2026) {
    const start = new Date(f.date + 'T00:00:00');
    const end = new Date(f.endDate + 'T23:59:59');
    if (now >= start && now <= end) return f;
  }
  return null;
}

// ═══════════════════════════════════════
// FESTIVAL THEME CONTEXT + CSS INJECTOR
// ═══════════════════════════════════════
const FestivalThemeContext = createContext(null);

export const useFestivalTheme = () => useContext(FestivalThemeContext);

export const FestivalThemeProvider = ({ children }) => {
  const festival = useMemo(() => getActiveFestival(), []);

  // Inject CSS variables + global style overrides when a festival is active
  useEffect(() => {
    const root = document.documentElement;
    if (!festival) return;

    const accent = festival.accent;
    const rgb = festival.accentRgb;
    const glow = festival.bgGlow;
    // Secondary color from the palette
    const secondary = festival.colors[1] || accent;

    root.style.setProperty('--festival-accent', accent);
    root.style.setProperty('--festival-accent-rgb', rgb);
    root.style.setProperty('--festival-glow', glow);
    root.setAttribute('data-festival', festival.id);

    // Inject a <style> block that overrides teal/default accent everywhere
    const style = document.createElement('style');
    style.id = 'festival-theme-overrides';
    style.textContent = `
      /* Festival Theme Auto-Override — ${festival.name} */

      /* Teal text → Festival accent */
      .text-teal-400 { color: ${accent} !important; }
      .text-teal-500 { color: ${accent} !important; }
      .text-teal-300 { color: ${accent}cc !important; }
      .text-cyan-400  { color: ${secondary} !important; }

      /* Teal backgrounds → Festival accent */
      .bg-teal-400\\/15, .bg-teal-400\\/10 { background-color: ${accent}26 !important; }
      .bg-teal-500 { background-color: ${accent} !important; }

      /* Teal borders → Festival accent */
      .border-teal-400, .border-teal-500 { border-color: ${accent} !important; }
      .border-teal-400\\/20, .border-teal-400\\/30 { border-color: ${accent}40 !important; }

      /* Teal gradients → Festival accent */
      .from-teal-400 { --tw-gradient-from: ${accent} !important; }
      .from-teal-500 { --tw-gradient-from: ${accent} !important; }
      .to-cyan-500   { --tw-gradient-to: ${secondary} !important; }
      .to-cyan-400   { --tw-gradient-to: ${secondary} !important; }

      /* Shadow glow → Festival accent */
      .shadow-teal-400\\/30 { --tw-shadow-color: ${accent}4d !important; }
      .shadow-teal-500\\/20 { --tw-shadow-color: ${accent}33 !important; }

      /* Ring colors */
      .ring-teal-400, .ring-teal-500 { --tw-ring-color: ${accent} !important; }

      /* Hover states */
      .hover\\:from-teal-600:hover { --tw-gradient-from: ${accent} !important; filter: brightness(0.9); }
      .hover\\:to-cyan-600:hover   { --tw-gradient-to: ${secondary} !important; filter: brightness(0.9); }
      .hover\\:text-teal-400:hover  { color: ${accent} !important; }
      .hover\\:bg-teal-400:hover    { background-color: ${accent} !important; }

      /* Focus */
      .focus\\:ring-teal-400:focus  { --tw-ring-color: ${accent} !important; }

      /* ─── Bottom Navigation ─── */
      /* Home tab active icon + text color */
      [data-testid="nav-home"] svg { color: ${accent} !important; }
      [data-testid="nav-home"] span { color: ${accent} !important; }
      [data-testid="nav-home"] .blur-md { background: ${accent} !important; }
      [data-testid="nav-home"] { background: ${accent}1a !important; }

      /* ─── Service Header nav tabs ─── */
      [data-testid="nav-home"][class*="rounded-xl"] svg { color: ${accent} !important; }

      /* ─── Miscellaneous teal inline overrides ─── */
      .bg-gradient-to-br.from-teal-500.to-cyan-500 {
        background: linear-gradient(135deg, ${accent}, ${secondary}) !important;
      }
    `;
    document.head.appendChild(style);

    return () => {
      root.style.removeProperty('--festival-accent');
      root.style.removeProperty('--festival-accent-rgb');
      root.style.removeProperty('--festival-glow');
      root.removeAttribute('data-festival');
      const old = document.getElementById('festival-theme-overrides');
      if (old) old.remove();
    };
  }, [festival]);

  return (
    <FestivalThemeContext.Provider value={festival}>
      {children}
    </FestivalThemeContext.Provider>
  );
};

// ═══════════════════════════════════════
// FESTIVAL BANNER CARD COMPONENT
// ═══════════════════════════════════════
const FestivalBanner = () => {
  const festival = useFestivalTheme() || getActiveFestival();
  if (!festival) return null;

  return (
    <div className="mb-5 rounded-3xl relative overflow-hidden" data-testid="festival-banner"
      style={{
        border: `1px solid rgba(${festival.accentRgb},0.25)`,
        background: '#050510',
      }}>
      {/* Square Festival Image — no cropping */}
      <div className="relative w-full" style={{ aspectRatio: '1/1' }}>
        <img
          src={festival.image}
          alt={festival.name}
          className="w-full h-full object-contain"
          style={{ background: '#050510' }}
        />
        {/* Gradient overlay at bottom for text readability */}
        <div className="absolute inset-x-0 bottom-0 h-1/2" style={{
          background: 'linear-gradient(to top, #050510 0%, rgba(5,5,16,0.85) 50%, transparent 100%)',
        }} />
        {/* Text overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <p className="text-3xl font-black text-white leading-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {festival.greeting}
          </p>
          <p className="text-white/50 text-sm mt-1.5 max-w-[85%]">{festival.sub}</p>
          <div className="flex items-center gap-2.5 mt-3">
            <div className="flex gap-1.5">
              {festival.colors.slice(0, 5).map((c, i) => (
                <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: c, boxShadow: `0 0 6px ${c}40` }} />
              ))}
            </div>
            <span className="text-[10px] font-medium" style={{ color: `rgba(${festival.accentRgb},0.7)` }}>
              from Nevika Cura
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export { getActiveFestival, FESTIVALS_2026 };
export default FestivalBanner;

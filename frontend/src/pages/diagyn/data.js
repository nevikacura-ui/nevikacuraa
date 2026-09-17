import { Trophy, Users2, Clock, Sparkles, Shield, Heart, Activity, Award } from 'lucide-react';

export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const whyChooseIconMap = {
  trophy: Trophy, users: Users2, clock: Clock, sparkles: Sparkles,
  shield: Shield, heart: Heart, activity: Activity, award: Award
};

export const THEME = {
  base: '#050510',
  surface: '#0F172A',
  surfaceLight: '#1E293B',
  primary: '#14B8A6',
  primaryHover: '#2DD4BF',
  secondary: '#94A3B8',
  accent: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  text: {
    primary: '#F8FAFC',
    secondary: '#94A3B8',
    muted: '#64748B',
  },
  border: {
    default: '#1E293B',
    hover: '#334155',
    active: '#14B8A6',
  }
};

export const doctors = [
  {
    id: 'vikas',
    name: 'Dr. Vikas Jha',
    specialty: 'Diabetologist',
    qualifications: 'M.B.B.S, C.Diab (RSSDI, Delhi), Dip. In Diabetology (Cardiff, UK)',
    experience: '15',
    rating: 4.91,
    patients: '10,000+',
    reviews: 2500,
    image: 'https://customer-assets.emergentagent.com/job_1d0b9312-d1f2-40d1-b78f-c0c28fa95ba1/artifacts/gg2swmlp_IMG-20220627-WA0003.jpg',
    specializations: ['Diabetes Management', 'Thyroid Disorders', 'Preventive Health'],
    about: 'Expert in diabetes management, metabolic disorders, and preventive healthcare. Committed to helping patients achieve optimal health through personalized treatment plans and lifestyle modifications.',
    pastAffiliations: [
      'Wockhardt Hospital Mira Road',
      'H. N. Reliance Foundation Hospital',
      'SL Raheja Hospital',
    ],
    onlineConsultation: true,
    onlineConsultationFee: 700,
    phone: '9403890429',
    chat: '8108888330',
    schedule: {
      pushpa: [
        { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], time: '11:30-14:00' },
        { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], time: '18:00-22:00' }
      ],
      online: [
        { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], time: '09:00-12:00' },
        { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], time: '15:00-18:00' },
        { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], time: '20:00-22:00' },
        { days: ['Sunday'], time: '10:00-22:00' }
      ]
    }
  },
  {
    id: 'neha',
    name: 'Dr. Neha Patel',
    specialty: 'OBGYN',
    qualifications: 'M.B.B.S, D.G.O (Mumbai), FMAS (Delhi)',
    experience: '12',
    rating: 4.93,
    patients: '8,000+',
    reviews: 1800,
    image: 'https://customer-assets.emergentagent.com/job_healthhelper-7/artifacts/u05fho69_IMG-20260126-WA0000.jpg',
    specializations: ['High Risk Pregnancy', 'Laparoscopic Surgery', 'Infertility'],
    about: 'Specialized in women\'s health, prenatal care, and gynecological surgeries. Known for compassionate care and expertise in high-risk pregnancies.',
    pastAffiliations: [
      'Wockhardt Hospital Mira Road',
      'NMMC Hospital Vashi',
      'Rajawadi Hospital',
      'Marol Maternity Hospital MCGM',
    ],
    onlineConsultation: true,
    onlineConsultationFee: 700,
    phone: '9403890429',
    chat: '8108888330',
    schedule: {
      pushpa: [
        { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], time: '11:30-14:00' },
        { days: ['Tuesday', 'Thursday', 'Saturday'], time: '18:00-22:00' },
        { days: ['Monday', 'Wednesday', 'Friday'], time: '18:00-22:00' }
      ],
      online: [
        { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], time: '09:00-12:00' },
        { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], time: '15:00-18:00' },
        { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], time: '20:00-22:00' },
        { days: ['Sunday'], time: '10:00-22:00' }
      ]
    }
  }
];

export const clinics = [
  { id: 'pushpa', name: 'Pushpa Clinic', address: 'A-4, Sai Darshan, Near Don Bosco High School, Naigaon East' },
  { id: 'online', name: 'Online Consultation', address: 'Video call from home', isOnline: true }
];

export const CONSULTATION_FEES = {
  indian: {
    consultation: { fee: 700, duration: '15 minutes', label: 'Consultation' },
    followup: { fee: 500, duration: '15 minutes', label: 'Follow-up (within 7 days)' }
  },
  international: {
    consultation: { fee: 2500, duration: '15 minutes', label: 'Consultation', usd: 30 },
    followup: { fee: 1250, duration: '15 minutes', label: 'Follow-up (within 7 days)', usd: 15 }
  }
};

export const DOCTOR_COLORS = {
  vikas: {
    bg: 'linear-gradient(145deg, #0D1F1E 0%, #163332 100%)',
    accent: '#FFFFFF',
    buttonBg: '#FFFFFF',
    buttonHover: '#F0FFF0',
    buttonTextColor: '#0D1F1E',
  },
  neha: {
    bg: 'linear-gradient(145deg, #FBCFE8 0%, #F9A8D4 100%)',
    accent: '#1A0A1A',
    buttonBg: '#1A0A1A',
    buttonHover: '#2D1B2E',
    textDark: true,
  }
};

// App-wide palette
export const PALETTE = {
  primary: '#7ED321',
  accentGreen: '#8FEA3B',
  darkBase: '#1F3A2E',
  background: '#F5F7F6',
  card: '#E6EAE8',
  red: '#FF5A5F',
  blue: '#4A90E2',
  yellow: '#F5A623',
};

// Per-doctor booking themes
export const DOCTOR_BOOKING_THEMES = {
  vikas: {
    // Deep Teal cards + Neon Green (#A6FF4D) highlights — Glassmorphic premium
    primary: '#A6FF4D',
    accent: '#A6FF4D',
    accentGreen: '#A6FF4D',
    accentLight: 'rgba(166,255,77,0.12)',
    accentBorder: 'rgba(166,255,77,0.25)',
    accentDark: '#0D1F1E',
    yellow: '#F5A623',
    label: 'green',

    // Page & structure
    pageBg: '#F0F4F3',
    cardBg: '#0D1F1E',
    cardBorder: '#163332',
    secondaryCardBg: '#112927',

    // Header — NEON GREEN header (matching booking page accent)
    headerBg: '#2A7B8A',
    headerCardBg: 'linear-gradient(160deg, #8AE030 0%, #A6FF4D 50%, #B4FF66 100%)',
    headerText: '#FFFFFF',
    headerTextMuted: 'rgba(255,255,255,0.85)',
    headerAccent: '#0D1F1E',
    navBtnBg: '#1F6B5E',
    navBtnBorder: '#1A5C50',
    navBtnIcon: '#A6FF4D',
    isDarkCards: true,

    // Hero card text
    heroText: '#0F2A28',
    heroTextMuted: '#2D5C58',
    heroStatBg: 'rgba(0,0,0,0.12)',
    heroStatIconBg: 'rgba(255,255,255,0.3)',
    heroStatIcon: '#0F2A28',
    heroStatText: '#0D1F1E',
    heroStatSub: 'rgba(13,31,30,0.6)',

    // Selection
    selectedBg: '#A6FF4D',
    selectedText: '#0D1F1E',
    slotBorder: '#A6FF4D',
    slotSelectedBg: 'rgba(166,255,77,0.15)',

    // CTA
    ctaBg: '#A6FF4D',
    ctaText: '#0D1F1E',
    ctaShadow: 'rgba(166,255,77,0.3)',
    ctaGradient: 'linear-gradient(135deg, #A6FF4D, #8AE030)',

    // Tabs
    tabActive: '#A6FF4D',
    tabActiveText: '#0D1F1E',
    tabActiveShadow: 'rgba(166,255,77,0.25)',
    tabInactive: 'rgba(255,255,255,0.45)',
    tabBarBg: '#0D1F1E',

    // Icons
    iconBg: 'rgba(166,255,77,0.15)',
    iconColor: '#A6FF4D',

    // Badge
    badgeBg: 'rgba(166,255,77,0.15)',
    badgeText: '#A6FF4D',

    // Confirm / misc
    confirmGradient: 'linear-gradient(135deg, #0D1F1E 0%, #163332 100%)',
    confirmBg: '#F0F4F3',
    boldAccent: '#FFFFFF',
    boldAccentLight: 'rgba(166,255,77,0.08)',
    neonGlow: '#A6FF4D',
    neonGlowShadow: '0 0 24px rgba(166,255,77,0.2), 0 4px 16px rgba(0,0,0,0.12)',

    // Dark variants
    darkBg: 'linear-gradient(180deg, #081412 0%, #0D1F1E 60%, #163332 100%)',
    darkCard: 'rgba(166,255,77,0.08)',
    darkCardBorder: 'rgba(166,255,77,0.15)',
    darkGlow: 'radial-gradient(circle, rgba(166,255,77,0.12) 0%, transparent 65%)',
    lightBg: '#F0F4F3',

    // Card text colors (for dark card bg)
    cardText: '#FFFFFF',
    cardTextMuted: 'rgba(255,255,255,0.55)',
    cardTextSub: 'rgba(255,255,255,0.7)',
  },
  neha: {
    // Light Pink hero + Dark Pink accents + Deep Plum cards
    primary: '#EC4899',
    accent: '#EC4899',
    accentGreen: '#F472B6',
    accentLight: 'rgba(236,72,153,0.12)',
    accentBorder: 'rgba(236,72,153,0.25)',
    accentDark: '#1A0A1A',
    yellow: '#F5A623',
    label: 'pink',
    isDarkCards: true,

    // Page & structure
    pageBg: '#F5F3F4',
    cardBg: '#1A0A1A',
    cardBorder: '#2D1B2E',
    secondaryCardBg: '#241424',

    // Header — SOFT MAUVE hero card
    headerBg: '#A3829B',
    headerCardBg: 'linear-gradient(160deg, #A3829B 0%, #BFA0B8 50%, #CFBACC 100%)',
    headerText: '#FFFFFF',
    headerTextMuted: 'rgba(255,255,255,0.85)',
    headerAccent: '#1A0A1A',
    navBtnBg: '#8A6B83',
    navBtnBorder: '#7A5E74',
    navBtnIcon: '#E8D5E3',

    // Hero card text
    heroText: '#831843',
    heroTextMuted: '#9D174D',
    heroStatBg: 'rgba(0,0,0,0.1)',
    heroStatIconBg: 'rgba(255,255,255,0.3)',
    heroStatIcon: '#831843',
    heroStatText: '#4A0530',
    heroStatSub: 'rgba(74,5,48,0.6)',

    // Selection
    selectedBg: '#EC4899',
    selectedText: '#FFFFFF',
    slotBorder: '#EC4899',
    slotSelectedBg: 'rgba(236,72,153,0.15)',

    // CTA
    ctaBg: '#EC4899',
    ctaText: '#FFFFFF',
    ctaShadow: 'rgba(236,72,153,0.3)',
    ctaGradient: 'linear-gradient(135deg, #EC4899, #DB2777)',

    // Tabs
    tabActive: '#EC4899',
    tabActiveText: '#FFFFFF',
    tabActiveShadow: 'rgba(236,72,153,0.25)',
    tabInactive: 'rgba(255,255,255,0.45)',
    tabBarBg: '#1A0A1A',

    // Icons
    iconBg: 'rgba(236,72,153,0.15)',
    iconColor: '#EC4899',

    // Badge
    badgeBg: 'rgba(236,72,153,0.15)',
    badgeText: '#EC4899',

    // Confirm / misc
    confirmGradient: 'linear-gradient(135deg, #1A0A1A 0%, #2D1B2E 100%)',
    confirmBg: '#F5F3F4',
    boldAccent: '#FFFFFF',
    boldAccentLight: 'rgba(236,72,153,0.08)',
    neonGlow: '#EC4899',
    neonGlowShadow: '0 0 24px rgba(236,72,153,0.2), 0 4px 16px rgba(0,0,0,0.12)',

    // Dark variants
    darkBg: 'linear-gradient(180deg, #10060F 0%, #1A0A1A 60%, #2D1B2E 100%)',
    darkCard: 'rgba(236,72,153,0.08)',
    darkCardBorder: 'rgba(236,72,153,0.15)',
    darkGlow: 'radial-gradient(circle, rgba(236,72,153,0.12) 0%, transparent 65%)',
    lightBg: '#F5F3F4',

    // Card text colors (for dark card bg)
    cardText: '#FFFFFF',
    cardTextMuted: 'rgba(255,255,255,0.55)',
    cardTextSub: 'rgba(255,255,255,0.7)',
  }
};

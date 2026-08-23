import React, { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES } from '@/lib/pharmacy-constants';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Map DB categories to icons from CATEGORIES
const iconMap = {};
CATEGORIES.forEach(c => { iconMap[c.id] = c; });

// Gradient colors for category pills
const GRADIENTS = [
  'from-orange-500 to-amber-500',
  'from-rose-500 to-pink-500',
  'from-violet-500 to-purple-500',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-green-500',
  'from-teal-500 to-cyan-500',
  'from-amber-500 to-yellow-500',
  'from-red-500 to-rose-500',
  'from-indigo-500 to-violet-500',
  'from-sky-500 to-blue-500',
];

export const CategoryPills = ({ selectedCategory, onSelectCategory }) => {
  const [dbCategories, setDbCategories] = useState([]);

  useEffect(() => {
    axios.get(`${API_URL}/api/pharmacy/categories?store=orange_pharmacy`)
      .then(res => {
        const cats = (res.data.categories || [])
          .filter(c => c.count >= 100 && c.name && c.name !== 'General');
        setDbCategories(cats);
      })
      .catch(() => {});
  }, []);

  // Priority categories first
  const PILL_PRIORITY = ["women's health", "diabetes", "vitamin", "ortho", "bone", "multivitamin"];
  const getPillPriority = (name) => {
    const n = name.toLowerCase();
    const idx = PILL_PRIORITY.findIndex(p => n.includes(p));
    return idx >= 0 ? idx : 100;
  };

  const displayCats = dbCategories.length > 0
    ? [...dbCategories].sort((a, b) => getPillPriority(a.name) - getPillPriority(b.name))
    : CATEGORIES.map(c => ({ name: c.label, count: 0 }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-4">
      <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
        <style>{`.scrollbar-hide::-webkit-scrollbar{display:none}`}</style>
        <button
          onClick={() => onSelectCategory(null)}
          className="flex-shrink-0 px-5 py-2.5 rounded-full text-sm font-bold transition-all active:scale-95"
          style={!selectedCategory ? {
            background: 'linear-gradient(135deg, #F97316, #EA580C)',
            color: '#fff',
            boxShadow: '0 4px 16px rgba(249,115,22,0.35)',
          } : {
            background: '#f5f0eb',
            color: '#78716c',
            border: '1px solid #e7e0d9',
          }}
          data-testid="category-all"
        >
          All
        </button>
        {displayCats.map((cat, idx) => {
          const isSelected = selectedCategory?.name === cat.name || selectedCategory?.label === cat.name;
          const gradient = GRADIENTS[idx % GRADIENTS.length];
          return (
            <button
              key={cat.name}
              onClick={() => onSelectCategory({ label: cat.name, filter: cat.name, name: cat.name })}
              className={`flex-shrink-0 px-4 py-2.5 rounded-full text-sm font-semibold transition-all active:scale-95 whitespace-nowrap`}
              style={isSelected ? {
                background: `linear-gradient(135deg, var(--tw-gradient-stops))`,
                backgroundImage: `linear-gradient(135deg, ${getGradientColors(gradient)})`,
                color: '#fff',
                boxShadow: '0 4px 16px rgba(249,115,22,0.3)',
              } : {
                background: '#F5F5F5',
                color: '#78716c',
                border: '1px solid #E5E5E5',
              }}
              data-testid={`category-${cat.name}`}
            >
              {cat.name}
              {cat.count > 0 && (
                <span className="ml-1.5 text-[9px] opacity-60">({formatCount(cat.count)})</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

function getGradientColors(twClass) {
  const map = {
    'from-orange-500 to-amber-500': '#F97316, #F59E0B',
    'from-rose-500 to-pink-500': '#F43F5E, #EC4899',
    'from-violet-500 to-purple-500': '#8B5CF6, #A855F7',
    'from-blue-500 to-cyan-500': '#3B82F6, #06B6D4',
    'from-emerald-500 to-green-500': '#10B981, #22C55E',
    'from-teal-500 to-cyan-500': '#14B8A6, #06B6D4',
    'from-amber-500 to-yellow-500': '#F59E0B, #EAB308',
    'from-red-500 to-rose-500': '#EF4444, #F43F5E',
    'from-indigo-500 to-violet-500': '#6366F1, #8B5CF6',
    'from-sky-500 to-blue-500': '#0EA5E9, #3B82F6',
  };
  return map[twClass] || '#F97316, #EA580C';
}

function formatCount(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n.toString();
}

export const CategoryGrid = ({ onSelectCategory }) => {
  const navigate = useNavigate();
  const [dbCategories, setDbCategories] = useState([]);

  useEffect(() => {
    axios.get(`${API_URL}/api/pharmacy/categories?store=orange_pharmacy`)
      .then(res => {
        const cats = (res.data.categories || [])
          .filter(c => c.count >= 100 && c.name && c.name !== 'General');
        setDbCategories(cats);
      })
      .catch(() => {});
  }, []);

  // Priority categories that should appear first
  const PRIORITY_ORDER = [
    "women's health", "diabetes", "diabetes care", "vitamins", "vitamin", "ortho", "bone",
    "multivitamin", "supplement"
  ];

  const getPriority = (name) => {
    const n = name.toLowerCase();
    const idx = PRIORITY_ORDER.findIndex(p => n.includes(p));
    return idx >= 0 ? idx : 100;
  };

  // Merge with static CATEGORIES for images
  const getCatImage = (name) => {
    const nameL = name.toLowerCase();
    const match = CATEGORIES.find(c => nameL.includes(c.filter) || c.label.toLowerCase().includes(nameL.split(' ')[0]));
    return match?.image || null;
  };

  const getCatIcon = (name) => {
    const nameL = name.toLowerCase();
    const match = CATEGORIES.find(c => nameL.includes(c.filter) || c.label.toLowerCase().includes(nameL.split(' ')[0]));
    return match?.icon || null;
  };

  const displayCats = dbCategories.length > 0
    ? [...dbCategories].sort((a, b) => getPriority(a.name) - getPriority(b.name)).slice(0, 12)
    : CATEGORIES.slice(0, 12).map(c => ({ name: c.label, count: 0 }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-stone-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Shop by <span className="text-orange-500">category</span>
        </h2>
        <button className="text-orange-500 text-sm font-semibold flex items-center gap-1 hover:text-orange-600 transition-colors">
          View All <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
        {displayCats.map((cat, idx) => {
          const image = getCatImage(cat.name);
          const Icon = getCatIcon(cat.name);
          return (
            <button
              key={cat.name}
              onClick={() => navigate(`/pharmacy/category/${encodeURIComponent(cat.name)}`)}
              className="group flex flex-col items-center gap-2.5 p-3 rounded-2xl bg-white border border-stone-100 hover:border-orange-300 transition-all hover:-translate-y-1 active:scale-[0.98] hover:shadow-lg"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              data-testid={`grid-category-${cat.name}`}
            >
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center overflow-hidden border border-orange-100/50 group-hover:border-orange-300/50 transition-colors">
                {image ? (
                  <img src={image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" loading="lazy" />
                ) : Icon ? (
                  <Icon className="w-7 h-7 text-orange-500" />
                ) : (
                  <span className="text-2xl">{getCatEmoji(cat.name)}</span>
                )}
              </div>
              <span className="text-[10px] font-semibold text-stone-700 text-center leading-tight group-hover:text-orange-600 transition-colors">
                {cat.name}
              </span>
              {cat.count > 0 && (
                <span className="text-[8px] text-stone-400 -mt-1">{formatCount(cat.count)}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

function getCatEmoji(name) {
  const map = {
    'antibiotics': '💊', 'digestive': '🫃', 'pain': '🩹', 'respiratory': '🫁',
    'mental': '🧠', 'heart': '❤️', 'diabetes': '🩸', 'skin': '✨',
    'eye': '👁️', 'women': '👩', 'vitamin': '💪', 'urology': '🔬',
    'allergy': '🤧', 'oral': '🦷', 'hair': '💇', 'baby': '👶',
    'bone': '🦴', 'sexual': '💑', 'ent': '👂', 'nutrition': '🥗',
  };
  const nameL = name.toLowerCase();
  for (const [key, emoji] of Object.entries(map)) {
    if (nameL.includes(key)) return emoji;
  }
  return '💊';
}

// ============ ORANGE SELECT SECTION (Medicine Cards + See All) ============

export const TrustedFormularySection = ({ onSelectCategory, onViewMedicine, onAddToCart }) => {
  const [medicines, setMedicines] = useState([]);
  const [totalMeds, setTotalMeds] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API_URL}/api/emr/formulary/categories`)
      .then(res => {
        setTotalMeds(res.data.total_medicines || 0);
      }).catch(() => {});
    axios.get(`${API_URL}/api/emr/formulary/top?limit=9`)
      .then(res => {
        setMedicines(res.data.medicines || []);
      }).catch(() => {});
  }, []);

  if (medicines.length === 0) return null;

  return (
    <div className="mx-4 my-4" data-testid="orange-select-section">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-bold text-base">
            <span style={{ color: '#EA580C' }}>Orange</span>{' '}
            <span className="text-gray-800">Select</span>
          </h3>
          <p className="text-gray-400 text-xs">{totalMeds} verified medicines</p>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-orange-50 text-orange-600 border border-orange-200">CURATED</span>
      </div>

      {/* 3-column Medicine Cards — click opens product detail */}
      <div className="grid grid-cols-3 gap-2">
        {medicines.slice(0, 9).map((med, idx) => {
          const price = med.orange_price || med.sale_price || med.mrp;
          return (
            <div
              key={med.id || idx}
              className="bg-white rounded-xl overflow-hidden border border-gray-100 flex flex-col cursor-pointer active:scale-[0.97] transition-transform"
              onClick={() => onViewMedicine?.(med)}
              data-testid={`orange-select-med-${idx}`}
            >
              <div className="relative w-full aspect-square flex items-center justify-center bg-white">
                <i className="fa-solid fa-pills text-2xl text-gray-300" />
                <button
                  className="absolute bottom-1.5 right-1.5 px-2.5 py-0.5 rounded-md border-2 border-emerald-600 bg-white text-emerald-600 font-bold text-[10px] hover:bg-emerald-50 active:scale-95 transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    const p = med.orange_price || med.sale_price || med.mrp;
                    onAddToCart?.({
                      id: med.id || med.name, name: med.name, price: p, mrp: med.mrp,
                      quantity: 1, type: 'medicine', form: med.form, discount_percent: 0,
                    });
                  }}
                  data-testid={`os-add-med-${idx}`}
                >
                  ADD
                </button>
              </div>
              <div className="p-2 flex-1 flex flex-col">
                {med.form && (
                  <span className="text-[8px] text-gray-400 bg-gray-50 px-1 py-0.5 rounded self-start mb-1">{med.form}</span>
                )}
                <p className="text-gray-800 font-semibold text-[10px] leading-tight line-clamp-2 mb-auto" style={{ minHeight: '24px' }}>
                  {med.name}
                </p>
                <p className="text-gray-400 text-[8px] truncate">{med.company || med.manufacturer || ''}</p>
                {price && (
                  <p className="text-gray-900 font-bold text-[11px] mt-1">₹{price}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* See All Button → navigates to Orange Select page */}
      <button
        onClick={() => navigate('/orange-select')}
        className="w-full mt-3 py-3 rounded-xl text-center text-sm font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        style={{ background: '#FFF7ED', border: '1.5px solid #FDBA74', color: '#EA580C' }}
        data-testid="see-all-orange-select-btn"
      >
        See All {totalMeds} Medicines
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

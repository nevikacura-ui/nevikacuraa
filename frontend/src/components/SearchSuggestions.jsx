import React, { useState, useEffect } from 'react';
import { Clock, TrendingUp, Search, X, Pill, ArrowUpRight } from 'lucide-react';

const RECENT_KEY = 'nc_recent_searches';
const MAX_RECENT = 8;

// ─── Get/Set recent searches from localStorage ───
export const addRecentSearch = (term) => {
  if (!term?.trim()) return;
  const clean = term.trim();
  const recent = getRecentSearches();
  const updated = [clean, ...recent.filter(r => r.toLowerCase() !== clean.toLowerCase())].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
};

export const getRecentSearches = () => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } 
  catch { return []; }
};

export const clearRecentSearches = () => {
  localStorage.removeItem(RECENT_KEY);
};

// ─── Trending items (static popular searches) ───
const PHARMACY_TRENDING = [
  'Paracetamol', 'Dolo 650', 'Azithromycin', 'Amoxicillin', 'Crocin',
  'Pan D', 'Shelcal', 'Limcee', 'Cetirizine', 'Allegra',
];

const LAB_TRENDING = [
  'CBC', 'Thyroid', 'Vitamin D', 'HbA1c', 'Lipid Profile',
  'Liver Function', 'Kidney Function', 'Complete Blood Count', 'Sugar Fasting', 'Iron Studies',
];

const HEALTHPLUS_TRENDING = [
  'Blood Pressure Monitor', 'Glucometer', 'Pulse Oximeter', 'Thermometer',
  'Protein Powder', 'Multivitamin', 'Nebulizer', 'Weighing Scale',
];

const getTrending = (store) => {
  if (store === 'mango' || store === 'lab') return LAB_TRENDING;
  if (store === 'healthplus' || store === 'nutricare') return HEALTHPLUS_TRENDING;
  return PHARMACY_TRENDING;
};

// ─── Search Suggestions Panel ───
// Shows when search is focused but empty
const SearchSuggestions = ({ onSelect, onClose, store = 'pharmacy', visible = false }) => {
  const [recent, setRecent] = useState([]);
  const trending = getTrending(store);

  useEffect(() => {
    if (visible) setRecent(getRecentSearches());
  }, [visible]);

  if (!visible) return null;

  const handleClearRecent = (e) => {
    e.stopPropagation();
    clearRecentSearches();
    setRecent([]);
  };

  const handleSelect = (term) => {
    addRecentSearch(term);
    onSelect(term);
  };

  return (
    <div 
      className="absolute top-full left-0 right-0 mt-2 rounded-2xl shadow-2xl max-h-[420px] overflow-y-auto z-50"
      style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', border: '1px solid rgba(0,0,0,0.08)' }}
      data-testid="search-suggestions"
    >
      {/* Recent Searches */}
      {recent.length > 0 && (
        <div className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Recent</span>
            </div>
            <button 
              onClick={handleClearRecent} 
              className="text-[10px] text-orange-500 font-semibold hover:text-orange-600 px-2 py-0.5 rounded-lg hover:bg-orange-50 transition-all"
              data-testid="clear-recent"
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recent.map((term, i) => (
              <button
                key={i}
                onClick={() => handleSelect(term)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-stone-600 hover:text-orange-600 hover:bg-orange-50 transition-all active:scale-95"
                style={{ background: '#f5f0eb', border: '1px solid #e7e0d9' }}
                data-testid={`recent-${i}`}
              >
                <Clock className="w-2.5 h-2.5 text-stone-400" />
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Trending Searches */}
      <div className="px-4 pt-3 pb-3">
        <div className="flex items-center gap-1.5 mb-2.5">
          <TrendingUp className="w-3.5 h-3.5 text-orange-500" />
          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Trending</span>
        </div>
        <div className="space-y-0.5">
          {trending.map((term, i) => (
            <button
              key={i}
              onClick={() => handleSelect(term)}
              className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-stone-50 transition-all text-left group active:scale-[0.98]"
              data-testid={`trending-${i}`}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" 
                style={{ background: i < 3 ? 'linear-gradient(135deg, #FEF3C7, #FDE68A)' : '#f5f0eb' }}>
                {i < 3 ? (
                  <span className="text-[10px] font-black text-amber-700">{i + 1}</span>
                ) : (
                  <Search className="w-3.5 h-3.5 text-stone-400" />
                )}
              </div>
              <span className="flex-1 text-sm font-medium text-stone-700 group-hover:text-orange-600 transition-colors">{term}</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-orange-400 transition-colors" />
            </button>
          ))}
        </div>
      </div>

      {/* Close hint */}
      <div className="px-4 py-2 border-t border-stone-100 text-center">
        <button onClick={onClose} className="text-[10px] text-stone-400 hover:text-stone-600 transition-colors">
          Tap outside to close
        </button>
      </div>
    </div>
  );
};

export default SearchSuggestions;

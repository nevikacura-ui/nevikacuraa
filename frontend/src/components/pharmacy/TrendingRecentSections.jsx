import React, { useState, useEffect } from 'react';
import { Sparkles, Clock, TrendingUp, ChevronRight, Star, Repeat2 } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// ═══════════════════════════════════════════
// RECENTLY VIEWED — localStorage-tracked
// ═══════════════════════════════════════════
const STORAGE_KEY = 'pharma_recently_viewed';
const MAX_RECENT = 15;

export const trackMedicineView = (medicine) => {
  if (!medicine?.id) return;
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const filtered = stored.filter(id => id !== medicine.id);
    filtered.unshift(medicine.id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX_RECENT)));
  } catch {}
};

const getRecentIds = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
};

export const RecentlyViewedSection = ({ onSelect }) => {
  const [medicines, setMedicines] = useState([]);

  useEffect(() => {
    const ids = getRecentIds();
    if (ids.length < 2) return;
    axios.get(`${API_URL}/api/pharmacy/recently-viewed?ids=${ids.join(',')}`)
      .then(res => {
        const ordered = [];
        for (const id of ids) {
          const m = (res.data.medicines || []).find(med => med.id === id);
          if (m) ordered.push(m);
        }
        setMedicines(ordered);
      })
      .catch(() => {});
  }, []);

  if (medicines.length < 2) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-3" data-testid="recently-viewed-section">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-orange-500" />
          <h3 className="text-sm font-bold text-stone-900" style={{ fontFamily: 'Outfit, sans-serif' }}>Recently Viewed</h3>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
        {medicines.map(med => (
          <MiniCard key={med.id} medicine={med} onSelect={onSelect} accent="orange" />
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════
// PREVIOUSLY BOUGHT — backend-powered
// ═══════════════════════════════════════════
export const TrendingNowSection = ({ onSelect, store = 'orange_pharmacy' }) => {
  const [medicines, setMedicines] = useState([]);

  useEffect(() => {
    axios.get(`${API_URL}/api/pharmacy/trending?store=${store}&limit=12`)
      .then(res => setMedicines(res.data.trending || []))
      .catch(() => {});
  }, [store]);

  if (medicines.length < 3) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-3" data-testid="previously-bought-section">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Repeat2 className="w-4 h-4 text-orange-500" />
          <h3 className="text-sm font-bold text-stone-900" style={{ fontFamily: 'Outfit, sans-serif' }}>Previously Bought</h3>
        </div>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
        {medicines.map(med => (
          <MiniCard key={med.id} medicine={med} onSelect={onSelect} accent="amber" showBadge />
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════
// MINI CARD — compact horizontal scroll card
// ═══════════════════════════════════════════
const MiniCard = ({ medicine, onSelect, accent = 'orange', showBadge }) => {
  const hasImage = medicine.image_url && medicine.image_url !== '';
  const price = medicine.price || 0;
  const colors = {
    orange: { bg: '#FFFFFF', border: 'rgba(0,0,0,0.06)', text: 'text-orange-500', nameText: 'text-stone-800' },
    amber: { bg: '#FFFFFF', border: 'rgba(0,0,0,0.06)', text: 'text-amber-500', nameText: 'text-stone-800' },
  };
  const c = colors[accent] || colors.orange;

  return (
    <button
      onClick={() => onSelect?.(medicine)}
      className="flex-shrink-0 w-[140px] rounded-2xl p-3 text-left transition-all active:scale-[0.97] hover:-translate-y-1 hover:shadow-md"
      style={{ background: c.bg, border: `1px solid ${c.border}`, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
      data-testid={`mini-card-${medicine.id}`}
    >
      {hasImage ? (
        <div className="w-full h-20 rounded-xl overflow-hidden mb-2 bg-stone-50 flex items-center justify-center">
          <img src={medicine.image_url} alt="" className="w-full h-full object-contain" loading="lazy" />
        </div>
      ) : (
        <div className="w-full h-20 rounded-xl mb-2 bg-stone-50 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-stone-300" />
        </div>
      )}
      <p className={`text-xs font-semibold ${c.nameText} truncate`} title={medicine.name}>
        {medicine.name?.length > 22 ? medicine.name.slice(0, 22) + '...' : medicine.name}
      </p>
      <div className="flex items-center justify-between mt-1.5">
        {price > 0 ? (
          <span className={`text-xs font-bold ${c.text}`}>₹{price}</span>
        ) : (
          <span className="text-[10px] text-stone-400">Call to confirm</span>
        )}
        {showBadge && medicine.is_starred && (
          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
        )}
      </div>
    </button>
  );
};

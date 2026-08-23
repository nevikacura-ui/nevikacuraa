import React, { useState, useEffect } from 'react';
import { Pill, Heart, Sparkles, ChevronRight, Plus } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Medicine Cabinet — curated essentials for "All Drugs" tab
export const MedicineCabinet = ({ onViewMedicine, onAddToCart }) => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('nc_medicine_cabinet') || '[]');
    setItems(stored);
  }, []);

  const removeItem = (name) => {
    const updated = items.filter(i => i.name !== name);
    localStorage.setItem('nc_medicine_cabinet', JSON.stringify(updated));
    setItems(updated);
  };

  if (items.length === 0) {
    return (
      <div className="mx-4 mb-4 rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.04))', border: '1px solid rgba(99,102,241,0.12)' }} data-testid="medicine-cabinet-empty">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)' }}>
            <Pill className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <h3 className="text-sm font-bold text-gray-800">Medicine Cabinet</h3>
        </div>
        <p className="text-xs text-gray-500">Your frequently ordered medicines will appear here for quick reorder. Add medicines to your cabinet from any product page.</p>
      </div>
    );
  }

  return (
    <div className="mx-4 mb-4" data-testid="medicine-cabinet">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)' }}>
            <Pill className="w-3 h-3 text-indigo-500" />
          </div>
          <h3 className="text-sm font-bold text-gray-800">Medicine Cabinet</h3>
          <span className="text-[10px] text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full font-medium">{items.length}</span>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {items.map((item) => (
          <div key={item.name} className="flex-shrink-0 w-[130px] bg-white rounded-xl border border-gray-100 p-2.5 relative" data-testid={`cabinet-item-${item.name}`}>
            <button onClick={() => removeItem(item.name)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors">
              <span className="text-xs leading-none">&times;</span>
            </button>
            <p className="text-[11px] font-semibold text-gray-800 leading-tight mb-1 pr-4 line-clamp-2">{item.name}</p>
            {item.sale_price > 0 && <p className="text-[10px] font-bold text-green-600">₹{item.sale_price}</p>}
            <button
              onClick={() => onAddToCart && onAddToCart(item)}
              className="mt-1.5 w-full py-1 rounded-lg text-[10px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}
            >
              <Plus className="w-3 h-3 inline mr-0.5" />ADD
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// Personal Cabinet — beauty/wellness essentials for "Orange Healthplus" tab
export const PersonalCabinet = ({ onViewMedicine, onAddToCart }) => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('nc_personal_cabinet') || '[]');
    setItems(stored);
  }, []);

  const removeItem = (name) => {
    const updated = items.filter(i => i.name !== name);
    localStorage.setItem('nc_personal_cabinet', JSON.stringify(updated));
    setItems(updated);
  };

  if (items.length === 0) {
    return (
      <div className="mx-4 mb-4 rounded-2xl p-4" style={{ background: 'linear-gradient(135deg, rgba(236,72,153,0.08), rgba(168,85,247,0.04))', border: '1px solid rgba(236,72,153,0.12)' }} data-testid="personal-cabinet-empty">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(236,72,153,0.15)' }}>
            <Heart className="w-3.5 h-3.5 text-pink-400" />
          </div>
          <h3 className="text-sm font-bold text-gray-800">My Personal Cabinet</h3>
        </div>
        <p className="text-xs text-gray-500">Save your go-to skincare, haircare and wellness products here for easy reordering. Tap the heart icon on any product to add it.</p>
      </div>
    );
  }

  return (
    <div className="mx-4 mb-4" data-testid="personal-cabinet">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(236,72,153,0.15)' }}>
            <Heart className="w-3 h-3 text-pink-500" />
          </div>
          <h3 className="text-sm font-bold text-gray-800">My Personal Cabinet</h3>
          <span className="text-[10px] text-pink-500 bg-pink-50 px-1.5 py-0.5 rounded-full font-medium">{items.length}</span>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {items.map((item) => (
          <div key={item.name} className="flex-shrink-0 w-[130px] bg-white rounded-xl border border-gray-100 p-2.5 relative" data-testid={`personal-item-${item.name}`}>
            <button onClick={() => removeItem(item.name)} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors">
              <span className="text-xs leading-none">&times;</span>
            </button>
            <p className="text-[11px] font-semibold text-gray-800 leading-tight mb-1 pr-4 line-clamp-2">{item.name}</p>
            {item.sale_price > 0 && <p className="text-[10px] font-bold text-green-600">₹{item.sale_price}</p>}
            <button
              onClick={() => onAddToCart && onAddToCart(item)}
              className="mt-1.5 w-full py-1 rounded-lg text-[10px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #EC4899, #D946EF)' }}
            >
              <Plus className="w-3 h-3 inline mr-0.5" />ADD
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import axios from 'axios';
import { Plus, Sparkles, Package } from 'lucide-react';
import { getDiscountedPrice, isVerifiedBrand } from '@/utils/discountUtils';
import { ShieldCheck } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

// Mapping of common medicine pairings
const COMBO_MAP = {
  'paracetamol': ['Cetirizine', 'Crocin Cold', 'Limcee Vitamin C'],
  'dolo': ['Cetirizine', 'Pan D', 'Limcee Vitamin C'],
  'azithromycin': ['Pan D', 'Montair LC', 'Allegra'],
  'amoxicillin': ['Pan D', 'Clavulanic Acid', 'Shelcal'],
  'pan d': ['Paracetamol', 'Gelusil MPS', 'Rantac'],
  'crocin': ['Cetirizine', 'Pan D', 'Vicks VapoRub'],
  'shelcal': ['Limcee', 'Vitamin D3', 'Calcimax'],
  'metformin': ['Glimepiride', 'Januvia', 'Glucometer Strips'],
  'amlodipine': ['Atenolol', 'Telmisartan', 'BP Monitor'],
  'atorvastatin': ['Aspirin', 'Clopidogrel', 'Omega 3'],
  'cetirizine': ['Montair LC', 'Allegra', 'Nasivion Nasal Drops'],
  'omeprazole': ['Domperidone', 'Gelusil MPS', 'Digene'],
  'vitamin d': ['Calcium', 'Shelcal', 'Limcee'],
  'insulin': ['Glucometer Strips', 'Alcohol Swabs', 'Insulin Syringe'],
};

const FrequentlyBoughtTogether = ({ cartItems = [] }) => {
  const { addToPharmacyCart } = useCart();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cartItems.length) { setSuggestions([]); return; }

    // Find suggestions based on cart items
    const allSuggestions = new Set();
    const cartNames = cartItems.map(i => i.name?.toLowerCase() || '');

    cartItems.forEach(item => {
      const name = (item.name || '').toLowerCase();
      Object.entries(COMBO_MAP).forEach(([key, combos]) => {
        if (name.includes(key)) {
          combos.forEach(c => {
            // Don't suggest items already in cart
            if (!cartNames.some(cn => cn.includes(c.toLowerCase()))) {
              allSuggestions.add(c);
            }
          });
        }
      });
    });

    if (allSuggestions.size === 0) return;

    // Try to fetch real product data for suggestions
    const fetchSuggestions = async () => {
      setLoading(true);
      const results = [];
      for (const term of [...allSuggestions].slice(0, 4)) {
        try {
          const res = await axios.get(`${API}/pharmacy/search?q=${encodeURIComponent(term)}&limit=1`);
          const meds = res.data.medicines || res.data.results || [];
          if (meds.length > 0) results.push(meds[0]);
        } catch {}
      }
      setSuggestions(results);
      setLoading(false);
    };
    fetchSuggestions();
  }, [cartItems]);

  const handleAdd = (med) => {
    addToPharmacyCart({
      id: med.id || med.name,
      name: med.name,
      price: getDiscountedPrice(med.mrp || med.price || 0, med.form, med.store),
      mrp: med.mrp || med.price || 0,
      quantity: 1,
      manufacturer: med.manufacturer,
      form: med.form,
      store: med.store || 'orange_pharmacy',
      image_url: med.image_url,
    });
    toast.success(`${med.name} added to cart`);
  };

  if (!suggestions.length) return null;

  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(249,115,22,0.04)', border: '1px solid rgba(249,115,22,0.1)' }} data-testid="frequently-bought-together">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-orange-400" />
        <h3 className="text-sm font-bold text-white">Frequently Bought Together</h3>
      </div>

      <div className="space-y-2.5">
        {suggestions.map((med, idx) => (
          <div key={idx} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }} data-testid={`fbt-item-${idx}`}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden bg-[#1a1a1a]">
              {med.image_url ? (
                <img src={med.image_url} alt={med.name} className="w-full h-full object-contain p-1" />
              ) : (
                <Package className="w-5 h-5 text-orange-400/40" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white/80 truncate">{med.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-bold text-orange-400">
                  {'\u20B9'}{getDiscountedPrice(med.mrp || med.price || 0, med.form, med.store).toFixed(0)}
                </span>
                {med.mrp > 0 && (
                  <span className="text-[10px] text-white/30 line-through">
                    {'\u20B9'}{med.mrp.toFixed(0)}
                  </span>
                )}
                {isVerifiedBrand(med.manufacturer) && (
                  <span className="flex items-center gap-0.5 text-[8px] text-blue-400 font-semibold">
                    <ShieldCheck className="w-2.5 h-2.5" /> Verified
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={() => handleAdd(med)}
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 active:scale-90 transition-all"
              style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)', boxShadow: '0 2px 8px rgba(249,115,22,0.3)' }}
              data-testid={`fbt-add-${idx}`}
            >
              <Plus className="w-4 h-4 text-white" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FrequentlyBoughtTogether;

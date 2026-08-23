import React, { useState, useEffect, useRef } from 'react';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import { Clock, Zap, Plus, Tag, ChevronRight, Flame } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

// Countdown hook
const useCountdown = () => {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const diff = end - now;
      if (diff <= 0) { setTimeLeft('00:00:00'); return; }
      const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
      const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
      const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
      setTimeLeft(`${h}:${m}:${s}`);
    };
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, []);
  return timeLeft;
};

const DealsOfTheDay = ({ onViewMedicine }) => {
  const [deals, setDeals] = useState([]);
  const { addToPharmacyCart, pharmacyCart, updatePharmacyQuantity } = useCart();
  const scrollRef = useRef(null);
  const countdown = useCountdown();

  useEffect(() => {
    fetch(`${API}/api/pharmacy/trending?store=orange_pharmacy&limit=12`)
      .then(r => r.json())
      .then(d => {
        const items = (d.trending || []).filter(m => m.price > 0 || m.mrp > 0).slice(0, 8);
        setDeals(items.map(m => {
          const basePrice = m.price || m.mrp || 0;
          const mrp = m.mrp || Math.round(basePrice * 1.2);
          const dealPrice = Math.round(basePrice * 0.9);
          const discount = mrp > 0 ? Math.round(((mrp - dealPrice) / mrp) * 100) : 15;
          return { ...m, mrp, deal_discount: Math.max(10, discount), deal_price: dealPrice };
        }));
      })
      .catch(() => {});
  }, []);

  const handleAdd = (med) => {
    const inCart = pharmacyCart.find(c => c.name === med.name);
    if (inCart) {
      updatePharmacyQuantity(med.name, inCart.quantity + 1);
      toast.success('Quantity updated');
    } else {
      addToPharmacyCart({
        id: med.id || med._id,
        name: med.name,
        price: med.deal_price || med.price,
        mrp: med.mrp || med.price,
        quantity: 1,
        form: med.form || '',
        image: med.image_url || '',
        discount_percent: med.deal_discount || 0,
      });
    }
  };

  if (deals.length < 2) return null;

  return (
    <div className="mx-4 my-5" data-testid="deals-of-the-day">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #EF4444, #F97316)' }}>
            <Flame className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900" style={{ fontFamily: 'Outfit, sans-serif' }}>Deals of the Day</h3>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-red-500" />
              <span className="text-[10px] font-mono font-bold text-red-500 tabular-nums" data-testid="deal-countdown">{countdown}</span>
              <span className="text-[10px] text-stone-400">left</span>
            </div>
          </div>
        </div>
      </div>

      {/* Deals Scroller */}
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4" data-testid="deals-scroller">
        {deals.map((med, idx) => {
          const inCart = pharmacyCart.find(c => c.name === med.name);
          return (
            <div key={med.id || idx} className="flex-shrink-0 w-[160px] rounded-2xl overflow-hidden relative" style={{ background: '#fff', border: '1px solid #F3F4F6', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }} data-testid={`deal-card-${idx}`}>
              {/* Discount Badge */}
              <div className="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded-md" style={{ background: 'linear-gradient(135deg, #EF4444, #F97316)' }}>
                <span className="text-[9px] font-bold text-white">{med.deal_discount}% OFF</span>
              </div>

              {/* Image */}
              <button onClick={() => onViewMedicine?.(med)} className="w-full p-3 h-24 flex items-center justify-center" style={{ background: '#FAFAF9' }}>
                {med.image_url ? (
                  <img src={med.image_url} alt="" className="h-16 object-contain" loading="lazy" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
                    <Tag className="w-5 h-5 text-orange-300" />
                  </div>
                )}
              </button>

              {/* Info */}
              <div className="p-2.5">
                <p className="text-[11px] font-medium text-stone-800 line-clamp-2 leading-tight mb-1.5 h-[30px]">{med.name?.slice(0, 40)}</p>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-sm font-bold text-orange-600">₹{med.deal_price}</span>
                  <span className="text-[10px] text-stone-400 line-through">₹{med.mrp}</span>
                </div>
                {inCart ? (
                  <div className="flex items-center justify-between rounded-lg overflow-hidden" style={{ border: '1px solid #F97316' }}>
                    <button onClick={() => updatePharmacyQuantity(med.name, inCart.quantity - 1)}
                      className="px-2.5 py-1.5 text-orange-600 font-bold text-sm">-</button>
                    <span className="text-xs font-bold text-orange-600">{inCart.quantity}</span>
                    <button onClick={() => updatePharmacyQuantity(med.name, inCart.quantity + 1)}
                      className="px-2.5 py-1.5 text-orange-600 font-bold text-sm">+</button>
                  </div>
                ) : (
                  <button onClick={() => handleAdd(med)}
                    className="w-full py-1.5 rounded-lg text-xs font-bold text-orange-600 flex items-center justify-center gap-1 active:scale-[0.95] transition-all"
                    style={{ border: '1px solid #FDBA74', background: '#FFF7ED' }}
                    data-testid={`deal-add-${idx}`}
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DealsOfTheDay;

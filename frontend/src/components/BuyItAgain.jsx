import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import { RotateCcw, Plus, Check, Package, ChevronRight } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * Buy it Again — Shows previously purchased items for one-tap reorder.
 * Pulls from localStorage purchase history + backend order history.
 */
const BuyItAgain = () => {
  const [items, setItems] = useState([]);
  const { addToPharmacyCart, pharmacyCart, updatePharmacyQuantity } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Get from localStorage (tracked items from previous cart sessions)
    let localItems = [];
    try {
      localItems = JSON.parse(localStorage.getItem('nc_purchased_items') || '[]');
    } catch { localItems = []; }

    // 2. Fetch from backend order history
    const phone = localStorage.getItem('guestMobile') || localStorage.getItem('userPhone');
    if (phone) {
      fetch(`${API}/api/orders/history?phone=${phone}&limit=5`)
        .then(r => r.ok ? r.json() : { orders: [] })
        .then(d => {
          const orderItems = (d.orders || [])
            .flatMap(o => o.items || o.medicines || [])
            .filter(i => i.name);
          // Merge + deduplicate by name
          const merged = dedupeByName([...orderItems, ...localItems]);
          setItems(merged.slice(0, 12));
        })
        .catch(() => setItems(dedupeByName(localItems).slice(0, 12)));
    } else {
      setItems(dedupeByName(localItems).slice(0, 12));
    }
  }, []);

  const dedupeByName = (arr) => {
    const seen = new Set();
    return arr.filter(item => {
      const key = (item.name || '').toLowerCase().trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const handleAdd = (item) => {
    const inCart = pharmacyCart.find(c => c.name === item.name);
    if (inCart) {
      updatePharmacyQuantity(item.name, inCart.quantity + 1);
      toast.success('Quantity updated');
    } else {
      addToPharmacyCart({
        id: item.id || item.name,
        name: item.name,
        price: item.price || 0,
        mrp: item.mrp || item.price || 0,
        quantity: 1,
        form: item.form || '',
        image: item.image || item.image_url || '',
        discount_percent: item.discount_percent || 0,
      });
      toast.success(`${item.name?.slice(0, 25)} added`);
    }
  };

  if (items.length < 1) return null;

  return (
    <div className="mb-5" data-testid="buy-it-again">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.12)' }}>
            <RotateCcw className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Buy it again</h3>
            <p className="text-[9px] text-white/30">One-tap reorder your favourites</p>
          </div>
        </div>
        <button onClick={() => navigate('/pharmacy')} className="text-[10px] text-orange-400 font-semibold flex items-center gap-0.5" data-testid="buy-again-see-all">
          See all <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Horizontal Scroller */}
      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4" data-testid="buy-again-scroller">
        {items.map((item, idx) => {
          const inCart = pharmacyCart.find(c => c.name === item.name);
          return (
            <div
              key={item.name + idx}
              className="flex-shrink-0 w-[130px] rounded-2xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              data-testid={`buy-again-item-${idx}`}
            >
              {/* Image */}
              <div className="w-full h-20 flex items-center justify-center p-2" style={{ background: 'rgba(255,255,255,0.03)' }}>
                {item.image || item.image_url ? (
                  <img src={item.image || item.image_url} alt="" className="h-14 object-contain" loading="lazy" />
                ) : (
                  <Package className="w-7 h-7 text-white/10" />
                )}
              </div>

              {/* Info */}
              <div className="p-2.5">
                <p className="text-[10px] font-medium text-white/70 line-clamp-2 leading-tight mb-1.5 h-[26px]">{item.name?.slice(0, 35)}</p>
                <div className="flex items-center gap-1 mb-2">
                  {item.price > 0 && <span className="text-xs font-bold text-orange-400">₹{item.price}</span>}
                  {item.mrp > item.price && item.mrp > 0 && <span className="text-[9px] text-white/25 line-through">₹{item.mrp}</span>}
                </div>

                {inCart ? (
                  <div className="flex items-center justify-between rounded-lg overflow-hidden" style={{ border: '1px solid rgba(249,115,22,0.4)' }}>
                    <button onClick={() => updatePharmacyQuantity(item.name, inCart.quantity - 1)}
                      className="px-2 py-1 text-orange-400 font-bold text-xs" data-testid={`buy-again-dec-${idx}`}>-</button>
                    <span className="text-[10px] font-bold text-orange-400">{inCart.quantity}</span>
                    <button onClick={() => updatePharmacyQuantity(item.name, inCart.quantity + 1)}
                      className="px-2 py-1 text-orange-400 font-bold text-xs" data-testid={`buy-again-inc-${idx}`}>+</button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleAdd(item)}
                    className="w-full py-1.5 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all active:scale-[0.95]"
                    style={{ background: 'rgba(249,115,22,0.1)', color: '#FB923C', border: '1px solid rgba(249,115,22,0.25)' }}
                    data-testid={`buy-again-add-${idx}`}
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

/**
 * Call this after a successful checkout to persist purchased items for "Buy it Again"
 */
export const trackPurchasedItems = (cartItems) => {
  try {
    const existing = JSON.parse(localStorage.getItem('nc_purchased_items') || '[]');
    const newItems = cartItems.map(item => ({
      name: item.name,
      price: item.price || 0,
      mrp: item.mrp || item.price || 0,
      form: item.form || '',
      image: item.image || item.image_url || '',
      discount_percent: item.discount_percent || 0,
      purchased_at: new Date().toISOString(),
    }));
    // Merge: new items first, then existing, deduplicate
    const seen = new Set();
    const merged = [...newItems, ...existing].filter(item => {
      const key = (item.name || '').toLowerCase().trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 30); // keep max 30
    localStorage.setItem('nc_purchased_items', JSON.stringify(merged));
  } catch {}
};

export default BuyItAgain;

import React, { useRef, useState } from 'react';
import { Plus, Minus, Pill, Droplets, Syringe, Package, Loader2, Heart, MessageCircle } from 'lucide-react';
import { useCartAnimation } from '@/components/AddToCartAnimation';
import { ProductPlaceholder } from '@/components/ProductPlaceholder';
import { useWishlist } from '@/context/WishlistContext';
import { toast } from 'sonner';

const getFormLabel = (form) => {
  if (!form) return '';
  const f = form.toLowerCase();
  if (f === 'otc') return '';
  return form;
};

export const MedicineCard = ({ medicine, onAdd, onView, cartQuantity = 0, onIncrement, onDecrement }) => {
  const addButtonRef = useRef(null);
  const { triggerAddAnimation } = useCartAnimation();
  const [imgError, setImgError] = useState(false);
  const { isInWishlist, toggleWishlist } = useWishlist();
  const hasImage = medicine.image_url && !imgError;
  const wishlisted = isInWishlist(medicine.id || medicine.name);

  const handleAdd = (e) => {
    e.stopPropagation();
    triggerAddAnimation(addButtonRef.current, 'pharmacy');
    onAdd(medicine);
  };

  const mrp = medicine.mrp || 0;
  const salePrice = medicine.sale_price || medicine.price || Math.round(mrp * 0.85);
  const discount = mrp > 0 ? Math.round(mrp - salePrice) : 0;
  const discountPct = medicine.discount_percent || (mrp > 0 ? Math.round((1 - salePrice / mrp) * 100) : 0);

  // Orange Pharmacy stock-list items have no product photo — premium, text-only card
  if (!hasImage) {
    return (
      <div
        className="rounded-2xl flex flex-col p-3.5 cursor-pointer transition-transform active:scale-[0.98]"
        style={{ background: '#FBF6EC', border: '1px solid #E8DCC4' }}
        onClick={() => onView(medicine)}
        data-testid={`medicine-card-${medicine.id}`}
      >
        <div className="w-6 h-[2px] mb-2" style={{ background: '#C2793A' }} />
        <h3
          className="font-bold leading-snug line-clamp-2 flex-1"
          style={{ fontFamily: 'Outfit, sans-serif', color: '#2B241C', fontSize: '12.5px', minHeight: '32px' }}
        >
          {medicine.name}
        </h3>

        {mrp > 0 ? (
          <div className="mt-3 flex items-end justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-black tracking-tight" style={{ color: '#8A4A17', fontSize: '17px', fontFamily: 'Outfit, sans-serif' }}>
                {'\u20B9'}{Math.round(salePrice)}
              </p>
              <p className="leading-snug mt-0.5" style={{ color: '#9A8E75', fontSize: '8.5px' }}>
                Price shown is after 15&ndash;20% discount
              </p>
            </div>
            <div className="flex-shrink-0">
              {cartQuantity > 0 ? (
                <div className="flex items-center gap-2 rounded-lg px-2.5 py-1" style={{ background: '#8A4A17' }}>
                  <button onClick={(e) => { e.stopPropagation(); onDecrement(); }} className="text-white font-bold w-3 text-center leading-none" data-testid={`decrement-${medicine.id}`}>&minus;</button>
                  <span className="text-white font-bold text-xs min-w-[14px] text-center">{cartQuantity}</span>
                  <button onClick={(e) => { e.stopPropagation(); onIncrement(); }} className="text-white font-bold w-3 text-center leading-none" data-testid={`increment-${medicine.id}`}>+</button>
                </div>
              ) : medicine.stock_status === 'out_of_stock' ? (
                <span className="text-[9px] font-medium px-2.5 py-1 rounded-lg whitespace-nowrap" style={{ color: '#9A8E75', background: '#EFE7D4' }}>Out of Stock</span>
              ) : (
                <button
                  ref={addButtonRef}
                  onClick={handleAdd}
                  className="px-4 py-1.5 rounded-lg text-[11px] font-bold tracking-wide active:scale-95 transition-all whitespace-nowrap"
                  style={{ background: '#8A4A17', color: '#FBF6EC' }}
                  data-testid={`add-to-cart-${medicine.id}`}
                >
                  ADD
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const msg = encodeURIComponent(`Hi, I'd like to know the price for: ${medicine.name}`);
                window.open(`https://wa.me/919833188288?text=${msg}`, '_blank');
              }}
              className="text-[10px] font-semibold underline"
              style={{ color: '#8A4A17' }}
              data-testid={`price-request-${medicine.id}`}
            >
              Call pharmacist for price
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-xl overflow-hidden relative border border-gray-100"
      style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}
      data-testid={`medicine-card-${medicine.id}`}
    >
      {/* Image section */}
      <div
        className="relative w-full aspect-square flex items-center justify-center cursor-pointer bg-white p-2"
        onClick={() => onView(medicine)}
      >
        {/* Heart icon — wishlist */}
        <button
          className={`absolute top-2 right-2 z-10 transition-colors ${wishlisted ? 'text-pink-500' : 'text-pink-300 hover:text-pink-400'}`}
          onClick={(e) => { 
            e.stopPropagation(); 
            const added = toggleWishlist(medicine);
            toast.success(added ? 'Added to wishlist' : 'Removed from wishlist');
          }}
          data-testid={`wishlist-${medicine.id}`}
        >
          <Heart className="w-5 h-5" strokeWidth={1.5} fill={wishlisted ? 'currentColor' : 'none'} />
        </button>

        {hasImage ? (
          <img
            src={medicine.image_url}
            alt={medicine.name}
            className="w-full h-full object-contain"
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
          />
        ) : (
          <ProductPlaceholder form={medicine.form} />
        )}

        {/* Rx badge — bottom left of image */}
        {medicine.prescription_required && (
          <div
            className="absolute bottom-2 left-2 z-10 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-1 rounded"
            data-testid={`rx-badge-${medicine.id}`}
          >
            Rx
          </div>
        )}

        {/* ADD button overlay — center bottom of image */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
          {cartQuantity > 0 ? (
            <div className="flex items-center gap-1 bg-green-600 rounded-md px-3 py-1.5">
              <button onClick={(e) => { e.stopPropagation(); onDecrement(); }} className="text-white" data-testid={`decrement-${medicine.id}`}>
                <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
              <span className="text-white font-bold text-xs min-w-[18px] text-center">{cartQuantity}</span>
              <button onClick={(e) => { e.stopPropagation(); onIncrement(); }} className="text-white" data-testid={`increment-${medicine.id}`}>
                <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
            </div>
          ) : medicine.stock_status === 'out_of_stock' ? (
            <span className="text-[9px] text-gray-400 font-medium bg-gray-100 px-3 py-1.5 rounded-md">Out of Stock</span>
          ) : (
            <button
              ref={addButtonRef}
              onClick={handleAdd}
              className="px-6 py-1.5 rounded-md text-sm font-bold active:scale-95 transition-all border-2 border-pink-500 text-pink-500 bg-white hover:bg-pink-50"
              data-testid={`add-to-cart-${medicine.id}`}
            >
              ADD
            </button>
          )}
        </div>
      </div>

      {/* Price & Info section */}
      <div className="px-2.5 pt-2 pb-2.5">
        {/* Price row */}
        <div className="flex items-center gap-1.5 mb-0.5">
          {mrp > 0 ? (
            <>
              <span
                className="text-white text-xs font-bold px-2 py-0.5 rounded"
                style={{ background: '#16a34a' }}
              >
                {'\u20B9'}{Math.round(salePrice)}
              </span>
              <span className="text-gray-400 text-[11px] line-through">
                {'\u20B9'}{Math.round(mrp)}
              </span>
            </>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const msg = encodeURIComponent(`Hi, I'd like to know the price for: ${medicine.name}`);
                window.open(`https://wa.me/919833188288?text=${msg}`, '_blank');
              }}
              className="text-[10px] text-orange-600 font-semibold flex items-center gap-1 hover:underline"
              data-testid={`price-request-${medicine.id}`}
            >
              <MessageCircle className="w-3 h-3" /> Call pharmacist for price
            </button>
          )}
        </div>

        {/* Discount amount */}
        {discount > 0 && (
          <p className="text-green-600 text-[10px] font-bold mb-1">
            {'\u20B9'}{discount} OFF
          </p>
        )}

        {/* Product name */}
        <h3
          className="font-bold text-gray-800 text-[11px] leading-tight mb-0.5 cursor-pointer hover:text-pink-600 transition-colors line-clamp-2"
          onClick={() => onView(medicine)}
          style={{ minHeight: '26px' }}
        >
          {medicine.name}
        </h3>

        {/* Form / unit info */}
        {getFormLabel(medicine.form) && (
          <p className="text-gray-400 text-[10px] mb-0.5">{getFormLabel(medicine.form)}</p>
        )}

        {/* Flat 15% Off tag */}
        {discountPct > 0 && (
          <p className="text-pink-500 text-[10px] font-semibold">Flat {discountPct}% Off</p>
        )}
      </div>
    </div>
  );
};

export const MedicineGrid = ({ medicines, loading, onAdd, onView, cart, onIncrement, onDecrement }) => {
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-3 py-4">
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl overflow-hidden animate-pulse border border-gray-100">
              <div className="aspect-square bg-gray-50" />
              <div className="p-2.5 space-y-2">
                <div className="h-3 rounded w-1/2 bg-gray-100" />
                <div className="h-2 rounded bg-gray-100" />
                <div className="h-2 rounded w-3/4 bg-gray-50" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 py-4">
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
        {medicines.map(med => {
          const cartItem = cart.find(c => c.id === med.id || c.name === med.name);
          return (
            <MedicineCard
              key={med.id || med.name}
              medicine={med}
              onAdd={onAdd}
              onView={onView}
              cartQuantity={cartItem?.quantity || 0}
              onIncrement={() => onIncrement(med)}
              onDecrement={() => onDecrement(med)}
            />
          );
        })}
      </div>
    </div>
  );
};

export const SearchResults = ({ results, loading, onSelect, onAdd }) => {
  if (!results.length && !loading) return null;

  return (
    <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl shadow-xl max-h-80 overflow-y-auto z-50"
         style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', border: '1px solid rgba(0,0,0,0.08)' }}
         data-testid="search-results-dropdown">
      {loading ? (
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
        </div>
      ) : (
        results.map((med, idx) => {
          const mrp = med.mrp || 0;
          const salePrice = med.sale_price || med.price || Math.round(mrp * 0.85);
          return (
            <div
              key={idx}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-orange-50/60 border-b border-stone-100 last:border-0 transition-colors"
              data-testid={`search-result-${idx}`}
            >
              <button onClick={() => onSelect(med)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                {med.image_url ? (
                  <div className="w-11 h-11 rounded-xl bg-white border border-stone-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <img src={med.image_url} alt={med.name} className="w-full h-full object-contain p-0.5" loading="lazy" />
                  </div>
                ) : (
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200/50 flex items-center justify-center flex-shrink-0">
                    <Pill className="w-5 h-5 text-orange-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-stone-800 text-sm truncate">{med.name}</p>
                  <p className="text-xs text-stone-400 truncate">{med.form}{med.manufacturer ? ` · ${med.manufacturer}` : ''}</p>
                </div>
              </button>
              <div className="text-right flex-shrink-0 flex items-center gap-2">
                <div>
                  {mrp > 0 ? (
                    <>
                      <span className="font-bold text-green-600 text-sm">{'\u20B9'}{Math.round(salePrice)}</span>
                      {mrp > salePrice ? (
                        <span className="block text-[9px] text-stone-400 line-through">MRP {'\u20B9'}{Math.round(mrp)}</span>
                      ) : (
                        <span className="block text-[8px] text-stone-400">after 15&ndash;20% discount</span>
                      )}
                    </>
                  ) : (
                    <span className="text-[10px] text-orange-600 font-medium">Call pharmacist</span>
                  )}
                </div>
                {onAdd && mrp > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onAdd(med); }}
                    className="w-8 h-8 rounded-lg border-2 border-pink-500 text-pink-500 flex items-center justify-center hover:bg-pink-50 active:scale-90 transition-all"
                    data-testid={`search-add-${idx}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

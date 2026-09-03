import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Plus, Minus, Package, ShoppingCart, Pill, AlertTriangle, Thermometer, Clock, ChevronDown, ChevronUp, Shield, Info, FlaskConical, Repeat2, ChevronLeft, ChevronRight, Ban, TrendingDown } from 'lucide-react';
import { lightTap } from '@/utils/haptics';
import { toast } from 'sonner';
import axios from 'axios';
import { ProductLicenseBadge } from '@/components/TrustBadges';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const InfoSection = ({ title, icon: Icon, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-stone-200/60 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3.5 text-left group"
        data-testid={`section-toggle-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.1)' }}>
            <Icon className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <span className="text-stone-700 text-sm font-semibold">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
      </button>
      {open && (
        <div className="pb-3.5 -mt-1 animate-in fade-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
    </div>
  );
};

const ProductDetailView = ({ product, onClose, onAddToCart, cartQuantity = 0, onIncrement, onDecrement, onSelectAlternative }) => {
  const [imgError, setImgError] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [alternatives, setAlternatives] = useState([]);
  const [altLoading, setAltLoading] = useState(false);
  const galleryRef = useRef(null);
  
  // Reset state when product changes (e.g. clicking an alternative)
  useEffect(() => {
    setImgError(false);
    setActiveImg(0);
  }, [product?.id, product?.name]);

  useEffect(() => {
    if (!product?.id) return;
    setAltLoading(true);
    setAlternatives([]);
    axios.get(`${API_URL}/api/pharmacy/v2/alternatives/${product.id}?limit=15`)
      .then(res => setAlternatives(res.data?.alternatives || []))
      .catch(() => {})
      .finally(() => setAltLoading(false));
  }, [product?.id]);
  if (!product) return null;
  const hasImage = (product.image || product.image_url) && !imgError;

  const handleAdd = () => {
    lightTap();
    onAddToCart(product);
  };

  // Get the first non-null, non-zero price value
  const priceValue = [product.price, product.sale_price, product.mrp].find(p => p && p > 0);
  const displayPrice = priceValue ? priceValue.toFixed(0) : null;

  const sideEffects = product.side_effects
    ? product.side_effects.split(/[|,]/).map(s => s.trim()).filter(Boolean)
    : [];

  const substitutes = product.substitutes || [];
  const uses = product.uses
    ? product.uses.split(/[,]/).map(s => s.trim()).filter(Boolean)
    : [];
  const productImages = (product.images || []).map(img => img.url).filter(Boolean);

  return (
    <div className="fixed inset-0 z-[10000] flex flex-col" style={{ background: '#FAFAF8' }} data-testid="product-detail-view">
      <style>{`
        @keyframes floatIn { from { opacity:0; transform:translateY(30px) scale(0.95); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes imgReveal { from { opacity:0; transform:scale(0.9); } to { opacity:1; transform:scale(1); } }
        .detail-float { animation: floatIn .5s cubic-bezier(0.2,0.8,0.2,1) both; }
        .detail-img { animation: imgReveal .6s cubic-bezier(0.2,0.8,0.2,1) both; }
      `}</style>

      {/* Subtle warm glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-[120px] pointer-events-none" style={{ background: 'rgba(249,115,22,0.06)' }} />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-8">
        {/* Top bar */}
        <div className="sticky top-0 z-20 px-4 py-3 flex items-center justify-between" style={{ background: 'rgba(250,250,248,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.15)' }}
            data-testid="product-detail-back"
          >
            <ArrowLeft className="w-5 h-5 text-orange-500" />
          </button>
          {product.prescription_required && (
            <span className="text-[10px] font-bold px-3 py-1 rounded-full" style={{ background: 'rgba(59,130,246,0.1)', color: '#2563EB', border: '1px solid rgba(59,130,246,0.2)' }}>
              Prescription Required
            </span>
          )}
        </div>

        {/* Product Image Gallery */}
        {hasImage && (
        <div className="relative pt-2 pb-4 px-4">
          <div className="detail-img w-full max-w-[300px] mx-auto aspect-square rounded-3xl overflow-hidden relative" style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
            <img
              src={productImages.length > 0 ? productImages[activeImg] : (product.image || product.image_url)}
              alt={product.name}
              className="w-full h-full object-contain p-4"
              loading="lazy"
              onError={() => setImgError(true)}
            />
            {product.discount_percent > 0 && (
              <span className="absolute top-3 left-3 text-white text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}>
                {product.discount_percent}% OFF
              </span>
            )}
          </div>
          {/* Thumbnail dots for multi-image */}
          {productImages.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-3">
              {productImages.slice(0, 8).map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImg(idx)}
                  className="rounded-full transition-all"
                  style={{
                    width: activeImg === idx ? 20 : 6,
                    height: 6,
                    background: activeImg === idx ? '#F97316' : 'rgba(0,0,0,0.12)',
                  }}
                />
              ))}
            </div>
          )}
        </div>
        )}

        {/* Main Info Card */}
        <div className="px-4">
          <div
            className="detail-float rounded-[28px] overflow-hidden relative"
            style={{
              background: 'rgba(255,255,255,0.8)',
              border: '1px solid rgba(0,0,0,0.06)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-orange-400/20 to-transparent" />

            <div className="p-5">
              {/* Name & Meta */}
              <p className="text-orange-500/60 text-[10px] font-bold tracking-wider uppercase mb-1.5">{product.form || product.unit || 'Medicine'}</p>
              <h1 className="text-stone-800 text-lg font-bold leading-snug" data-testid="product-detail-name">
                {product.name}
              </h1>
              {product.is_discontinued && (
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-red-600" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }} data-testid="discontinued-badge">
                  <Ban className="w-3 h-3" /> Discontinued
                </span>
              )}
              <p className="text-orange-500/70 text-xs font-semibold mt-1" data-testid="product-detail-company">
                {product.company || product.manufacturer || ''}
              </p>
              {product.is_starred && (
                <span className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold text-amber-700"
                  style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.1))', border: '1px solid rgba(245,158,11,0.25)' }}
                  data-testid="product-detail-top-brand-badge">
                  <svg className="w-3 h-3 fill-amber-500" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  Top Brand
                </span>
              )}

              {/* Composition */}
              {(product.composition || product.salt || product.generic_name) && (
                <div className="mt-3 px-3 py-2 rounded-xl" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)' }}>
                  <span className="text-[10px] text-emerald-600/60 font-bold uppercase tracking-wide">Composition</span>
                  <p className="text-stone-600 text-xs mt-0.5 leading-relaxed">{product.composition || product.salt || product.generic_name}</p>
                </div>
              )}

              {/* Uses */}
              {uses.length > 0 && (
                <div className="mt-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.12)' }}>
                  <span className="text-[10px] text-blue-600/60 font-bold uppercase tracking-wide">Uses</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {uses.map((u, i) => (
                      <span key={i} className="text-[10px] px-2.5 py-1 rounded-full font-medium text-blue-700/70" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)' }}>
                        {u}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Therapeutic Class & Habit Forming */}
              {(product.therapeutic_class || product.habit_forming) && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {product.therapeutic_class && (
                    <span className="text-[10px] font-medium px-2.5 py-1 rounded-full text-purple-600/70" style={{ background: 'rgba(147,51,234,0.06)', border: '1px solid rgba(147,51,234,0.12)' }}>
                      {product.therapeutic_class}
                    </span>
                  )}
                  {product.habit_forming && (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full text-red-600" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
                      Habit Forming
                    </span>
                  )}
                </div>
              )}

              {/* Substitutes */}
              {substitutes.length > 0 && (
                <div className="mt-3 px-3 py-2 rounded-xl" style={{ background: 'rgba(168,85,247,0.04)', border: '1px solid rgba(168,85,247,0.10)' }}>
                  <span className="text-[10px] text-purple-600/60 font-bold uppercase tracking-wide">Alternatives</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {substitutes.map((s, i) => (
                      <span key={i} className="text-[10px] px-2.5 py-1 rounded-full font-medium text-purple-700/60" style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.12)' }}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Packaging & Category row */}
              <div className="flex flex-wrap gap-2 mt-3">
                {product.packaging && (
                  <span className="text-[10px] font-medium px-2.5 py-1 rounded-full text-stone-500" style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)' }}>
                    {product.packaging}
                  </span>
                )}
                {product.category && (
                  <span className="text-[10px] font-medium px-2.5 py-1 rounded-full text-orange-600/70" style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.1)' }}>
                    {product.category}
                  </span>
                )}
              </div>

              {/* Price */}
              <div className="w-full h-[1px] my-4" style={{ background: 'rgba(0,0,0,0.06)' }} />
              <div className="flex items-end gap-2" data-testid="product-detail-price">
                {displayPrice ? (
                  <>
                    <span className="text-stone-800 font-black text-2xl">{'\u20B9'}{displayPrice}</span>
                    {product.mrp && (product.price || product.sale_price) && (product.price || product.sale_price) < product.mrp && (
                      <span className="text-stone-400 line-through text-sm mb-0.5">{'\u20B9'}{product.mrp.toFixed(0)}</span>
                    )}
                    {product.discount_percent > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-1 mb-0.5" style={{ background: 'rgba(34,197,94,0.1)', color: '#16A34A' }}>
                        {product.discount_percent}% OFF
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-orange-500 font-bold text-base" data-testid="call-to-confirm-price">Call to confirm price</span>
                )}
              </div>
              {displayPrice && !product.discount_percent && (
                <p className="text-[10px] text-stone-400 mt-1" data-testid="price-after-discount-note">
                  Price shown is after 15&ndash;20% discount
                </p>
              )}

              {/* Cart Action */}
              <div className="flex items-center justify-between mt-5">
                <button
                  onClick={onClose}
                  className="text-stone-400 text-sm font-medium hover:text-stone-600 transition-colors active:scale-95 px-2 py-2"
                  data-testid="product-detail-skip"
                >
                  Back
                </button>

                {cartQuantity > 0 ? (
                  <div className="flex items-center rounded-full overflow-hidden" style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)', boxShadow: '0 4px 16px rgba(249,115,22,0.3)' }}>
                    <button onClick={() => { lightTap(); onDecrement?.(); }} className="w-9 h-9 flex items-center justify-center text-white/90 hover:text-white transition-colors" data-testid="product-detail-decrement">
                      <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </button>
                    <span className="text-white font-bold text-sm px-2 min-w-[24px] text-center">{cartQuantity}</span>
                    <button onClick={() => { lightTap(); onIncrement?.(); }} className="w-9 h-9 flex items-center justify-center text-white/90 hover:text-white transition-colors" data-testid="product-detail-increment">
                      <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all active:scale-95 text-white"
                    style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)', boxShadow: '0 4px 16px rgba(249,115,22,0.3)' }}
                    data-testid="product-detail-add-cart"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    Add to Cart
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Expandable Detail Sections */}
        {(product.description || sideEffects.length > 0 || product.storage || product.how_to_use || product.how_it_works) && (
          <div className="px-4 mt-4">
            <div
              className="rounded-[24px] overflow-hidden px-5 py-1"
              style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.05)' }}
            >
              {product.description && (
                <InfoSection title="Description" icon={Info} defaultOpen={true}>
                  <p className="text-stone-500 text-xs leading-relaxed pl-9">{product.description}</p>
                </InfoSection>
              )}

              {product.how_it_works && (
                <InfoSection title="How It Works" icon={Pill}>
                  <p className="text-stone-500 text-xs leading-relaxed pl-9">{product.how_it_works}</p>
                </InfoSection>
              )}

              {product.how_to_use && (
                <InfoSection title="How To Use" icon={Clock}>
                  <p className="text-stone-500 text-xs leading-relaxed pl-9">{product.how_to_use}</p>
                </InfoSection>
              )}

              {sideEffects.length > 0 && (
                <InfoSection title="Side Effects" icon={AlertTriangle}>
                  <div className="flex flex-wrap gap-1.5 pl-9">
                    {sideEffects.map((effect, i) => (
                      <span key={i} className="text-[10px] px-2.5 py-1 rounded-full font-medium text-amber-700/70" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
                        {effect}
                      </span>
                    ))}
                  </div>
                </InfoSection>
              )}

              {product.safety_advise && (
                <InfoSection title="Safety Advice" icon={Shield}>
                  <p className="text-stone-500 text-xs leading-relaxed pl-9 whitespace-pre-line">{product.safety_advise}</p>
                </InfoSection>
              )}

              {product.storage && (
                <InfoSection title="Storage" icon={Thermometer}>
                  <p className="text-stone-500 text-xs leading-relaxed pl-9">{product.storage}</p>
                </InfoSection>
              )}
            </div>
          </div>
        )}

        {/* Alternatives Section — Card design with gradient Add to Cart */}
        {alternatives.length > 0 && (
          <div className="px-4 mt-4" data-testid="alternatives-section">
            <div className="rounded-[24px] overflow-hidden p-4" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.05)' }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.1)' }}>
                  <Repeat2 className="w-3.5 h-3.5 text-purple-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-700">Alternatives</h3>
                  <p className="text-[10px] text-stone-400">Same composition, different brands</p>
                </div>
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full text-purple-600" style={{ background: 'rgba(168,85,247,0.08)' }}>
                  {alternatives.length} found
                </span>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
                <style>{`.alt-scroll::-webkit-scrollbar{display:none}`}</style>
                {alternatives.map((alt) => (
                  <div
                    key={alt.id}
                    className="flex-shrink-0 w-[155px] rounded-2xl overflow-hidden transition-all hover:shadow-lg active:scale-[0.97] cursor-pointer"
                    style={{
                      background: 'linear-gradient(165deg, #FFFFFF 0%, #FFF7ED 60%, #FEF3C7 100%)',
                      border: '1px solid rgba(249,115,22,0.12)',
                      boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                    }}
                    data-testid={`alt-card-${alt.id}`}
                    onClick={() => {
                      lightTap();
                      if (onSelectAlternative) {
                        onSelectAlternative(alt);
                      }
                    }}
                  >
                    {/* Alt Image */}
                    <div className="w-full h-[100px] flex items-center justify-center bg-white relative">
                      {alt.image_url ? (
                        <img src={alt.image_url} alt={alt.name} className="w-full h-full object-contain p-3" loading="lazy" />
                      ) : (
                        <Pill className="w-8 h-8 text-orange-200" />
                      )}
                      {alt.savings > 0 && (
                        <span className="absolute top-1.5 right-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: 'linear-gradient(135deg, #22C55E, #16A34A)' }}>
                          Save {'\u20B9'}{alt.savings}
                        </span>
                      )}
                    </div>
                    {/* Info */}
                    <div className="px-2.5 pt-2 pb-2.5">
                      <p className="text-[11px] font-bold text-stone-800 leading-tight mb-0.5" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 28 }}>
                        {alt.name}
                      </p>
                      <p className="text-[9px] text-stone-400 truncate mb-2">{alt.manufacturer || alt.form || ''}</p>
                      <div className="flex items-end justify-between">
                        <div>
                          {alt.mrp > 0 ? (
                            <span className="text-sm font-black text-stone-800">{'\u20B9'}{alt.mrp}</span>
                          ) : (
                            <span className="text-[9px] font-semibold text-orange-500">Call to confirm</span>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            lightTap();
                            onAddToCart({
                              id: alt.id, name: alt.name,
                              price: alt.mrp || alt.sale_price || 0,
                              mrp: alt.mrp, quantity: 1, type: 'medicine',
                              image: alt.image_url, image_url: alt.image_url,
                              source: product.store || 'orange_pharmacy',
                            });
                          }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-bold text-white transition-all active:scale-90"
                          style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)', boxShadow: '0 3px 12px rgba(249,115,22,0.35)' }}
                          data-testid={`alt-add-cart-${alt.id}`}
                        >
                          <Plus className="w-3 h-3" strokeWidth={3} />
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* License & FSSAI Badge */}
        <ProductLicenseBadge />

        {/* Return & Refund Policy link */}
        <div className="mx-4 mt-2 mb-1 text-center">
          <a href="/return-refund-policy" className="text-[10px] text-stone-400 hover:text-orange-500 underline transition-colors" data-testid="product-return-policy-link">
            Return & Refund Policy
          </a>
        </div>

        {/* Bottom spacing */}
        <div className="h-8" />
      </div>
    </div>
  );
};

export default ProductDetailView;

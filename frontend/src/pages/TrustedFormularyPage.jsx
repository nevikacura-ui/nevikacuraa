import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, X, Loader2, Plus, Minus, ShoppingCart, ChevronDown, ChevronRight, Info, AlertTriangle, Pill, FlaskConical, Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useCart } from '@/context/CartContext';
import { lightTap } from '@/utils/haptics';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const getFormIcon = (form) => {
  const f = (form || '').toLowerCase();
  if (f.includes('tab') || f.includes('cap')) return 'fa-solid fa-pills';
  if (f.includes('syrup') || f.includes('liquid') || f.includes('susp')) return 'fa-solid fa-bottle-droplet';
  if (f.includes('cream') || f.includes('oint') || f.includes('gel') || f.includes('lotion')) return 'fa-solid fa-pump-medical';
  if (f.includes('drop')) return 'fa-solid fa-eye-dropper';
  if (f.includes('inject') || f.includes('inj')) return 'fa-solid fa-syringe';
  if (f.includes('shampoo')) return 'fa-solid fa-pump-soap';
  if (f.includes('powder') || f.includes('sachet') || f.includes('granule')) return 'fa-solid fa-mortar-pestle';
  return 'fa-solid fa-capsules';
};

const CAT_GRADIENTS = [
  'linear-gradient(135deg, #F97316, #EA580C)', 'linear-gradient(135deg, #EC4899, #DB2777)',
  'linear-gradient(135deg, #8B5CF6, #7C3AED)', 'linear-gradient(135deg, #3B82F6, #2563EB)',
  'linear-gradient(135deg, #10B981, #059669)', 'linear-gradient(135deg, #F59E0B, #D97706)',
  'linear-gradient(135deg, #EF4444, #DC2626)', 'linear-gradient(135deg, #06B6D4, #0891B2)',
  'linear-gradient(135deg, #6366F1, #4F46E5)', 'linear-gradient(135deg, #14B8A6, #0D9488)',
];

// ═══════════════════════════════════════
// MEDICINE DETAIL MODAL
// ═══════════════════════════════════════
const MedicineDetailModal = ({ medicine, onClose, onAddToCart, cartQty, onIncrement, onDecrement }) => {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [variants, setVariants] = useState([]);

  useEffect(() => {
    if (!medicine?.id) return;
    setLoading(true);
    Promise.all([
      axios.get(`${API}/api/emr/formulary/detail/${medicine.id}`).catch(() => ({ data: { medicine } })),
      axios.get(`${API}/api/emr/formulary/variants/${medicine.id}`).catch(() => ({ data: { variants: [] } })),
    ]).then(([detailRes, varRes]) => {
      setDetail(detailRes.data.medicine || medicine);
      setVariants(varRes.data.variants || []);
    }).finally(() => setLoading(false));
  }, [medicine]);

  if (!medicine) return null;

  const med = detail || medicine;
  const price = med.orange_price || med.sale_price || med.mrp;
  const hasDiscount = med.mrp && price && price < med.mrp;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center" data-testid="medicine-detail-modal">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
        <button onClick={onClose} className="absolute top-4 right-4 z-10 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center" data-testid="detail-close-btn">
          <X className="w-4 h-4 text-gray-600" />
        </button>

        <div className="p-5 pb-3">
          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 bg-gray-50 border border-gray-100">
              <i className={`${getFormIcon(med.form)} text-3xl text-gray-500`} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-gray-900 font-bold text-lg leading-tight" data-testid="detail-med-name">{med.name}</h2>
              <p className="text-gray-400 text-sm mt-1">{med.company || med.manufacturer || ''}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {med.form && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{med.form}</span>}
                {med.rx_type === 'H' && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">Rx</span>}
                {med.formulary_source === 'local_well' && <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">DiaGyn Verified</span>}
              </div>
            </div>
          </div>

          {/* FSSAI & DL Notice */}
          <div className="mt-3 flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
            <Shield className="w-4 h-4 text-blue-500 shrink-0" />
            <p className="text-blue-700 text-[10px] leading-tight">
              <span className="font-bold">FSSAI: 21525019003800</span> | <span className="font-bold">DL: MH-PL1-610138</span>
            </p>
          </div>

          <div className="flex items-center justify-between mt-4 py-3 border-t border-gray-100">
            <div>
              <span className="text-gray-900 font-bold text-xl">₹{price || '—'}</span>
              {hasDiscount && <span className="text-gray-400 text-sm line-through ml-2">₹{med.mrp}</span>}
            </div>
            {cartQty > 0 ? (
              <div className="flex items-center gap-3 bg-emerald-600 rounded-xl px-3 py-2">
                <button onClick={() => onDecrement(med)} className="text-white" data-testid="detail-decrement"><Minus className="w-4 h-4" /></button>
                <span className="text-white font-bold text-sm min-w-[20px] text-center">{cartQty}</span>
                <button onClick={() => onIncrement(med)} className="text-white" data-testid="detail-increment"><Plus className="w-4 h-4" /></button>
              </div>
            ) : (
              <button onClick={() => onAddToCart(med)} className="px-6 py-2.5 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 active:scale-95 transition-all" data-testid="detail-add-cart">
                Add to Cart
              </button>
            )}
          </div>
        </div>

        <div className="px-5 pb-5 space-y-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-orange-500 mr-2" />
              <span className="text-gray-400 text-sm">Loading medicine details...</span>
            </div>
          ) : (
            <>
              {med.ai_description && (
                <DetailSection title="Description" icon={Info} defaultOpen>
                  <p className="text-gray-600 text-sm leading-relaxed">{med.ai_description}</p>
                </DetailSection>
              )}
              {med.ai_uses?.length > 0 && (
                <DetailSection title="Uses" icon={Pill}>
                  <ul className="space-y-1.5">
                    {med.ai_uses.map((u, i) => <li key={i} className="text-gray-600 text-sm flex gap-2"><span className="text-orange-500 mt-0.5">•</span>{u}</li>)}
                  </ul>
                </DetailSection>
              )}
              {(med.ai_composition || med.composition) && (
                <DetailSection title="Composition" icon={FlaskConical}>
                  <p className="text-gray-600 text-sm">{med.ai_composition || med.composition}</p>
                </DetailSection>
              )}
              {med.ai_side_effects?.length > 0 && (
                <DetailSection title="Side Effects" icon={AlertTriangle}>
                  <ul className="space-y-1.5">
                    {med.ai_side_effects.map((s, i) => <li key={i} className="text-gray-600 text-sm flex gap-2"><span className="text-red-400 mt-0.5">•</span>{s}</li>)}
                  </ul>
                </DetailSection>
              )}
              {med.ai_how_to_use && (
                <DetailSection title="How to Use" icon={Shield}>
                  <p className="text-gray-600 text-sm">{med.ai_how_to_use}</p>
                </DetailSection>
              )}
              {med.ai_storage && (
                <DetailSection title="Storage" icon={Info}>
                  <p className="text-gray-600 text-sm">{med.ai_storage}</p>
                </DetailSection>
              )}
            </>
          )}

          {variants.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-gray-700 font-semibold text-sm mb-2">Other Sizes / Variants</p>
              {variants.map((v) => (
                <div key={v.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-gray-800 text-sm font-medium">{v.name}</p>
                    <p className="text-gray-400 text-xs">{v.form}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-900 font-bold text-sm">₹{v.orange_price || v.sale_price || v.mrp}</span>
                    <button onClick={() => onAddToCart(v)} className="px-3 py-1 border-2 border-emerald-600 text-emerald-600 rounded-lg text-xs font-bold hover:bg-emerald-50 active:scale-95" data-testid={`variant-add-${v.id}`}>
                      ADD
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DetailSection = ({ title, icon: Icon, children, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-3 text-left">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.1)' }}>
            <Icon className="w-3 h-3 text-orange-500" />
          </div>
          <span className="text-gray-700 text-sm font-semibold">{title}</span>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="pb-3 -mt-1">{children}</div>}
    </div>
  );
};

// ═══════════════════════════════════════
// SIZE PICKER POPUP
// ═══════════════════════════════════════
const SizePickerPopup = ({ medicine, variants, onAdd, onClose }) => {
  const allOptions = [medicine, ...variants];
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center" data-testid="size-picker-popup">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-2xl p-4 animate-in slide-in-from-bottom duration-200">
        <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center" data-testid="size-picker-close">
          <X className="w-4 h-4 text-white" />
        </button>
        <h3 className="text-gray-900 font-bold text-base mb-1">Choose variant</h3>
        <p className="text-gray-400 text-xs mb-3">{allOptions.length} options available</p>
        {allOptions.map((v) => {
          const vPrice = v.orange_price || v.sale_price || v.mrp;
          return (
            <div key={v.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gray-50 border border-gray-100">
                  <i className={`${getFormIcon(v.form)} text-lg text-gray-500`} />
                </div>
                <div>
                  <p className="text-gray-800 text-sm font-medium">{v.name}</p>
                  <p className="text-gray-400 text-xs">{v.form}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-900 font-bold text-sm">₹{vPrice}</span>
                <button onClick={() => { onAdd(v); onClose(); }} className="px-4 py-1.5 border-2 border-emerald-600 text-emerald-600 rounded-lg text-xs font-bold hover:bg-emerald-50 active:scale-95" data-testid={`size-add-${v.id}`}>
                  ADD
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════
const OrangeSelectPage = () => {
  const navigate = useNavigate();
  const { pharmacyCart, addToPharmacyCart, removeFromPharmacyCart, updatePharmacyQuantity } = useCart();

  const [categories, setCategories] = useState([]);
  const [totalMeds, setTotalMeds] = useState(0);
  const [activeCat, setActiveCat] = useState('all');
  const [medicines, setMedicines] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [selectedMed, setSelectedMed] = useState(null);
  const [sizePickerMed, setSizePickerMed] = useState(null);
  const [sizePickerVariants, setSizePickerVariants] = useState([]);

  const scrollRef = useRef(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    axios.get(`${API}/api/emr/formulary/categories`)
      .then(res => {
        setCategories(res.data.categories || []);
        setTotalMeds(res.data.total_medicines || 0);
      }).catch(() => {});
  }, []);

  const loadMedicines = useCallback(async (pageNum, category, append = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const catParam = category && category !== 'all' ? `&category=${encodeURIComponent(category)}` : '';
      const res = await axios.get(`${API}/api/emr/formulary/all?page=${pageNum}&limit=30${catParam}`);
      const data = res.data;
      if (append) {
        setMedicines(prev => [...prev, ...(data.medicines || [])]);
      } else {
        setMedicines(data.medicines || []);
      }
      setHasMore(data.has_more);
      setPage(pageNum);
    } catch { /* ignore */ }
    finally { setLoading(false); setInitialLoad(false); loadingRef.current = false; }
  }, []);

  useEffect(() => { loadMedicines(1, 'all'); }, [loadMedicines]);

  const handleCategoryChange = (cat) => {
    setActiveCat(cat);
    setMedicines([]);
    setPage(1);
    setHasMore(true);
    loadMedicines(1, cat);
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !hasMore || loading) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 400) {
      loadMedicines(page + 1, activeCat, true);
    }
  }, [hasMore, loading, page, activeCat, loadMedicines]);

  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await axios.get(`${API}/api/emr/formulary/search?q=${encodeURIComponent(searchQuery)}&limit=30`);
        setSearchResults(res.data.medicines || []);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Cart helpers
  const getCartQty = (med) => {
    const item = pharmacyCart.find(c => c.id === med.id || c.name === med.name);
    return item?.quantity || 0;
  };

  const handleAddToCart = (med) => {
    lightTap();
    const price = med.orange_price || med.sale_price || med.mrp;
    addToPharmacyCart({
      id: med.id || med.name, name: med.name, price, mrp: med.mrp,
      quantity: 1, type: 'medicine', form: med.form, discount_percent: 0,
    });
    toast.success(`${med.name} added`);
  };

  const handleIncrement = (med) => {
    const item = pharmacyCart.find(c => c.id === med.id || c.name === med.name);
    if (item) updatePharmacyQuantity(item.name, item.quantity + 1);
  };

  const handleDecrement = (med) => {
    const item = pharmacyCart.find(c => c.id === med.id || c.name === med.name);
    if (item) {
      if (item.quantity === 1) removeFromPharmacyCart(item.name);
      else updatePharmacyQuantity(item.name, item.quantity - 1);
    }
  };

  const handleAddClick = async (med, e) => {
    e.stopPropagation();
    try {
      const res = await axios.get(`${API}/api/emr/formulary/variants/${med.id}`);
      if ((res.data.variants || []).length > 0) {
        setSizePickerMed(med);
        setSizePickerVariants(res.data.variants);
        return;
      }
    } catch { /* ignore */ }
    handleAddToCart(med);
  };

  const displayMeds = searchQuery.length >= 2 ? searchResults : medicines;

  // BLINKIT CARD
  const BlinkitCard = ({ med, idx }) => {
    const iconClass = getFormIcon(med.form);
    const price = med.orange_price || med.sale_price || med.mrp;
    const hasDiscount = med.mrp && price && price < med.mrp;
    const qty = getCartQty(med);

    return (
      <div
        className="bg-white rounded-xl border border-gray-100 overflow-hidden flex flex-col cursor-pointer active:scale-[0.97] transition-transform"
        onClick={() => setSelectedMed(med)}
        data-testid={`os-card-${idx}`}
      >
        <div className="relative w-full aspect-square flex items-center justify-center bg-white border-b border-gray-50">
          <i className={`${iconClass} text-3xl`} style={{ color: '#D1D5DB' }} />
          <div className="absolute bottom-1.5 right-1.5" onClick={(e) => e.stopPropagation()}>
            {qty > 0 ? (
              <div className="flex items-center gap-1.5 bg-emerald-600 rounded-lg px-2 py-0.5">
                <button onClick={() => handleDecrement(med)} className="text-white" data-testid={`os-dec-${idx}`}><Minus className="w-3 h-3" /></button>
                <span className="text-white font-bold text-[10px] min-w-[14px] text-center">{qty}</span>
                <button onClick={() => handleIncrement(med)} className="text-white" data-testid={`os-inc-${idx}`}><Plus className="w-3 h-3" /></button>
              </div>
            ) : (
              <button onClick={(e) => handleAddClick(med, e)}
                className="px-3 py-1 rounded-lg border-2 border-emerald-600 bg-white text-emerald-600 font-bold text-xs hover:bg-emerald-50 active:scale-95 transition-all"
                data-testid={`os-add-${idx}`}>
                ADD
              </button>
            )}
          </div>
          {med.rx_type === 'H' && (
            <span className="absolute top-1.5 left-1.5 text-[8px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded border border-amber-300">Rx</span>
          )}
        </div>
        <div className="p-2 flex-1 flex flex-col">
          {med.form && <span className="text-[9px] text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded self-start mb-1">{med.form}</span>}
          <p className="text-gray-800 font-semibold text-[11px] leading-tight line-clamp-2 mb-auto" style={{ minHeight: '26px' }}>{med.name}</p>
          <p className="text-gray-400 text-[8px] truncate mt-0.5">{med.company || med.manufacturer || ''}</p>
          <div className="flex items-baseline gap-1 mt-1.5">
            <span className="text-gray-900 font-bold text-xs">{price ? `₹${price}` : ''}</span>
            {hasDiscount && <span className="text-gray-400 text-[9px] line-through">₹{med.mrp}</span>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-white" data-testid="orange-select-page">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white shrink-0" style={{ borderBottom: '1px solid #F3F4F6' }}>
        <div className="flex items-center gap-3 px-4 py-2.5">
          <button data-testid="orange-select-back-btn" onClick={() => navigate(-1)}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-700" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-base">
              <span style={{ color: '#EA580C' }}>Orange</span>{' '}
              <span className="text-gray-900">Select</span>
            </h1>
            <p className="text-gray-400 text-[10px]">{totalMeds} verified medicines</p>
          </div>
          <button onClick={() => navigate('/pharmacy')} className="relative" data-testid="os-cart-btn">
            <ShoppingCart className="w-5 h-5 text-gray-700" />
            {pharmacyCart.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center">
                {pharmacyCart.reduce((s, i) => s + (i.quantity || 0), 0)}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              data-testid="os-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search medicines, compositions..."
              className="pl-10 pr-10 h-9 rounded-xl border-gray-200 bg-gray-50 text-gray-800 text-sm"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            )}
            {searching && <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 px-4 pb-2.5 overflow-x-auto scrollbar-hide" data-testid="os-category-pills">
          <button
            onClick={() => handleCategoryChange('all')}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${activeCat === 'all' ? 'text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}
            style={activeCat === 'all' ? { background: 'linear-gradient(135deg, #F97316, #EA580C)' } : {}}
            data-testid="os-pill-all"
          >
            All
          </button>
          {categories.map((cat, i) => (
            <button
              key={cat.name}
              onClick={() => handleCategoryChange(cat.name)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${activeCat === cat.name ? 'text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200'}`}
              style={activeCat === cat.name ? { background: CAT_GRADIENTS[i % CAT_GRADIENTS.length] } : {}}
              data-testid={`os-pill-${cat.name}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </header>

      {/* HERO BANNER */}
      <div className="mx-4 mt-3 rounded-2xl overflow-hidden shrink-0" style={{ background: '#1A1A2E' }} data-testid="os-hero-banner">
        <div className="p-4 flex items-center gap-4">
          <img src="/orange_select_logo.png" alt="Orange Select" className="h-14 w-auto object-contain" data-testid="os-hero-logo" />
          <div>
            <p className="text-white/50 text-[10px] font-medium tracking-wider uppercase">Curated by DiaGyn Healthcare</p>
            <p className="text-white/90 text-sm mt-0.5 font-medium">{totalMeds} quality-assured medicines</p>
            <p className="text-white/40 text-[9px] mt-1">FSSAI: 21525019003800 | DL: MH-PL1-610138</p>
          </div>
        </div>
      </div>

      {/* MEDICINE GRID (INFINITE SCROLL) */}
      <main ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 pt-3 pb-32" data-testid="os-medicine-grid">
        {searchQuery.length >= 2 && (
          <p className="text-gray-500 text-xs mb-2">{searchResults.length} results for "{searchQuery}"</p>
        )}

        {initialLoad ? (
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden border border-gray-100 animate-pulse">
                <div className="w-full aspect-square bg-gray-50" />
                <div className="p-2 space-y-2"><div className="h-2 bg-gray-100 rounded w-3/4" /><div className="h-2 bg-gray-100 rounded w-1/2" /></div>
              </div>
            ))}
          </div>
        ) : displayMeds.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {displayMeds.map((med, i) => <BlinkitCard key={`${med.id}-${i}`} med={med} idx={i} />)}
          </div>
        ) : (
          <div className="text-center py-12"><p className="text-gray-400 text-sm">No medicines found</p></div>
        )}

        {loading && !initialLoad && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-orange-500 mr-2" />
            <span className="text-gray-400 text-sm">Loading more...</span>
          </div>
        )}
        {!hasMore && medicines.length > 0 && !searchQuery && (
          <p className="text-center text-gray-400 text-xs py-4">All {medicines.length} medicines loaded</p>
        )}
      </main>

      {/* MODALS */}
      {selectedMed && (
        <MedicineDetailModal
          medicine={selectedMed}
          onClose={() => setSelectedMed(null)}
          onAddToCart={handleAddToCart}
          cartQty={getCartQty(selectedMed)}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
        />
      )}
      {sizePickerMed && (
        <SizePickerPopup
          medicine={sizePickerMed}
          variants={sizePickerVariants}
          onAdd={handleAddToCart}
          onClose={() => { setSizePickerMed(null); setSizePickerVariants([]); }}
        />
      )}
    </div>
  );
};

export default OrangeSelectPage;

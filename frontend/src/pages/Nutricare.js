import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Plus, Minus, Package, ShoppingCart, Star, Loader2, Truck, Shield, Clock, HeartPulse, Pill, Sparkles, Phone, PenLine, X, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { lightTap } from '@/utils/haptics';
import { getDiscountPercent, getDiscountedPrice } from '@/utils/discountUtils';
import { ProductPlaceholder } from '@/components/ProductPlaceholder';
import { useCart } from '@/context/CartContext';
import MembershipLinkBanner from '@/components/MembershipLinkBanner';
import ServiceHeader from '@/components/ServiceHeader';
import ProductDetailView from '@/components/ProductDetailView';
import { ExpressReorder } from '@/components/ExpressReorder';
import SearchFilterSheet from '@/components/SearchFilterSheet';
import DeliveryBar from '@/components/DeliveryBar';
import { CrossSellBanner } from '@/components/CrossSellBanner';
import { RecentlyViewedSection, TrendingNowSection, trackMedicineView } from '@/components/pharmacy/TrendingRecentSections';
import { PullToRefreshContainer } from '@/components/ui/pull-to-refresh';
import { addRecentSearch } from '@/components/SearchSuggestions';
import SearchSuggestions from '@/components/SearchSuggestions';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const STORE = 'orange_healthplus';

// InfiniteScrollTrigger
const InfiniteScrollTrigger = ({ onVisible }) => {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onVisible(); },
      { rootMargin: '400px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onVisible]);
  return (
    <div ref={ref} className="flex items-center justify-center py-6" data-testid="infinite-scroll-trigger">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-orange-500/40 animate-pulse" />
        <div className="w-2 h-2 rounded-full bg-orange-500/60 animate-pulse" style={{ animationDelay: '0.2s' }} />
        <div className="w-2 h-2 rounded-full bg-orange-500/80 animate-pulse" style={{ animationDelay: '0.4s' }} />
      </div>
    </div>
  );
};

const Nutricare = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const { pharmacyCart, addToPharmacyCart, removeFromPharmacyCart, updatePharmacyQuantity } = useCart();
  const searchTimeoutRef = useRef(null);
  const nutriLightRef = useRef(null);
  const [nutriHeaderLight, setNutriHeaderLight] = useState(false);
  const [showCustomProduct, setShowCustomProduct] = useState(false);
  const [customProductName, setCustomProductName] = useState('');
  const [customProductQty, setCustomProductQty] = useState(1);
  const [searchFocused, setSearchFocused] = useState(false);

  // Advanced filter state
  const [filterSearch, setFilterSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [sortBy, setSortBy] = useState('');

  const handleFilterChange = (key, value) => {
    setFilters(prev => prev[key] === value ? { ...prev, [key]: '' } : { ...prev, [key]: value });
  };
  const clearAllFilters = () => { setFilters({}); setSortBy(''); setFilterSearch(''); };

  useEffect(() => {
    const handleScroll = () => {
      setNutriHeaderLight(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch categories on mount
  useEffect(() => {
    axios.get(`${API_URL}/api/pharmacy/categories?store=${STORE}`)
      .then(res => setCategories(res.data.categories || []))
      .catch(() => {});
    axios.get(`${API_URL}/api/pharmacy/count?store=${STORE}`)
      .then(res => setTotalCount(res.data.total || 0))
      .catch(() => {});
  }, []);

  // Fetch products
  const fetchProducts = useCallback(async (cat = null, pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      const params = new URLSearchParams({ page: pageNum, per_page: 40, store: STORE });
      if (cat) params.append('category', cat);
      const res = await axios.get(`${API_URL}/api/pharmacy/all?${params}`);
      const data = res.data;
      if (append) {
        setProducts(prev => [...prev, ...data.medicines]);
      } else {
        setProducts(data.medicines);
      }
      setTotalCount(data.total || 0);
      setHasMore(data.medicines.length === 40);
    } catch (err) {
      console.error('Failed to fetch HealthPlus products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchProducts(selectedCategory, 1);
  }, [selectedCategory, fetchProducts]);

  // Search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await axios.get(`${API_URL}/api/pharmacy/search?q=${encodeURIComponent(searchTerm)}&limit=10&store=${STORE}`);
        setSearchResults(res.data.medicines || []);
      } catch (e) {
        console.error('Search failed:', e);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchTerm]);

  const loadingMoreRef = useRef(false);
  const loadMore = useCallback(() => {
    if (!hasMore || loading || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    const next = page + 1;
    setPage(next);
    fetchProducts(selectedCategory, next, true).finally(() => {
      loadingMoreRef.current = false;
    });
  }, [hasMore, loading, page, selectedCategory, fetchProducts]);

  const handleAddToCart = (product) => {
    lightTap();
    const price = product.price || product.sale_price || product.mrp;
    addToPharmacyCart({
      id: product.id || product.name,
      name: product.name,
      price,
      mrp: product.mrp,
      quantity: 1,
      type: 'medicine',
      form: product.form,
      image: product.image_url,
      source: 'orange_healthplus',
      discount_percent: product.discount_percent || 0,
    });
  };

  const getCartQty = (product) => {
    const item = pharmacyCart.find(c => c.id === product.id || c.name === product.name);
    return item?.quantity || 0;
  };

  const handleIncrement = (product) => {
    const item = pharmacyCart.find(c => c.id === product.id || c.name === product.name);
    if (item) updatePharmacyQuantity(item.name, item.quantity + 1);
  };

  const handleDecrement = (product) => {
    const item = pharmacyCart.find(c => c.id === product.id || c.name === product.name);
    if (item) {
      if (item.quantity === 1) removeFromPharmacyCart(item.name);
      else updatePharmacyQuantity(item.name, item.quantity - 1);
    }
  };

  const cartCount = pharmacyCart.reduce((sum, item) => sum + item.quantity, 0);

  const handleAddCustomProduct = () => {
    if (!customProductName.trim()) {
      toast.error('Please enter product name');
      return;
    }
    addToPharmacyCart({
      id: `custom_hp_${Date.now()}`,
      name: customProductName.trim(),
      quantity: customProductQty,
      price: 0,
      isCustom: true,
      source: 'orange_healthplus',
      description: 'Custom order - Price to be confirmed'
    });
    toast.success(`${customProductName.trim()} added to cart`);
    setCustomProductName('');
    setCustomProductQty(1);
    setShowCustomProduct(false);
  };

  // Apply advanced filters + sort
  const filteredProducts = useMemo(() => {
    let result = [...products];
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      result = result.filter(m => m.name?.toLowerCase().includes(q) || m.manufacturer?.toLowerCase().includes(q));
    }
    if (filters.priceRange === 'under100') result = result.filter(m => (m.price || m.sale_price || m.mrp || 0) <= 100);
    else if (filters.priceRange === '100to500') result = result.filter(m => { const p = m.price || m.sale_price || m.mrp || 0; return p >= 100 && p <= 500; });
    else if (filters.priceRange === 'above500') result = result.filter(m => (m.price || m.sale_price || m.mrp || 0) > 500);
    if (filters.form) {
      result = result.filter(m => (m.form || m.unit || m.category || '').toLowerCase().includes(filters.form.toLowerCase()));
    }
    if (sortBy === 'price_low') result.sort((a, b) => (a.price || a.sale_price || a.mrp || 0) - (b.price || b.sale_price || b.mrp || 0));
    else if (sortBy === 'price_high') result.sort((a, b) => (b.price || b.sale_price || b.mrp || 0) - (a.price || a.sale_price || a.mrp || 0));
    else if (sortBy === 'name_az') result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return result;
  }, [products, filterSearch, filters, sortBy]);

  return (
    <div className="dark-page min-h-screen pb-24" style={{ background: '#050510' }} data-testid="nutricare-page">
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .prod-card { animation: fadeUp .4s ease-out both; }
        .prod-card:nth-child(odd) { animation-delay: .05s; }
        .prod-card:nth-child(even) { animation-delay: .1s; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <ServiceHeader currentService="orange" lightMode={nutriHeaderLight} />
      <DeliveryBar lightMode={nutriHeaderLight} />

      {/* Top bar */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-3">
        <button
          onClick={() => navigate('/orange')}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          data-testid="back-btn"
        >
          <ArrowLeft className="w-4.5 h-4.5 text-white/60" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Orange <span className="text-orange-400">HealthPlus</span>
          </h1>
          <span className="text-[9px] text-white/40 font-medium">{totalCount.toLocaleString()} Products</span>
        </div>
        <button
          onClick={() => navigate('/pharmacy/checkout')}
          className="w-9 h-9 rounded-full flex items-center justify-center relative"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          data-testid="cart-btn"
        >
          <ShoppingCart className="w-4 h-4 text-white/60" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-orange-500 text-[9px] font-bold text-white flex items-center justify-center">{cartCount}</span>
          )}
        </button>
      </div>

      {/* How to Order — Compact Banner */}
      <div className="px-4 pb-2">
        <button
          onClick={() => navigate('/orange')}
          className="w-full flex items-center gap-2.5 py-2 px-3.5 rounded-xl active:scale-[0.98] transition-all"
          style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.18)' }}
          data-testid="how-to-order-compact"
        >
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}>
            <ShoppingCart className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-xs font-bold text-orange-300 flex-1 text-left">How to Order</span>
          <span className="text-[9px] text-orange-400/50 font-medium">3 steps</span>
          <svg className="w-3.5 h-3.5 text-orange-400/50 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>

      {/* Ad Banner */}
      <div className="px-4 pt-2 pb-2" data-testid="healthplus-ad-banner">
        <div className="rounded-2xl overflow-hidden shadow-lg">
          <img 
            src="https://customer-assets.emergentagent.com/job_01480bc3-1b88-4fd4-acd8-ac889f74ac9d/artifacts/sher23kb_file_000000001b40720888cf157224a44203.png" 
            alt="Orange HealthPlus" 
            className="w-full h-auto" 
            loading="lazy" 
          />
        </div>
      </div>

      {/* Logo Hero Section */}
      <div className="relative overflow-hidden" data-testid="healthplus-logo-hero">
        <div className="absolute inset-0 bg-black" />
        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-gradient-to-t from-orange-500/50 via-orange-500/25 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-[55%] left-1/2 -translate-x-1/2 w-[500px] h-[150px] bg-orange-500/40 rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-0 right-0 h-24">
          <svg viewBox="0 0 1440 120" fill="none" preserveAspectRatio="none" className="w-full h-full">
            <path d="M0,120 L0,60 Q180,20 360,50 T720,30 T1080,60 T1440,40 L1440,120 Z" fill="black" opacity="0.9" />
            <path d="M0,120 L0,80 Q240,40 480,70 T960,50 T1440,80 L1440,120 Z" fill="black" />
          </svg>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 pt-6 pb-10">
          <div className="text-center mb-4">
            <div className="flex justify-center mb-3">
              <img 
                src="https://customer-assets.emergentagent.com/job_01480bc3-1b88-4fd4-acd8-ac889f74ac9d/artifacts/uv6w9jk0_4739-removebg-preview.png" 
                alt="Orange HealthPlus Logo"
                className="h-52 md:h-60 lg:h-72 w-auto object-contain"
                style={{ filter: 'drop-shadow(0 0 25px rgba(249, 115, 22, 0.4))' }}
                decoding="async"
                fetchPriority="high"
                data-testid="healthplus-logo"
              />
            </div>
            <p className="text-orange-100/80 text-xs font-medium">
              {totalCount > 0 ? `${totalCount.toLocaleString()}+ products at your doorstep` : 'Your trusted health store'}
            </p>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="px-4 pb-3 relative">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onKeyDown={e => { if (e.key === 'Enter' && searchTerm) { addRecentSearch(searchTerm); setSearchFocused(false); } }}
            placeholder="Search health products..."
            className="w-full h-11 pl-10 pr-4 rounded-2xl text-white text-sm placeholder-white/20 outline-none transition-all focus:ring-1 focus:ring-orange-500/30"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            data-testid="product-search"
          />
        </div>

        {/* Search Suggestions (focused + empty) */}
        <SearchSuggestions
          visible={searchFocused && !searchTerm}
          onSelect={(term) => { addRecentSearch(term); setSearchTerm(term); setSearchFocused(false); }}
          onClose={() => setSearchFocused(false)}
          store="nutricare"
        />
        {searchFocused && !searchTerm && <div className="fixed inset-0 z-40" onClick={() => setSearchFocused(false)} />}

        {/* Search results dropdown */}
        {searchTerm && (searchResults.length > 0 || searchLoading) && (
          <div className="absolute left-4 right-4 top-full mt-1 rounded-2xl shadow-xl max-h-72 overflow-y-auto z-50"
            style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(0,0,0,0.08)' }}
            data-testid="search-results-dropdown"
          >
            {searchLoading ? (
              <div className="p-6 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-orange-500" /></div>
            ) : searchResults.map((med, idx) => (
              <button
                key={idx}
                onClick={() => { trackMedicineView(med); setSelectedProduct(med); setSearchTerm(''); setSearchResults([]); }}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-orange-50/60 border-b border-stone-100 last:border-0 text-left transition-colors"
                data-testid={`search-result-${idx}`}
              >
                {med.image_url ? (
                  <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <img src={med.image_url} alt={med.name} className="w-full h-full object-contain p-0.5" loading="lazy" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200/50 flex items-center justify-center flex-shrink-0">
                    <Package className="w-5 h-5 text-orange-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-stone-800 text-sm truncate">{med.name}</p>
                  <p className="text-xs text-stone-400 truncate">{med.category}{med.manufacturer ? ` · ${med.manufacturer}` : ''}</p>
                </div>
                <span className="font-bold text-orange-600 text-sm flex-shrink-0">{'\u20B9'}{med.mrp?.toFixed(0)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Free Home Delivery Banner */}
      <div className="px-4 pb-3">
        <div className="relative overflow-hidden rounded-2xl py-3 px-4"
          style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(249,115,22,0.05))', border: '1px solid rgba(249,115,22,0.2)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}>
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white text-sm font-bold">Free Home Delivery</p>
              <p className="text-orange-300/60 text-[11px]">On orders above ₹1,000</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Feature Highlights */}
      <div className="px-4 pb-4 flex gap-2">
        {[
          { Icon: Shield, label: 'Genuine', sub: 'Products' },
          { Icon: Clock, label: 'Express', sub: 'Delivery' },
          { Icon: HeartPulse, label: 'Health', sub: 'Experts' },
        ].map((feat, i) => (
          <div key={i} className="flex-1 rounded-xl py-2.5 px-2 text-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            data-testid={`feature-badge-${i}`}
          >
            <feat.Icon className="w-4 h-4 mx-auto mb-1 text-orange-400" />
            <p className="text-[10px] font-bold text-white/80">{feat.label}</p>
            <p className="text-[8px] text-white/40">{feat.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick Action Cards */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-2 gap-3">
          <a
            href="/pharmacy"
            className="rounded-2xl p-3.5 text-left transition-all active:scale-[0.98] group"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            data-testid="action-pharmacy-link"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}>
                <Pill className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-white text-xs">Orange Pharmacy</p>
                <p className="text-[9px] text-orange-400/60">Prescription meds</p>
              </div>
            </div>
          </a>
          <button
            onClick={() => setShowCustomProduct(true)}
            className="rounded-2xl p-3.5 text-left transition-all active:scale-[0.98] group"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            data-testid="action-custom-product"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' }}>
                <PenLine className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-white text-xs">Request Product</p>
                <p className="text-[9px] text-violet-400/60">Can't find? Type it</p>
              </div>
            </div>
          </button>
          <a
            href="/diagyn"
            className="rounded-2xl p-3.5 text-left transition-all active:scale-[0.98] group"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            data-testid="action-consult-doctor"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-white text-xs">Consult Doctor</p>
                <p className="text-[9px] text-emerald-400/60">Book online</p>
              </div>
            </div>
          </a>
          <a
            href="tel:+917039030030"
            className="rounded-2xl p-3.5 text-left transition-all active:scale-[0.98] group"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            data-testid="action-call-support"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #06B6D4, #0891B2)' }}>
                <Phone className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-white text-xs">Call Support</p>
                <p className="text-[9px] text-cyan-400/60">Talk to an expert</p>
              </div>
            </div>
          </a>
        </div>
      </div>

      {/* Popular Health Products — Quick Access */}
      <div className="px-4 pb-4" data-testid="popular-health-products">
        <h3 className="text-white/80 font-bold text-xs mb-2.5">Popular Health Products</h3>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {['Blood Pressure Monitor', 'Glucometer', 'Pulse Oximeter', 'Thermometer', 'Nebulizer', 'Weighing Scale', 'Protein Powder', 'Multivitamin'].map((name, i) => (
            <button key={i}
              onClick={() => setSearchTerm(name)}
              className="flex-shrink-0 px-3 py-2 rounded-xl text-[11px] font-medium text-white/60 hover:bg-orange-500/10 hover:border-orange-500/30 hover:text-orange-300 transition-all active:scale-95"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              data-testid={`popular-hp-${i}`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ Dark → Warm Cream Transition ═══ */}
      <div style={{ background: 'linear-gradient(180deg, #050510 0%, #1c1210 35%, #FFF8F0 100%)', height: '80px' }} data-testid="nutricare-theme-transition" />

      {/* ═══ LIGHT ZONE — Product Browsing ═══ */}
      <div className="bg-[#FFF8F0] pb-32" ref={nutriLightRef} data-testid="nutricare-light-zone">

      {/* Quick Reorder */}
      <div className="px-4 pb-3">
        <ExpressReorder />
      </div>

      {/* Trending Now */}
      <TrendingNowSection onSelect={(med) => { trackMedicineView(med); setSelectedProduct(med); }} store="orange_healthplus" />

      {/* Recently Viewed */}
      <RecentlyViewedSection onSelect={(med) => { trackMedicineView(med); setSelectedProduct(med); }} />

      {/* Category pills - from database */}
      <div className="px-4 pb-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => { lightTap(); setSelectedCategory(null); }}
            className="flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all active:scale-95"
            style={{
              background: !selectedCategory ? 'linear-gradient(135deg, #F97316, #EA580C)' : '#f5f0eb',
              color: !selectedCategory ? '#fff' : '#78716c',
              border: `1px solid ${!selectedCategory ? 'transparent' : '#e7e0d9'}`,
              boxShadow: !selectedCategory ? '0 4px 16px rgba(249,115,22,0.25)' : 'none',
            }}
            data-testid="pill-all"
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat.name}
              onClick={() => { lightTap(); setSelectedCategory(selectedCategory === cat.name ? null : cat.name); }}
              className="flex-shrink-0 px-3 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 whitespace-nowrap"
              style={{
                background: selectedCategory === cat.name ? 'linear-gradient(135deg, #F97316, #EA580C)' : '#f5f0eb',
                color: selectedCategory === cat.name ? '#fff' : '#78716c',
                border: `1px solid ${selectedCategory === cat.name ? 'transparent' : '#e7e0d9'}`,
                boxShadow: selectedCategory === cat.name ? '0 4px 16px rgba(249,115,22,0.25)' : 'none',
              }}
              data-testid={`pill-${cat.name}`}
            >
              {cat.name} <span className="text-[9px] opacity-60">({cat.count.toLocaleString()})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Products count + section title */}
      <div className="px-4 pb-2">
        <h2 className="text-lg font-bold text-stone-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
          {selectedCategory ? selectedCategory : 'All '}
          {!selectedCategory && <span className="text-orange-500">Health Products</span>}
        </h2>
        <p className="text-stone-400 text-xs font-medium mt-0.5">
          {loading ? 'Loading...' : `${filteredProducts.length} of ${totalCount.toLocaleString()} products`}
          {selectedCategory && ` in ${selectedCategory}`}
        </p>
      </div>

      {/* Advanced Filters */}
      <div className="px-4 pb-3" data-testid="nutricare-search-filters">
        <SearchFilterSheet
          searchValue={filterSearch}
          onSearchChange={setFilterSearch}
          placeholder="Filter products, brands..."
          accentColor="#f97316"
          lightMode={true}
          filters={[
            { key: 'priceRange', label: 'Price Range', options: [
              { value: 'under100', label: 'Under ₹100' },
              { value: '100to500', label: '₹100 - ₹500' },
              { value: 'above500', label: 'Above ₹500' },
            ]},
            { key: 'form', label: 'Type', options: [
              { value: 'Device', label: 'Devices' },
              { value: 'Supplement', label: 'Supplements' },
              { value: 'Cream', label: 'Cream/Ointment' },
              { value: 'Powder', label: 'Powder' },
              { value: 'Capsule', label: 'Capsules' },
              { value: 'Syrup', label: 'Syrup' },
            ]},
          ]}
          activeFilters={filters}
          onFilterChange={handleFilterChange}
          sortOptions={[
            { value: 'price_low', label: 'Price: Low to High' },
            { value: 'price_high', label: 'Price: High to Low' },
            { value: 'name_az', label: 'Name: A to Z' },
          ]}
          activeSort={sortBy}
          onSortChange={setSortBy}
          quickChips={[
            { label: 'Under ₹100', key: 'priceRange', value: 'under100' },
            { label: 'Devices', key: 'form', value: 'Device' },
            { label: 'Supplements', key: 'form', value: 'Supplement' },
          ]}
          resultCount={filteredProducts.length}
          onClearAll={clearAllFilters}
        />
      </div>

      {/* Product Grid */}
      <div className="px-3 grid grid-cols-3 gap-2 pb-6" data-testid="product-grid">
        {loading && products.length === 0 ? (
          [...Array(9)].map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden animate-pulse" style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(0,0,0,0.06)' }}>
              <div className="aspect-square bg-stone-100" />
              <div className="p-2 space-y-1.5">
                <div className="h-2 rounded w-2/3 bg-stone-100" />
                <div className="h-2 rounded bg-stone-100" />
              </div>
            </div>
          ))
        ) : (
          filteredProducts.map((product, idx) => {
            const cartQty = getCartQty(product);
            const hasImage = product.image_url;
            return (
              <div
                key={product.id || idx}
                className="prod-card rounded-xl overflow-hidden relative cursor-pointer group"
                style={{
                  background: 'rgba(255,255,255,0.95)',
                  border: '1px solid rgba(249,115,22,0.12)',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}
                onClick={() => { trackMedicineView(product); setSelectedProduct(product); }}
                data-testid={`product-card-${product.id || idx}`}
              >
                {/* Image */}
                <div className="w-full aspect-square overflow-hidden relative flex items-center justify-center" style={{ background: '#FFFFFF' }}>
                  {hasImage ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-contain p-1.5 group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <ProductPlaceholder form={product.form || product.category} />
                  )}
                  {product.mrp > 0 && (
                    <span className="absolute top-1 left-1 text-white text-[7px] font-bold px-1.5 py-0.5 rounded-full z-10" style={{ background: 'linear-gradient(135deg, #16A34A, #15803D)' }}>
                      {getDiscountPercent(product.form, product.store)}% OFF
                    </span>
                  )}
                  {/* ADD button overlay */}
                  {cartQty > 0 ? (
                    <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 bg-emerald-600 rounded-lg px-1.5 py-0.5 z-10">
                      <button onClick={(e) => { e.stopPropagation(); handleDecrement(product); }} className="text-white" data-testid={`dec-${product.id}`}>
                        <Minus className="w-3 h-3" strokeWidth={3} />
                      </button>
                      <span className="text-white font-bold text-[10px] min-w-[14px] text-center">{cartQty}</span>
                      <button onClick={(e) => { e.stopPropagation(); handleIncrement(product); }} className="text-white" data-testid={`inc-${product.id}`}>
                        <Plus className="w-3 h-3" strokeWidth={3} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAddToCart(product); }}
                      className="absolute bottom-1.5 right-1.5 px-3 py-1 rounded-lg border-2 border-emerald-600 bg-white text-emerald-600 font-bold text-xs z-10 hover:bg-emerald-50 active:scale-95 transition-all"
                      data-testid={`add-cart-${product.id || idx}`}
                    >
                      ADD
                    </button>
                  )}
                </div>

                {/* Info - compact for 3-col */}
                <div className="px-2 pt-1.5 pb-2" style={{ borderTop: '1px solid rgba(249,115,22,0.06)' }}>
                  <p className="text-orange-500/60 text-[7px] font-bold tracking-wider uppercase truncate">{product.category || product.form || 'Health'}</p>
                  <p className="text-stone-800 text-[10px] font-semibold leading-tight line-clamp-2" style={{ minHeight: '24px' }}>
                    {product.name}
                  </p>
                  {product.manufacturer && (
                    <p className="text-[7px] text-stone-400 truncate">{product.manufacturer}</p>
                  )}
                  <div className="flex items-baseline gap-1 mt-1">
                    {product.mrp > 0 ? (
                      <>
                        <span className="text-stone-800 font-bold text-xs">{'\u20B9'}{getDiscountedPrice(product.mrp, product.form, product.store).toFixed(0)}</span>
                        <span className="text-[8px] text-stone-400 line-through">{'\u20B9'}{product.mrp.toFixed(0)}</span>
                      </>
                    ) : (product.price || product.sale_price) ? (
                      <span className="text-stone-800 font-bold text-xs">{'\u20B9'}{(product.price || product.sale_price).toFixed(0)}</span>
                    ) : (
                      <span className="text-[9px] font-semibold text-orange-500">Call</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {!loading && filteredProducts.length === 0 && (
          <div className="col-span-3 text-center py-20">
            <Package className="w-14 h-14 text-stone-200 mx-auto mb-3" />
            <p className="text-stone-400 text-sm font-medium">No products found</p>
            <p className="text-stone-300 text-xs mt-1">Try a different category or search term</p>
          </div>
        )}
      </div>

      {/* Infinite Scroll */}
      {hasMore && !loading && products.length > 0 && (
        <InfiniteScrollTrigger onVisible={loadMore} />
      )}
      {!hasMore && products.length > 0 && (
        <div className="px-4 pb-8 text-center">
          <p className="text-stone-400 text-xs">You've seen all {totalCount.toLocaleString()} products</p>
        </div>
      )}

      {/* Cross-promotion */}
      <div className="px-4 pb-6">
        <CrossSellBanner 
          context="health products wellness order" 
          sourceService="pharmacy"
        />
      </div>

      {/* Product Detail View */}
      {selectedProduct && (
        <ProductDetailView
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
          cartQuantity={getCartQty(selectedProduct)}
          onIncrement={() => handleIncrement(selectedProduct)}
          onDecrement={() => handleDecrement(selectedProduct)}
        />
      )}

      </div>

      {/* Custom Product Modal */}
      {showCustomProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCustomProduct(false)}>
          <div className="bg-zinc-900 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 border border-zinc-700" onClick={(e) => e.stopPropagation()} data-testid="custom-product-modal">
            <div className="w-12 h-1 bg-zinc-600 rounded-full mx-auto mb-4 sm:hidden" />
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-white">Request a Product</h3>
                <p className="text-xs text-zinc-400">Type the name and we'll source it for you</p>
              </div>
              <button onClick={() => setShowCustomProduct(false)} className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Product Name</label>
                <input
                  type="text"
                  value={customProductName}
                  onChange={(e) => setCustomProductName(e.target.value)}
                  placeholder="e.g. Omron Blood Pressure Monitor"
                  className="w-full h-12 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                  data-testid="custom-product-name"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1.5 block">Quantity</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCustomProductQty(Math.max(1, customProductQty - 1))}
                    className="w-12 h-12 bg-zinc-800 border border-zinc-700 rounded-xl text-white font-bold text-lg flex items-center justify-center hover:bg-zinc-700"
                  >-</button>
                  <span className="text-white font-bold text-xl w-12 text-center" data-testid="custom-product-qty">{customProductQty}</span>
                  <button
                    onClick={() => setCustomProductQty(customProductQty + 1)}
                    className="w-12 h-12 bg-zinc-800 border border-zinc-700 rounded-xl text-white font-bold text-lg flex items-center justify-center hover:bg-zinc-700"
                  >+</button>
                </div>
              </div>
              <p className="text-[10px] text-zinc-500 bg-zinc-800/50 rounded-lg px-3 py-2">
                Price will be confirmed before delivery. Our team will contact you.
              </p>
              <button
                onClick={handleAddCustomProduct}
                disabled={!customProductName.trim()}
                className="w-full h-12 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}
                data-testid="add-custom-product-submit"
              >
                <Plus className="w-4 h-4" />
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Nutricare;

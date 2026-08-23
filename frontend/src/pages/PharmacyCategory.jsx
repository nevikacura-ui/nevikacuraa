import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Plus, Minus, Pill } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { MedicineCard, MedicineGrid } from '@/components/pharmacy/MedicineCard';
import { MedicineGridSkeleton } from '@/components/ui/skeleton-loaders';
import ProductDetailView from '@/components/ProductDetailView';
import { trackMedicineView } from '@/components/pharmacy/TrendingRecentSections';
import { CATEGORIES } from '@/lib/pharmacy-constants';
import { toast } from 'sonner';
import { lightTap } from '@/utils/haptics';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const InfiniteScrollTrigger = ({ onVisible }) => {
  const ref = useRef(null);
  useEffect(() => {
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
    <div ref={ref} className="flex items-center justify-center py-6" data-testid="category-infinite-scroll">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-orange-400/40 animate-pulse" />
        <div className="w-2 h-2 rounded-full bg-orange-400/60 animate-pulse" style={{ animationDelay: '0.2s' }} />
        <div className="w-2 h-2 rounded-full bg-orange-400/80 animate-pulse" style={{ animationDelay: '0.4s' }} />
      </div>
    </div>
  );
};

const CATEGORY_GRADIENTS = {
  default: 'linear-gradient(135deg, #F97316 0%, #EA580C 50%, #C2410C 100%)',
  cold: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 50%, #0E7490 100%)',
  digestive: 'linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)',
  pain: 'linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #B45309 100%)',
  antibiotics: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 50%, #1D4ED8 100%)',
  diabetes: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 50%, #4338CA 100%)',
  heart: 'linear-gradient(135deg, #EF4444 0%, #DC2626 50%, #B91C1C 100%)',
  skin: 'linear-gradient(135deg, #EC4899 0%, #DB2777 50%, #BE185D 100%)',
  eye: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 50%, #6D28D9 100%)',
  bone: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 50%, #0F766E 100%)',
  vitamins: 'linear-gradient(135deg, #22C55E 0%, #16A34A 50%, #15803D 100%)',
  baby: 'linear-gradient(135deg, #F472B6 0%, #EC4899 50%, #DB2777 100%)',
};

const getCategoryMeta = (name) => {
  const nameL = (name || '').toLowerCase();
  const match = CATEGORIES.find(c => 
    nameL.includes(c.filter) || c.label.toLowerCase().includes(nameL.split(' ')[0])
  );
  
  let gradientKey = 'default';
  for (const key of Object.keys(CATEGORY_GRADIENTS)) {
    if (key !== 'default' && nameL.includes(key)) {
      gradientKey = key;
      break;
    }
  }

  return {
    gradient: CATEGORY_GRADIENTS[gradientKey],
    image: match?.image || null,
    icon: match?.icon || Pill,
    label: match?.label || name,
  };
};

const PharmacyCategory = () => {
  const { categoryName } = useParams();
  const navigate = useNavigate();
  const decodedName = decodeURIComponent(categoryName || '');
  const { pharmacyCart, addToPharmacyCart, removeFromPharmacyCart, updatePharmacyQuantity } = useCart();

  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const loadingMoreRef = useRef(false);

  const categoryMeta = getCategoryMeta(decodedName);

  const fetchMedicines = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      const params = new URLSearchParams({
        page: pageNum,
        per_page: 40,
        store: 'orange_pharmacy',
        category: decodedName,
      });
      const response = await axios.get(`${API_URL}/api/pharmacy/all?${params}`);
      const data = response.data;
      if (append) {
        setMedicines(prev => [...prev, ...data.medicines]);
      } else {
        setMedicines(data.medicines);
      }
      setTotalCount(data.total || 0);
      setHasMore(data.medicines.length === 40);
    } catch (error) {
      toast.error('Failed to load medicines');
    } finally {
      setLoading(false);
    }
  }, [decodedName]);

  useEffect(() => {
    setPage(1);
    fetchMedicines(1);
  }, [fetchMedicines]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchMedicines(nextPage, true).finally(() => { loadingMoreRef.current = false; });
  }, [hasMore, loading, page, fetchMedicines]);

  const handleAddToCart = (medicine) => {
    lightTap();
    const price = medicine.price || medicine.sale_price || medicine.mrp;
    addToPharmacyCart({
      id: medicine.id || medicine.name,
      name: medicine.name,
      price, mrp: medicine.mrp,
      quantity: 1, type: 'medicine',
      form: medicine.form, image: medicine.image_url,
      discount_percent: medicine.discount_percent || 0,
    });
    toast.success(`${medicine.name} added to cart`);
  };

  const handleIncrement = (medicine) => {
    const item = pharmacyCart.find(c => c.id === medicine.id || c.name === medicine.name);
    if (item) updatePharmacyQuantity(item.name, item.quantity + 1);
  };

  const handleDecrement = (medicine) => {
    const item = pharmacyCart.find(c => c.id === medicine.id || c.name === medicine.name);
    if (item) {
      if (item.quantity === 1) removeFromPharmacyCart(item.name);
      else updatePharmacyQuantity(item.name, item.quantity - 1);
    }
  };

  const getCartQuantity = (medicine) => {
    const item = pharmacyCart.find(c => c.id === medicine.id || c.name === medicine.name);
    return item?.quantity || 0;
  };

  return (
    <div className="min-h-screen bg-[#FFF8F0] pb-32" data-testid="pharmacy-category-page">
      {/* Hero Header */}
      <div className="relative overflow-hidden" style={{ background: categoryMeta.gradient, minHeight: '260px' }}>
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-10" style={{ background: 'white' }} />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full opacity-10" style={{ background: 'white' }} />
        <div className="absolute top-1/2 right-8 w-32 h-32 rounded-full opacity-5" style={{ background: 'white' }} />

        {/* Back button */}
        <button
          onClick={() => navigate('/pharmacy')}
          className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/15 backdrop-blur-md text-white font-medium text-sm hover:bg-white/25 transition-all"
          data-testid="category-back-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Category image + info */}
        <div className="relative z-10 flex flex-col items-center justify-center pt-16 pb-10 px-6 text-center">
          {categoryMeta.image ? (
            <div className="w-24 h-24 rounded-2xl overflow-hidden mb-4 border-2 border-white/30 shadow-xl">
              <img
                src={categoryMeta.image}
                alt={decodedName}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-2xl mb-4 border-2 border-white/30 bg-white/10 flex items-center justify-center">
              <Pill className="w-10 h-10 text-white/70" />
            </div>
          )}
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }} data-testid="category-hero-title">
            {decodedName}
          </h1>
          <p className="text-white/70 text-sm font-medium">
            {loading ? 'Loading...' : `${totalCount.toLocaleString()} products available`}
          </p>
        </div>

        {/* Bottom wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" preserveAspectRatio="none" className="w-full h-[40px]">
            <path d="M0,60 L0,20 Q360,0 720,20 T1440,20 L1440,60 Z" fill="#FFF8F0" />
          </svg>
        </div>
      </div>

      {/* Medicine Grid */}
      <div className="max-w-7xl mx-auto px-4 pt-2 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-stone-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {decodedName} <span className="text-orange-500">medicines</span>
          </h2>
          {!loading && (
            <span className="text-sm text-stone-400">{totalCount.toLocaleString()} items</span>
          )}
        </div>
      </div>

      {loading ? (
        <MedicineGridSkeleton count={10} />
      ) : (
        <MedicineGrid
          medicines={medicines}
          loading={false}
          onAdd={handleAddToCart}
          onView={(med) => { trackMedicineView(med); setSelectedMedicine(med); }}
          cart={pharmacyCart}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
        />
      )}

      {hasMore && !loading && medicines.length > 0 && (
        <InfiniteScrollTrigger onVisible={loadMore} />
      )}
      {!hasMore && medicines.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-6 text-center">
          <p className="text-stone-400 text-xs">All {totalCount.toLocaleString()} products shown</p>
        </div>
      )}
      {!loading && medicines.length === 0 && (
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <Pill className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 font-medium">No medicines found in this category</p>
          <button onClick={() => navigate('/pharmacy')} className="mt-4 text-orange-500 font-semibold text-sm hover:underline">
            Browse all medicines
          </button>
        </div>
      )}

      {/* Product Detail View */}
      {selectedMedicine && (
        <ProductDetailView
          product={selectedMedicine}
          onClose={() => setSelectedMedicine(null)}
          onAddToCart={handleAddToCart}
          cartQuantity={getCartQuantity(selectedMedicine)}
          onIncrement={() => handleIncrement(selectedMedicine)}
          onDecrement={() => handleDecrement(selectedMedicine)}
        />
      )}

    </div>
  );
};

export default PharmacyCategory;

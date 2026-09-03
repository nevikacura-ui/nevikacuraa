import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useThemeLanguage } from '@/context/ThemeLanguageContext';
import MembershipLinkBanner from '@/components/MembershipLinkBanner';
import OrangeTutorial from '@/components/OrangeTutorial';
import ServiceHeader from '@/components/ServiceHeader';
import { CrossSellBanner } from '@/components/CrossSellBanner';
import { MangoPromoCard } from '@/components/ServicePromoCards';
import SearchFilterSheet from '@/components/SearchFilterSheet';
import DeliveryBar from '@/components/DeliveryBar';
import { toast } from 'sonner';
import { lightTap } from '@/utils/haptics';
import { ShoppingBag, RefreshCw, ChevronRight, Pill } from 'lucide-react';
import axios from 'axios';

// Modular pharmacy components
import {
  CategoryPills, CategoryGrid, FamilyCareBanner, TopBrandsSection,
  ChronicCareSection, CommonConcernsSection, MedicineGrid, UploadPrescriptionDialog
} from '@/components/pharmacy';
import ProductDetailView from '@/components/ProductDetailView';
import DealsOfTheDay from '@/components/pharmacy/DealsOfTheDay';
import { FeaturedBrandsProducts } from '@/components/pharmacy/FeaturedBrandsProducts';
import { RecentlyViewedSection, TrendingNowSection, trackMedicineView } from '@/components/pharmacy/TrendingRecentSections';
import { PharmacyStampBadge } from '@/components/pharmacy/TrustStampBadge';
import { PriceMatchBadge } from '@/components/HealthcareUX';
import HeartbeatLoader from '@/components/HeartbeatLoader';
import { MedicineCabinet, PersonalCabinet } from '@/components/pharmacy/CabinetSections';
import { MedicineGridSkeleton } from '@/components/ui/skeleton-loaders';
import { PullToRefreshContainer } from '@/components/ui/pull-to-refresh';
import QuickReorder from '@/components/QuickReorder';
import SubscriptionRefill from '@/components/SubscriptionRefill';

// Extracted components
import PharmacyDarkZone from '@/components/pharmacy/PharmacyDarkZone';
import CustomMedicineModal from '@/components/pharmacy/CustomMedicineModal';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Pharmacy = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDarkMode } = useThemeLanguage();
  const { pharmacyCart, addToPharmacyCart, removeFromPharmacyCart, updatePharmacyQuantity } = useCart();

  // State
  const [activeSection, setActiveSection] = useState('orange_pharmacy');
  const [categorySections, setCategorySections] = useState([]);
  const [visibleCategoryCount, setVisibleCategoryCount] = useState(5);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTotal, setSearchTotal] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [showPrescriptionUpload, setShowPrescriptionUpload] = useState(false);
  const [showQuickReorder, setShowQuickReorder] = useState(false);
  const [showSubscriptionRefill, setShowSubscriptionRefill] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [categoryMedicines, setCategoryMedicines] = useState([]);
  const [categoryPage, setCategoryPage] = useState(1);
  const [categoryTotal, setCategoryTotal] = useState(0);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [showCustomMedicine, setShowCustomMedicine] = useState(false);
  const [customMedicineName, setCustomMedicineName] = useState('');
  const [customMedicineQty, setCustomMedicineQty] = useState(1);
  const [showOrangeTutorial, setShowOrangeTutorial] = useState(false);
  const loadingMoreRef = useRef(false);
  const lightZoneRef = useRef(null);
  const [headerLightMode, setHeaderLightMode] = useState(false);
  const [pharmaSort, setPharmaSort] = useState('');
  const [pharmaFilters, setPharmaFilters] = useState({});
  const [pharmaFilterSearch, setPharmaFilterSearch] = useState('');
  const searchTimeoutRef = useRef(null);

  // Header light mode detection
  useEffect(() => {
    const target = lightZoneRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeaderLightMode(entry.isIntersecting),
      { threshold: 0, rootMargin: '-60px 0px 0px 0px' }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  // Filter handlers
  const handlePharmaFilterChange = (key, value) => {
    setPharmaFilters(prev => prev[key] === value ? { ...prev, [key]: '' } : { ...prev, [key]: value });
  };
  const clearPharmaFilters = () => { setPharmaFilters({}); setPharmaSort(''); setPharmaFilterSearch(''); setSearchQuery(''); };
  const handleFilterSearchChange = (value) => { setPharmaFilterSearch(value); setSearchQuery(value); };

  // Fetch category-wise browse (V3 API)
  const fetchBrowse = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/pharmacy/v3/browse?per_category=8&section=${activeSection}`);
      setCategorySections(response.data.sections || []);
      setTotalCount(response.data.total_medicines || 0);
      setVisibleCategoryCount(5);
    } catch (error) {
      console.error('Failed to fetch browse:', error);
      toast.error('Failed to load medicines');
    } finally {
      setLoading(false);
    }
  }, [activeSection]);

  // Fetch category medicines
  const fetchCategoryMedicines = useCallback(async (categoryName, pageNum = 1, append = false) => {
    setCategoryLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/pharmacy/v3/category/${encodeURIComponent(categoryName)}?page=${pageNum}&limit=30&section=${activeSection}`);
      const data = response.data;
      if (append) {
        setCategoryMedicines(prev => [...prev, ...(data.medicines || [])]);
      } else {
        setCategoryMedicines(data.medicines || []);
      }
      setCategoryTotal(data.total || 0);
      setHasMore(data.has_more || false);
    } catch (error) {
      console.error('Failed to fetch category:', error);
    } finally {
      setCategoryLoading(false);
    }
  }, [activeSection]);

  // Legacy fetchMedicines compatibility
  const fetchMedicines = useCallback(async (categoryFilter = null, pageNum = 1, append = false) => {
    if (categoryFilter?.filter) {
      setExpandedCategory(categoryFilter.filter);
      setCategoryPage(1);
      fetchCategoryMedicines(categoryFilter.filter, 1, false);
      return;
    }
    fetchBrowse();
  }, [fetchBrowse, fetchCategoryMedicines]);

  // Search (debounced)
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await axios.get(`${API_URL}/api/pharmacy/v3/search?q=${encodeURIComponent(searchQuery)}&limit=20&section=${activeSection}`);
        setSearchResults(response.data.medicines || []);
        setSearchTotal(response.data.total || 0);
      } catch (error) { console.error('Search failed:', error); }
      finally { setSearchLoading(false); }
    }, 200);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [searchQuery, activeSection]);

  // Initial & section change fetches
  useEffect(() => { fetchBrowse(); }, [fetchBrowse]);
  useEffect(() => {
    if (selectedCategory?.filter) {
      setExpandedCategory(selectedCategory.filter);
      setCategoryPage(1);
      fetchCategoryMedicines(selectedCategory.filter, 1);
    } else {
      setExpandedCategory(null);
      setCategoryMedicines([]);
    }
  }, [selectedCategory, fetchCategoryMedicines]);

  // Cart handlers
  const handleAddToCart = (medicine) => {
    lightTap();
    const price = medicine.price || medicine.sale_price || medicine.mrp;
    addToPharmacyCart({
      id: medicine.id || medicine.name, name: medicine.name, price, mrp: medicine.mrp,
      quantity: 1, type: 'medicine', form: medicine.form,
      image: medicine.image_url || medicine.image, discount_percent: medicine.discount_percent || 0
    });
    toast.success(`${(medicine.name || 'Item').slice(0, 30)} added`, { duration: 1500 });
  };
  const handleIncrement = (medicine) => { const item = pharmacyCart.find(c => c.id === medicine.id || c.name === medicine.name); if (item) updatePharmacyQuantity(item.name, item.quantity + 1); };
  const handleDecrement = (medicine) => { const item = pharmacyCart.find(c => c.id === medicine.id || c.name === medicine.name); if (item) { if (item.quantity === 1) removeFromPharmacyCart(item.name); else updatePharmacyQuantity(item.name, item.quantity - 1); } };
  const handleSearchSelect = (medicine) => { trackMedicineView(medicine); setSelectedMedicine(medicine); setSearchQuery(''); setSearchResults([]); };
  const handleAddCustomMedicine = () => {
    if (!customMedicineName.trim()) { toast.error('Please enter medicine name'); return; }
    addToPharmacyCart({ id: `custom_${Date.now()}`, name: customMedicineName.trim(), quantity: customMedicineQty, price: 0, isCustom: true, description: 'Custom order - Price to be confirmed by pharmacy' });
    setCustomMedicineName(''); setCustomMedicineQty(1); setShowCustomMedicine(false);
  };
  const handleSelectBrand = async (brand) => { setSelectedCategory({ id: brand.id, label: brand.name, filter: brand.filter, isBrand: true }); };
  const getCartQuantity = (medicine) => { const item = pharmacyCart.find(c => c.id === medicine.id || c.name === medicine.name); return item?.quantity || 0; };
  const handleRefresh = async () => { setPage(1); await fetchMedicines(selectedCategory, 1); };

  // Filtered medicines
  const filteredMedicines = React.useMemo(() => {
    let result = [...medicines];
    if (pharmaFilterSearch) { const q = pharmaFilterSearch.toLowerCase(); result = result.filter(m => m.name?.toLowerCase().includes(q) || m.manufacturer?.toLowerCase().includes(q)); }
    if (pharmaFilters.form) result = result.filter(m => (m.form || m.unit || '').toLowerCase().includes(pharmaFilters.form.toLowerCase()));
    if (pharmaFilters.priceRange === 'under100') result = result.filter(m => (m.sale_price || m.mrp || 0) <= 100);
    else if (pharmaFilters.priceRange === '100to500') result = result.filter(m => { const p = m.sale_price || m.mrp || 0; return p >= 100 && p <= 500; });
    else if (pharmaFilters.priceRange === 'above500') result = result.filter(m => (m.sale_price || m.mrp || 0) > 500);
    if (pharmaSort === 'price_low') result.sort((a, b) => (a.sale_price || a.mrp || 0) - (b.sale_price || b.mrp || 0));
    else if (pharmaSort === 'price_high') result.sort((a, b) => (b.sale_price || b.mrp || 0) - (a.sale_price || a.mrp || 0));
    else if (pharmaSort === 'name_az') result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    return result;
  }, [medicines, pharmaFilterSearch, pharmaFilters, pharmaSort]);

  return (
    <div className={`min-h-screen pb-32 ${isDarkMode ? 'dark-page bg-[#050510]' : 'bg-[#F0EBE3]'}`}>
      <ServiceHeader currentService="orange" lightMode={headerLightMode} />
      <DeliveryBar lightMode={headerLightMode} />

      {/* How to Order Banner */}
      <div className="px-4 pt-2 pb-1">
        <button onClick={() => setShowOrangeTutorial(true)}
          className="w-full flex items-center gap-2.5 py-2 px-3.5 rounded-xl active:scale-[0.98] transition-all"
          style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.18)' }}
          data-testid="how-to-book-banner">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}>
            <ShoppingBag className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-xs font-bold text-orange-300 flex-1 text-left">How to Order</span>
          <span className="text-[9px] text-orange-400/50 font-medium">3 steps</span>
          <svg className="w-3.5 h-3.5 text-orange-400/50 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>

      <PullToRefreshContainer onRefresh={handleRefresh} type="pharmacy">
       <div>
        {/* Dark Zone — Logo, search, quick actions, popular meds */}
        <PharmacyDarkZone
          isDarkMode={isDarkMode}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchResults={searchResults}
          searchLoading={searchLoading}
          totalCount={totalCount}
          handleSearchSelect={handleSearchSelect}
          handleAddToCart={handleAddToCart}
          setShowPrescriptionUpload={setShowPrescriptionUpload}
          setShowCustomMedicine={setShowCustomMedicine}
          setShowQuickReorder={setShowQuickReorder}
        />

        {/* Light Zone — Shopping Area */}
        <div className="pb-32 relative" style={{ background: '#FFF8F0' }} data-testid="pharmacy-light-zone" ref={lightZoneRef}>
        <div className="absolute inset-0 pointer-events-none opacity-[0.015]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.3) 1px, transparent 0)', backgroundSize: '24px 24px' }} />

        {/* Section Tabs */}
        <div className="px-4 pt-3 pb-2" data-testid="section-tabs">
          <div className="flex gap-2">
            <button onClick={() => { setActiveSection('orange_pharmacy'); setSelectedCategory(null); setSearchQuery(''); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeSection === 'orange_pharmacy' ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' : 'bg-white text-gray-600 border border-gray-200'}`}
              data-testid="tab-orange-pharmacy">All Drugs</button>
            <button onClick={() => { setActiveSection('orange_healthplus'); setSelectedCategory(null); setSearchQuery(''); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${activeSection === 'orange_healthplus' ? 'bg-green-500 text-white shadow-lg shadow-green-200' : 'bg-white text-gray-600 border border-gray-200'}`}
              data-testid="tab-orange-healthplus">Healthplus</button>
          </div>
        </div>

        <CategoryPills selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />

        {/* Deals + Cabinet (All Drugs) */}
        {!selectedCategory && !searchQuery && activeSection === 'orange_pharmacy' && (
          <>
            <DealsOfTheDay onViewMedicine={(med) => { trackMedicineView(med); setSelectedMedicine(med); }} />
            <MedicineCabinet onViewMedicine={(med) => { trackMedicineView(med); setSelectedMedicine(med); }} onAddToCart={handleAddToCart} />
          </>
        )}

        {/* Featured Brands + Personal Cabinet (Healthplus) */}
        {!selectedCategory && !searchQuery && activeSection === 'orange_healthplus' && (
          <>
            <FeaturedBrandsProducts onViewMedicine={(med) => { trackMedicineView(med); setSelectedMedicine(med); }} onAddToCart={handleAddToCart} pharmacyCart={pharmacyCart} />
            <PersonalCabinet onViewMedicine={(med) => { trackMedicineView(med); setSelectedMedicine(med); }} onAddToCart={handleAddToCart} />
          </>
        )}

        {/* Shop by Brand */}
        {!selectedCategory && !searchQuery && (
          <div className="px-4 mb-3">
            <button onClick={() => navigate('/pharmacy/brands')} className="w-full py-3 bg-white rounded-xl border border-gray-200 text-sm font-bold text-orange-500 hover:bg-orange-50 transition-colors flex items-center justify-center gap-2" data-testid="shop-by-brand-btn">
              <ShoppingBag className="w-4 h-4" />Shop by Brand<ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Drug-specific sections (All Drugs only) */}
        {!selectedCategory && !searchQuery && activeSection === 'orange_pharmacy' && (
          <>
            <CategoryGrid onSelectCategory={setSelectedCategory} />
            <TrendingNowSection onSelect={(med) => { trackMedicineView(med); setSelectedMedicine(med); }} store="orange_pharmacy" />
            <PharmacyStampBadge />
            <PriceMatchBadge variant="pharmacy" />
            {/* Diabetes Combo Banner */}
            <div className="mx-4 my-4">
              <button onClick={() => setSelectedCategory('Diabetes')} className="w-full rounded-2xl p-4 flex items-center gap-4 transition-all active:scale-[0.99]" style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #0D2137 100%)', border: '1px solid rgba(59,130,246,0.2)' }} data-testid="diabetes-combo-banner">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(59,130,246,0.2)' }}><span className="text-2xl">🩸</span></div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2 mb-1"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: '#EF4444' }}>FLAT 20% OFF</span></div>
                  <p className="text-sm font-bold text-white">Diabetes Care Essentials</p>
                  <p className="text-[11px] text-white/40">Metformin, Glucometer Strips, Glimepiride & more</p>
                </div>
                <ChevronRight className="w-5 h-5 text-white/30" />
              </button>
            </div>
            {/* Auto Refill CTA */}
            <div className="mx-4 mb-4">
              <button onClick={() => setShowSubscriptionRefill(true)} className="w-full rounded-2xl p-3 flex items-center gap-3 transition-all active:scale-[0.99]" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.1), rgba(139,92,246,0.05))', border: '1px solid rgba(139,92,246,0.15)' }} data-testid="auto-refill-cta">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.2)' }}><RefreshCw className="w-5 h-5 text-purple-500" /></div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-stone-800">Auto Refill for Chronic Meds</p>
                  <p className="text-[10px] text-stone-500">Never run out — set monthly reminders for BP, Diabetes, Thyroid</p>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400" />
              </button>
            </div>
            <FamilyCareBanner onSelectCategory={setSelectedCategory} />
            <TopBrandsSection onSelectBrand={handleSelectBrand} />
            <ChronicCareSection onSelectCategory={setSelectedCategory} />
            <CommonConcernsSection onSelectCategory={setSelectedCategory} />
          </>
        )}

        {/* Recently Viewed (all tabs) */}
        {!selectedCategory && !searchQuery && (
          <RecentlyViewedSection onSelect={(med) => { trackMedicineView(med); setSelectedMedicine(med); }} />
        )}

        {/* Section Title */}
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h2 className="text-xl font-bold text-stone-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {selectedCategory ? selectedCategory.label : activeSection === 'orange_healthplus' ? 'All ' : 'All '}
            {!selectedCategory && activeSection === 'orange_healthplus' && <span className="text-green-600">Health Products</span>}
            {!selectedCategory && activeSection === 'orange_pharmacy' && <span className="text-orange-500">Medicines</span>}
          </h2>
          <p className="text-sm text-stone-500 mt-1">
            {loading ? 'Loading...' : searchQuery ? `${searchTotal.toLocaleString()} results` : `${totalCount.toLocaleString()} products`}
          </p>
        </div>

        {/* Filters */}
        <div className="max-w-7xl mx-auto px-4 pb-3 space-y-2.5" data-testid="pharmacy-search-filters">
          <SearchFilterSheet
            searchValue={pharmaFilterSearch} onSearchChange={handleFilterSearchChange}
            placeholder="Filter medicines, brands..." accentColor="#f97316" lightMode={true}
            filters={[
              { key: 'priceRange', label: 'Price Range', options: [
                { value: 'under100', label: 'Under ₹100' }, { value: '100to500', label: '₹100 - ₹500' }, { value: 'above500', label: 'Above ₹500' },
              ]},
              { key: 'form', label: 'Form / Type', options: [
                { value: 'Tablet', label: 'Tablets' }, { value: 'Capsule', label: 'Capsules' }, { value: 'Syrup', label: 'Syrup' },
                { value: 'Cream', label: 'Cream / Ointment' }, { value: 'Injection', label: 'Injection' }, { value: 'Drop', label: 'Drops' },
              ]},
            ]}
            activeFilters={pharmaFilters} onFilterChange={handlePharmaFilterChange}
            sortOptions={[{ value: 'price_low', label: 'Price: Low to High' }, { value: 'price_high', label: 'Price: High to Low' }, { value: 'name_az', label: 'Name: A to Z' }]}
            activeSort={pharmaSort} onSortChange={setPharmaSort}
            quickChips={[{ label: 'Under ₹100', key: 'priceRange', value: 'under100' }, { label: 'Tablets', key: 'form', value: 'Tablet' }, { label: 'Syrup', key: 'form', value: 'Syrup' }]}
            resultCount={filteredMedicines.length} onClearAll={clearPharmaFilters}
          />
        </div>

        {/* Medicine Grid */}
        {loading ? (
          <HeartbeatLoader variant="pharmacy" text="Loading medicines..." />
        ) : searchQuery ? (
          <div className="px-4 pb-6">
            <p className="text-xs text-stone-500 mb-3">{searchTotal.toLocaleString()} results for "{searchQuery}"</p>
            {searchLoading ? <MedicineGridSkeleton count={8} /> : searchResults.length === 0 ? (
              <div className="text-center py-12"><Pill className="w-10 h-10 mx-auto text-stone-300 mb-2" /><p className="text-sm text-stone-500">No medicines found for "{searchQuery}"</p></div>
            ) : (
              <MedicineGrid medicines={searchResults} loading={false} onAdd={handleAddToCart} onView={(med) => { trackMedicineView(med); setSelectedMedicine(med); }} cart={pharmacyCart} onIncrement={handleIncrement} onDecrement={handleDecrement} />
            )}
          </div>
        ) : expandedCategory ? (
          <div className="px-4 pb-6">
            <div className="flex items-center justify-between mb-3">
              <div><p className="text-base font-bold text-stone-800">{expandedCategory}</p><p className="text-xs text-stone-500">{categoryTotal.toLocaleString()} medicines</p></div>
              <button onClick={() => { setExpandedCategory(null); setSelectedCategory(null); }} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-50 text-orange-600 border border-orange-200">Show All Categories</button>
            </div>
            {categoryLoading && categoryMedicines.length === 0 ? <MedicineGridSkeleton count={12} /> : (
              <>
                <MedicineGrid medicines={categoryMedicines} loading={false} onAdd={handleAddToCart} onView={(med) => { trackMedicineView(med); setSelectedMedicine(med); }} cart={pharmacyCart} onIncrement={handleIncrement} onDecrement={handleDecrement} />
                {hasMore && (
                  <button onClick={() => { const np = categoryPage + 1; setCategoryPage(np); fetchCategoryMedicines(expandedCategory, np, true); }}
                    disabled={categoryLoading} className="w-full mt-4 py-3 rounded-xl text-sm font-semibold bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 transition-colors" data-testid="load-more-category">
                    {categoryLoading ? 'Loading...' : `Load More (${categoryMedicines.length} of ${categoryTotal})`}
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="px-4 pb-6 space-y-6" data-testid="category-browse">
            <p className="text-xs text-stone-500">{totalCount.toLocaleString()} products across {categorySections.length} categories</p>
            {categorySections.slice(0, visibleCategoryCount).map((section) => (
              <div key={section.category} className="space-y-3" data-testid={`category-section-${section.category}`}>
                <div className="flex items-center justify-between">
                  <div><h3 className="text-sm font-bold text-stone-800">{section.category}</h3><p className="text-[10px] text-stone-400">{section.total.toLocaleString()} products</p></div>
                  {section.has_more && (
                    <button onClick={() => { setExpandedCategory(section.category); setCategoryPage(1); fetchCategoryMedicines(section.category, 1, false); }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 transition-colors" data-testid={`view-more-${section.category}`}>
                      View All <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <MedicineGrid medicines={section.medicines} loading={false} onAdd={handleAddToCart} onView={(med) => { trackMedicineView(med); setSelectedMedicine(med); }} cart={pharmacyCart} onIncrement={handleIncrement} onDecrement={handleDecrement} />
              </div>
            ))}
            {categorySections.length > visibleCategoryCount && (
              <button onClick={() => setVisibleCategoryCount(prev => prev + 5)} className="w-full py-3 rounded-xl text-sm font-semibold bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 transition-colors" data-testid="show-more-categories">
                Show More Categories ({categorySections.length - visibleCategoryCount} remaining)
              </button>
            )}
          </div>
        )}

        {/* Cross-promotion */}
        <div className="px-4 pb-6 space-y-4">
          <CrossSellBanner context="pharmacy medicine order" sourceService="pharmacy" />
          <MangoPromoCard />
        </div>
        </div>
       </div>
      </PullToRefreshContainer>

      {/* Modals & Overlays */}
      {selectedMedicine && (
        <ProductDetailView product={selectedMedicine} onClose={() => setSelectedMedicine(null)} onAddToCart={handleAddToCart}
          cartQuantity={getCartQuantity(selectedMedicine)} onIncrement={() => handleIncrement(selectedMedicine)}
          onDecrement={() => handleDecrement(selectedMedicine)} onSelectAlternative={(alt) => setSelectedMedicine(alt)} />
      )}
      <UploadPrescriptionDialog open={showPrescriptionUpload} onClose={() => setShowPrescriptionUpload(false)} />
      <CustomMedicineModal show={showCustomMedicine} onClose={() => setShowCustomMedicine(false)}
        customMedicineName={customMedicineName} setCustomMedicineName={setCustomMedicineName}
        customMedicineQty={customMedicineQty} setCustomMedicineQty={setCustomMedicineQty}
        onAddCustomMedicine={handleAddCustomMedicine} />
      <QuickReorder isOpen={showQuickReorder} onClose={() => setShowQuickReorder(false)} />
      <SubscriptionRefill isOpen={showSubscriptionRefill} onClose={() => setShowSubscriptionRefill(false)} />
      <OrangeTutorial open={showOrangeTutorial} onClose={() => setShowOrangeTutorial(false)} />
    </div>
  );
};

export default Pharmacy;

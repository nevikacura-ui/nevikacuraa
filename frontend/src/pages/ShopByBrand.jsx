import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Search, ChevronRight, ShoppingBag, Package } from 'lucide-react';
import axios from 'axios';
import { useCart } from '@/context/CartContext';
import { MedicineCard } from '@/components/pharmacy/MedicineCard';
import { trackMedicineView } from '@/components/pharmacy/TrendingRecentSections';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ShopByBrand = () => {
  const navigate = useNavigate();
  const { brandName } = useParams();
  const { pharmacyCart, addToPharmacyCart, removeFromPharmacyCart, updatePharmacyQuantity } = useCart();
  
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Brand detail state
  const [brandProducts, setBrandProducts] = useState([]);
  const [brandTotal, setBrandTotal] = useState(0);
  const [brandPage, setBrandPage] = useState(1);
  const [brandLoading, setBrandLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // Fetch all brands list
  useEffect(() => {
    if (brandName) return;
    const fetchBrands = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/pharmacy/v3/brands?limit=100`);
        setBrands(res.data.brands || []);
      } catch (err) {
        console.error('Failed to fetch brands:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBrands();
  }, [brandName]);

  // Fetch specific brand products
  const fetchBrandProducts = useCallback(async (name, page = 1, append = false) => {
    setBrandLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/pharmacy/v3/brand/${encodeURIComponent(name)}?page=${page}&limit=30`);
      const data = res.data;
      if (append) {
        setBrandProducts(prev => [...prev, ...(data.medicines || [])]);
      } else {
        setBrandProducts(data.medicines || []);
      }
      setBrandTotal(data.total || 0);
      setHasMore(data.has_more || false);
    } catch (err) {
      console.error('Failed to fetch brand products:', err);
    } finally {
      setBrandLoading(false);
    }
  }, []);

  useEffect(() => {
    if (brandName) {
      setBrandPage(1);
      fetchBrandProducts(decodeURIComponent(brandName), 1);
    }
  }, [brandName, fetchBrandProducts]);

  const handleAddToCart = (medicine) => {
    const price = medicine.sale_price || medicine.price || medicine.mrp || 0;
    addToPharmacyCart({
      id: medicine.id || medicine.name,
      name: medicine.name,
      price: price,
      mrp: medicine.mrp || price,
      quantity: 1,
      type: 'medicine',
      form: medicine.form,
      image: medicine.image_url || medicine.image,
      discount_percent: medicine.discount_percent || 0,
    });
    toast.success(`Added to cart`);
  };

  const handleViewMedicine = (medicine) => {
    trackMedicineView(medicine);
    navigate(`/pharmacy/product/${medicine.id}`, { state: { product: medicine } });
  };

  const filteredBrands = searchQuery
    ? brands.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : brands;

  // Brand detail view
  if (brandName) {
    const decoded = decodeURIComponent(brandName);
    return (
      <div className="min-h-screen" style={{ background: '#FFF8F0' }}>
        {/* Header */}
        <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/pharmacy/brands')} className="p-1.5 rounded-full hover:bg-gray-100" data-testid="brand-back-btn">
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-gray-900">{decoded}</h1>
              <p className="text-xs text-gray-400">{brandTotal} products</p>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="max-w-7xl mx-auto px-3 py-4">
          {brandLoading && brandProducts.length === 0 ? (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl animate-pulse border border-gray-100">
                  <div className="aspect-square bg-gray-50" />
                  <div className="p-2.5 space-y-2"><div className="h-3 bg-gray-100 rounded w-1/2" /><div className="h-2 bg-gray-50 rounded" /></div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {brandProducts.map(med => {
                  const cartItem = pharmacyCart.find(c => c.id === med.id || c.name === med.name);
                  return (
                    <MedicineCard
                      key={med.id || med.name}
                      medicine={med}
                      onAdd={handleAddToCart}
                      onView={handleViewMedicine}
                      cartQuantity={cartItem?.quantity || 0}
                      onIncrement={() => updatePharmacyQuantity(med.id || med.name, (cartItem?.quantity || 0) + 1)}
                      onDecrement={() => {
                        if ((cartItem?.quantity || 0) > 1) updatePharmacyQuantity(med.id || med.name, cartItem.quantity - 1);
                        else removeFromPharmacyCart(med.id || med.name);
                      }}
                    />
                  );
                })}
              </div>
              {hasMore && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={() => {
                      const next = brandPage + 1;
                      setBrandPage(next);
                      fetchBrandProducts(decoded, next, true);
                    }}
                    className="px-6 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors"
                    disabled={brandLoading}
                    data-testid="load-more-brand"
                  >
                    {brandLoading ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // Brands list view
  return (
    <div className="min-h-screen" style={{ background: '#FFF8F0' }}>
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3" style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate('/pharmacy')} className="p-1.5 rounded-full hover:bg-gray-100" data-testid="brands-back-btn">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Shop by Brand</h1>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search brands..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
            data-testid="brand-search-input"
          />
        </div>
      </div>

      {/* Brands Grid */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl animate-pulse p-4 h-20 border border-gray-100" />
            ))}
          </div>
        ) : filteredBrands.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No brands found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filteredBrands.map((brand) => (
              <button
                key={brand.name}
                onClick={() => navigate(`/pharmacy/brands/${encodeURIComponent(brand.name)}`)}
                className="bg-white rounded-xl p-4 text-left border border-gray-100 hover:border-orange-200 hover:shadow-md transition-all active:scale-[0.98]"
                data-testid={`brand-card-${brand.name.replace(/\s+/g, '-').toLowerCase()}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(249,115,22,0.08)' }}>
                    <ShoppingBag className="w-5 h-5 text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-sm truncate">{brand.name}</p>
                    <p className="text-[11px] text-gray-400">{brand.count} products</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopByBrand;

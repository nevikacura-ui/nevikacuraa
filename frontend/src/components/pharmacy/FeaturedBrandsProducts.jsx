import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, ShoppingBag, Plus, Check } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const BRAND_COLORS = {
  'Minimalist': { bg: '#F5EFE6', text: '#8B6914', accent: '#C9A84C' },
  'The Derma Co': { bg: '#E8F4F8', text: '#1A6E82', accent: '#2BA0BE' },
  'Aqualogica': { bg: '#E6F2FF', text: '#1859A9', accent: '#3D8FE0' },
  'Cetaphil': { bg: '#EDF6ED', text: '#2E7D32', accent: '#43A047' },
  'Biluma': { bg: '#F3E8F9', text: '#6A1B9A', accent: '#8E24AA' },
};

const BrandProductCard = ({ medicine, inCart, onAdd, onView }) => {
  const discount = medicine.discount_percent || (medicine.mrp > 0 && medicine.sale_price > 0
    ? Math.round((1 - medicine.sale_price / medicine.mrp) * 100) : 0);
  const price = medicine.price || medicine.sale_price || medicine.mrp || 0;

  return (
    <div
      onClick={() => onView(medicine)}
      className="flex-shrink-0 w-36 rounded-xl border border-stone-100 bg-white shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden text-left active:scale-[0.97] cursor-pointer"
      data-testid={`featured-product-${medicine.id}`}
    >
      <div className="relative w-full h-28 flex items-center justify-center p-2" style={{ background: BRAND_COLORS[medicine.manufacturer]?.bg || '#f5f5f5' }}>
        {medicine.image_url ? (
          <img
            src={medicine.image_url}
            alt={medicine.name}
            className="w-full h-full object-contain"
            loading="lazy"
            onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.querySelector('.fallback-icon')?.classList.remove('hidden'); }}
          />
        ) : null}
        <div className={`fallback-icon flex flex-col items-center justify-center ${medicine.image_url ? 'hidden' : ''}`}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.6)' }}>
            <span className="text-base font-black" style={{ color: BRAND_COLORS[medicine.manufacturer]?.text || '#666' }}>
              {(medicine.manufacturer || '?').charAt(0)}
            </span>
          </div>
          <span className="text-[8px] mt-1 font-bold" style={{ color: BRAND_COLORS[medicine.manufacturer]?.text || '#666' }}>{medicine.manufacturer}</span>
        </div>
        {discount > 0 && (
          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold text-white bg-green-500">
            {discount}% OFF
          </span>
        )}
      </div>
      <div className="p-2">
        <p className="text-[11px] font-medium text-stone-700 leading-tight line-clamp-2 min-h-[28px]">
          {medicine.name}
        </p>
        <div className="flex items-end justify-between mt-1.5">
          <div>
            {price > 0 ? (
              <>
                <span className="text-sm font-bold text-stone-900">
                  {'\u20B9'}{price}
                </span>
                {medicine.mrp > price && (
                  <span className="text-[10px] text-stone-400 line-through ml-1">
                    {'\u20B9'}{medicine.mrp}
                  </span>
                )}
              </>
            ) : (
              <span className="text-[10px] text-stone-400">Price on request</span>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (!inCart) onAdd(medicine);
            }}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
              inCart
                ? 'bg-green-100 text-green-600'
                : 'bg-orange-500 text-white hover:bg-orange-600 active:scale-90'
            }`}
            data-testid={`featured-add-${medicine.id}`}
          >
            {inCart ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export const FeaturedBrandsProducts = ({ onViewMedicine, onAddToCart, pharmacyCart = [] }) => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRefs = useRef({});

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/pharmacy/v3/featured-brands?per_brand=8`);
        setBrands(res.data.brands || []);
      } catch (err) {
        console.error('Failed to fetch featured brands:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBrands();
  }, []);

  if (loading || brands.length === 0) return null;

  const isInCart = (med) => pharmacyCart.some(item => item.name === med.name || item.id === med.id);

  return (
    <div className="py-4" data-testid="featured-brands-products">
      <div className="px-4 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full bg-orange-500" />
          <h2 className="text-lg font-bold text-stone-900" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Orange <span className="text-orange-500">Healthplus</span>
          </h2>
        </div>
        <p className="text-xs text-stone-400 mt-0.5 ml-3">Curated brands, verified quality</p>
      </div>
      
      {brands.map((brand) => (
        <div key={brand.brand} className="mb-4">
          <div className="flex items-center justify-between px-4 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: BRAND_COLORS[brand.brand]?.bg }}>
                <span className="text-xs font-black" style={{ color: BRAND_COLORS[brand.brand]?.text }}>{brand.brand.charAt(0)}</span>
              </div>
              <h3 className="text-sm font-semibold text-stone-700">{brand.brand}</h3>
            </div>
            {brand.has_more && (
              <button
                className="text-xs text-orange-500 font-medium flex items-center gap-0.5"
                onClick={() => onViewMedicine && onViewMedicine({ name: brand.brand, manufacturer: brand.brand })}
                data-testid={`brand-view-all-${brand.brand.replace(/\s+/g, '-').toLowerCase()}`}
              >
                View all <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
          <div
            ref={(el) => { scrollRefs.current[brand.brand] = el; }}
            className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide"
          >
            {brand.medicines.map((med) => (
              <BrandProductCard
                key={med.id}
                medicine={med}
                inCart={isInCart(med)}
                onAdd={onAddToCart}
                onView={onViewMedicine}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FeaturedBrandsProducts;

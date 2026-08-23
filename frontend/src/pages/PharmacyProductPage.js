import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useCart } from '@/context/CartContext';
import { 
  ChevronDown, ChevronUp, Heart, Search, Share2, ArrowLeft,
  Clock, ShoppingCart, Plus, Minus, ChevronRight, Shield, Truck, Package, RefreshCw
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

// Orange Pharmacy Info
const PHARMACY_INFO = {
  name: "Orange Pharmacy",
  fssai: "21525019003800",
  drugLicense: ["MH-PL1-610138", "MH-PL1-610139"],
  address: "A-4, Sai Darshan, Near Don Bosco High School, Naigaon East, Palghar 401208",
  email: "support@nevikacura.com",
  phone: "+91 98765 43210",
  disclaimer: "Product information is as provided by the seller and for informational purposes only. Not exhaustive. Provides only an overview of products. The transaction does not create any doctor-patient relationship. You are advised to consult a doctor for details and further diagnosis/assessment of your medical condition and suitability. Please refer to the applicable Terms of Use and Privacy Policy. Orange Pharmacy is not responsible or liable for any aspects of the products including information displayed."
};

const PharmacyProductPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { productId } = useParams();
  const { pharmacyCart, addToPharmacyCart } = useCart();
  
  // Get product from location state or fetch
  const [product, setProduct] = useState(location.state?.product || null);
  const [loading, setLoading] = useState(!product);
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [alternatives, setAlternatives] = useState([]);
  const [loadingAlts, setLoadingAlts] = useState(false);
  
  // Expandable sections
  const [expandedSections, setExpandedSections] = useState({
    highlights: true,
    medicinalDetails: false,
    info: false
  });

  // Update product when navigating between alternatives (same route pattern)
  useEffect(() => {
    if (location.state?.product) {
      setProduct(location.state.product);
      setQuantity(1);
      setLoading(false);
    } else if (productId) {
      setProduct(null);
      setLoading(true);
    }
  }, [productId, location.state?.product]);

  useEffect(() => {
    if (!product && productId) {
      fetchProduct();
    }
  }, [product, productId]);

  useEffect(() => {
    if (product?.id) {
      fetchAlternatives(product.id);
    }
  }, [product?.id]);

  const fetchAlternatives = async (id) => {
    setLoadingAlts(true);
    try {
      const res = await fetch(`${API}/api/pharmacy/v2/alternatives/${id}?limit=6`);
      const data = await res.json();
      setAlternatives(data.alternatives || []);
    } catch { /* ignore */ }
    setLoadingAlts(false);
  };

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/pharmacy/product/${productId}`);
      const data = await res.json();
      if (data.product) {
        setProduct(data.product);
      }
    } catch (error) {
      console.error('Failed to fetch product');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const addToCart = () => {
    const price = product.price || product.sale_price || product.mrp || 0;
    addToPharmacyCart({
      id: product.id || product.name,
      name: product.name,
      price: price,
      mrp: product.mrp || price,
      quantity,
      type: 'medicine',
      form: product.form,
      image: product.image_url || product.image,
      discount_percent: product.discount_percent || 0,
    });
    toast.success(`Added ${quantity} ${product.name} to cart`);
  };

  const getCartTotal = () => {
    return pharmacyCart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  };

  const shareProduct = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `Check out ${product.name} on Orange Pharmacy`,
          url: window.location.href
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <Package className="w-16 h-16 text-slate-300 mb-4" />
        <p className="text-slate-500">Product not found</p>
        <Button onClick={() => navigate('/pharmacy')} className="mt-4">
          Back to Pharmacy
        </Button>
      </div>
    );
  }

  // Get medicine icon based on form
  const getMedicineIcon = (form) => {
    const icons = {
      'Tablet': '💊', 'Capsule': '💊', 'Syrup': '🧴', 'Injection': '💉',
      'Cream': '🧴', 'Drops': '💧', 'Powder': '📦', 'Inhaler': '🌬️'
    };
    return icons[form] || '💊';
  };

  return (
    <div className="min-h-screen bg-white pb-32">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-100 safe-area-top">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6 text-slate-700" />
          </button>
          <h1 className="flex-1 text-center font-medium text-slate-800 truncate px-4">
            {product.name}
          </h1>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsFavorite(!isFavorite)}
              className="p-2"
            >
              <Heart className={`w-6 h-6 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
            </button>
            <button onClick={() => navigate('/pharmacy')} className="p-2">
              <Search className="w-6 h-6 text-slate-400" />
            </button>
            <button onClick={shareProduct} className="p-2">
              <Share2 className="w-6 h-6 text-slate-400" />
            </button>
          </div>
        </div>
      </header>

      {/* Product Image */}
      <div className="bg-gradient-to-b from-slate-50 to-white p-8">
        <div className="w-full aspect-square max-w-xs mx-auto flex items-center justify-center">
          {product.image ? (
            <img 
              src={product.image} 
              alt={product.name}
              className="w-full h-full object-contain"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <span className="text-9xl">{getMedicineIcon(product.form)}</span>
          )}
        </div>
        {/* Image pagination dots (placeholder) */}
        <div className="flex justify-center gap-1.5 mt-4">
          <div className="w-2 h-2 rounded-full bg-slate-800"></div>
          <div className="w-2 h-2 rounded-full bg-slate-300"></div>
          <div className="w-2 h-2 rounded-full bg-slate-300"></div>
        </div>
      </div>

      {/* Product Info */}
      <div className="px-4 py-4 border-b border-slate-100">
        {/* Delivery Time Badge */}
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
            <Clock className="w-3.5 h-3.5" />
            Same Day Delivery
          </span>
          {product.stock && product.stock < 10 && (
            <span className="text-red-500 text-xs font-medium">
              Only {product.stock} left
            </span>
          )}
        </div>

        {/* Product Name */}
        <h1 className="text-xl font-bold text-slate-900 leading-tight">
          {product.name}
        </h1>

        {/* Form/Quantity Info */}
        <p className="text-slate-500 text-sm mt-1">
          {product.form || 'Medicine'} {product.pack_size && `• ${product.pack_size}`}
        </p>

        {/* Price Info */}
        <div className="mt-3">
          <p className="text-xs text-slate-500">Price will be informed after discount before processing the order</p>
        </div>

        {/* Prescription Info */}
        {product.requires_prescription !== false && (
          <div className="mt-4 p-3 bg-green-50 rounded-xl flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
              <span className="text-green-700 font-bold text-sm">Rx</span>
            </div>
            <div>
              <p className="font-semibold text-green-800 text-sm">Valid prescription available</p>
              <p className="text-green-600 text-xs mt-0.5">
                You can order this medicine without uploading prescription.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Expandable Sections */}
      <div className="divide-y divide-slate-100">
        
        {/* Highlights Section */}
        <div className="px-4">
          <button 
            onClick={() => toggleSection('highlights')}
            className="w-full py-4 flex items-center justify-between"
          >
            <span className="font-semibold text-slate-800">Highlights</span>
            {expandedSections.highlights ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>
          {expandedSections.highlights && (
            <div className="pb-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-500 text-sm">Salt composition</span>
                <span className="text-slate-700 text-sm font-medium text-right max-w-[60%]">
                  {product.salt || product.composition || 'As per label'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-sm">Formulation</span>
                <span className="text-slate-700 text-sm font-medium">
                  {product.form || 'Tablet'}
                </span>
              </div>
              {product.category && (
                <div className="flex justify-between">
                  <span className="text-slate-500 text-sm">Category</span>
                  <span className="text-slate-700 text-sm font-medium">
                    {product.category}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500 text-sm">Expiry</span>
                <span className="text-slate-700 text-sm font-medium">
                  {product.expiry || 'As per packaging'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Other Medicinal Details */}
        <div className="px-4">
          <button 
            onClick={() => toggleSection('medicinalDetails')}
            className="w-full py-4 flex items-center justify-between"
          >
            <span className="font-semibold text-slate-800">Other Medicinal Details</span>
            {expandedSections.medicinalDetails ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>
          {expandedSections.medicinalDetails && (
            <div className="pb-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-500 text-sm">Packaging</span>
                <span className="text-slate-700 text-sm font-medium">
                  {product.packaging || 'Strip'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-sm">Dosage Type</span>
                <span className="text-slate-700 text-sm font-medium">
                  {product.form || 'Tablet'}
                </span>
              </div>
              {product.manufacturer && (
                <div className="flex justify-between">
                  <span className="text-slate-500 text-sm">Manufacturer</span>
                  <span className="text-slate-700 text-sm font-medium text-right max-w-[60%]">
                    {product.manufacturer}
                  </span>
                </div>
              )}
              {product.uses && (
                <div className="flex justify-between">
                  <span className="text-slate-500 text-sm">Uses</span>
                  <span className="text-slate-700 text-sm font-medium text-right max-w-[60%]">
                    {product.uses}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="px-4">
          <button 
            onClick={() => toggleSection('info')}
            className="w-full py-4 flex items-center justify-between"
          >
            <span className="font-semibold text-slate-800">Info</span>
            {expandedSections.info ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>
          {expandedSections.info && (
            <div className="pb-4 space-y-4">
              <div className="flex justify-between">
                <span className="text-slate-500 text-sm">Country of Origin</span>
                <span className="text-slate-700 text-sm font-medium">India</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-sm">Customer Care Details</span>
                <span className="text-slate-700 text-sm font-medium">
                  {PHARMACY_INFO.email}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-sm block mb-2">Disclaimer</span>
                <p className="text-slate-600 text-xs leading-relaxed">
                  {PHARMACY_INFO.disclaimer}
                </p>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-sm">Unit</span>
                <span className="text-slate-700 text-sm font-medium">
                  {product.pack_size || '1 Strip'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-sm block mb-1">Seller</span>
                <p className="text-slate-700 text-sm font-medium">
                  {PHARMACY_INFO.name}
                </p>
                <p className="text-slate-500 text-xs mt-1">
                  {PHARMACY_INFO.address}
                </p>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 text-sm">Seller FSSAI</span>
                <span className="text-slate-700 text-sm font-medium font-mono">
                  {PHARMACY_INFO.fssai}
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-sm block mb-1">Drug License</span>
                <div className="flex flex-col gap-1">
                  {PHARMACY_INFO.drugLicense.map((license, idx) => (
                    <span key={idx} className="text-slate-700 text-sm font-medium font-mono">
                      {license}
                    </span>
                  ))}
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 text-center">
                <a href="/return-refund-policy" className="text-xs text-orange-500 hover:text-orange-600 underline font-medium" data-testid="product-page-return-policy">
                  Return & Refund Policy
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Medicine Alternatives Section */}
      {alternatives.length > 0 && (
        <div className="px-4 py-4 border-t border-slate-100" data-testid="alternatives-section">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-orange-500" />
            Similar Medicines ({alternatives.length})
          </h3>
          <p className="text-xs text-slate-500 mb-3">
            Same salt/composition: {product.salt || product.generic_name || product.composition || 'N/A'}
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            {alternatives.map(alt => {
              const altInCart = pharmacyCart.find(item => item.name === alt.name);
              return (
                <div
                  key={alt.id}
                  className="flex-shrink-0 w-44 bg-slate-50 rounded-xl p-3 border border-slate-100 hover:border-orange-200 transition-colors cursor-pointer"
                  data-testid={`alt-${alt.id}`}
                  onClick={() => navigate(`/pharmacy/product/${alt.id}`, { state: { product: alt } })}
                >
                  <div>
                    <p className="text-xs font-semibold text-slate-800 line-clamp-2 h-8">{alt.name}</p>
                    <p className="text-[10px] text-slate-400 mt-1 truncate">{alt.manufacturer}</p>
                    <div className="flex items-baseline gap-1.5 mt-2">
                      {alt.mrp > 0 && <span className="text-sm font-bold text-slate-800">₹{alt.sale_price || alt.mrp}</span>}
                      {alt.discount_percent > 0 && <span className="text-[10px] text-green-600 font-medium">{alt.discount_percent}% off</span>}
                    </div>
                    {alt.stock_quantity > 0 && <span className="text-[9px] text-green-600 mt-1 block">In Stock</span>}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      const altPrice = alt.price || alt.sale_price || alt.mrp || 0;
                      addToPharmacyCart({
                        id: alt.id || alt.name,
                        name: alt.name,
                        price: altPrice,
                        mrp: alt.mrp || altPrice,
                        quantity: 1,
                        type: 'medicine',
                        form: alt.form,
                        image: alt.image_url || alt.image,
                        discount_percent: alt.discount_percent || 0,
                      });
                      toast.success(`Added ${alt.name} to cart`);
                    }}
                    className="w-full mt-2 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                    style={{
                      background: altInCart ? '#f0fdf4' : '#fff7ed',
                      color: altInCart ? '#16a34a' : '#ea580c',
                      border: `1px solid ${altInCart ? '#bbf7d0' : '#fed7aa'}`
                    }}
                    data-testid={`alt-add-${alt.id}`}
                  >
                    {altInCart ? `In Cart (${altInCart.quantity})` : '+ Add to Cart'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* View Cart Floating Button */}
      {pharmacyCart.length > 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={() => navigate('/pharmacy', { state: { showCart: true } })}
            className="flex items-center gap-3 px-5 py-3 bg-slate-800 text-white rounded-full shadow-xl hover:bg-slate-700 transition-all"
          >
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <span className="font-semibold">View cart</span>
            <span className="text-white/70">•</span>
            <span className="font-medium">{getCartTotal()} {getCartTotal() === 1 ? 'item' : 'items'}</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Bottom Fixed Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 z-50">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {/* Quantity Info */}
          <div>
            <p className="text-sm text-slate-500">{product.pack_size || '1 Strip'}</p>
            <p className="text-xs text-slate-400">Price informed before order</p>
          </div>
          
          {/* Quantity Selector & Add Button */}
          <div className="flex items-center gap-3">
            {/* Quantity Selector */}
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-white rounded-md transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-semibold text-slate-800">{quantity}</span>
              <button 
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-white rounded-md transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            {/* Add to Cart Button */}
            <Button
              onClick={addToCart}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-6 rounded-xl font-semibold"
            >
              Add to cart
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PharmacyProductPage;

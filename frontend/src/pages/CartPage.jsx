import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { toast } from 'sonner';
import { 
  ShoppingCart, Trash2, Plus, Minus, ArrowLeft, Search,
  Package, FlaskConical, ShoppingBag, ChevronRight, Stethoscope,
  Clock, Truck, X, CreditCard, Shield,
  Heart, Star, ChevronDown, Globe, Zap
} from 'lucide-react';
import { SmartBundleSuggestions } from '@/components/SmartBundleSuggestions';
import FrequentlyBoughtTogether from '@/components/FrequentlyBoughtTogether';
import TrustBadges from '@/components/TrustBadges';

const API = process.env.REACT_APP_BACKEND_URL;

// Cart-specific product suggestions with Add to Cart
const CartProductSuggestions = () => {
  const [products, setProducts] = useState([]);
  const [labSuggestions, setLabSuggestions] = useState([]);
  const { addToPharmacyCart, addToLabCart, labCart, pharmacyCart } = useCart();
  const navigate = useNavigate();
  const showLabMode = labCart.length > 0 && pharmacyCart.length === 0;

  useEffect(() => {
    fetch(`${API}/api/pharmacy/trending?store=orange_pharmacy&limit=10`)
      .then(r => r.json())
      .then(d => setProducts(d.trending || []))
      .catch(() => {});
    fetch(`${API}/api/diagnostics/popular-tests?limit=10`)
      .then(r => r.json())
      .then(d => setLabSuggestions(d.tests || d.popular_tests || []))
      .catch(() => {});
  }, []);

  const handleAddMed = (med) => {
    addToPharmacyCart({
      id: med.id || med._id, name: med.name, price: med.price || 0,
      mrp: med.mrp || med.price || 0, quantity: 1, form: med.form || 'Medicine',
      image: med.image_url || '',
      discount_percent: med.mrp && med.price ? Math.round(((med.mrp - med.price) / med.mrp) * 100) : 0,
    });
    toast.success(`${med.name?.slice(0, 30)} added to cart`);
  };

  const handleAddTest = (test) => {
    addToLabCart({ name: test.name, price: test.price || 0, parameters: test.parameters || '' });
    toast.success(`${test.name?.slice(0, 30)} added`);
  };

  if (showLabMode) {
    if (labSuggestions.length < 1) return null;
    return (
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4" data-testid="cart-lab-suggestions">
        {labSuggestions.map((test, idx) => (
          <div key={test.name || idx} className="flex-shrink-0 w-[155px] rounded-2xl p-3 relative" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="w-full h-16 rounded-xl overflow-hidden mb-2 flex items-center justify-center" style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.1)' }}>
              <FlaskConical className="w-6 h-6 text-green-400/40" />
            </div>
            <p className="text-xs font-medium text-white/80 truncate mb-1">{test.name?.slice(0, 25)}</p>
            {test.price > 0 && <span className="text-green-400 text-xs font-bold">₹{test.price}</span>}
            <button
              onClick={() => handleAddTest(test)}
              className="w-full mt-2 py-2 rounded-xl text-[10px] font-bold text-white transition-all active:scale-[0.95]"
              style={{ background: 'linear-gradient(135deg, #15803D, #16A34A)', boxShadow: '0 2px 8px rgba(22,163,74,0.2)' }}
              data-testid={`add-test-suggest-${idx}`}
            >
              Add Test
            </button>
          </div>
        ))}
      </div>
    );
  }

  if (products.length < 2) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4" data-testid="cart-product-suggestions">
      {products.map((med, idx) => (
        <div key={med.id || idx} className="flex-shrink-0 w-[155px] rounded-2xl p-3 relative" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button onClick={() => navigate(`/pharmacy/product/${med.id || med._id}`)} className="w-full text-left" data-testid={`suggest-product-${idx}`}>
            <div className="w-full h-20 rounded-xl overflow-hidden mb-2 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
              {med.image_url ? (
                <img src={med.image_url} alt="" className="w-full h-full object-contain" loading="lazy" />
              ) : (
                <Package className="w-6 h-6 text-white/15" />
              )}
            </div>
            <p className="text-xs font-medium text-white/80 truncate mb-1">{med.name?.slice(0, 25)}</p>
            <div className="flex items-center gap-1.5">
              {med.price > 0 && <span className="text-orange-400 text-xs font-bold">₹{med.price}</span>}
              {med.mrp > med.price && med.mrp > 0 && <span className="text-white/30 text-[10px] line-through">₹{med.mrp}</span>}
            </div>
          </button>
          <button
            onClick={() => handleAddMed(med)}
            className="w-full mt-2 py-2 rounded-xl text-[10px] font-bold text-white transition-all active:scale-[0.95]"
            style={{ background: 'linear-gradient(135deg, #EA580C, #F97316)', boxShadow: '0 2px 8px rgba(234,88,12,0.2)' }}
            data-testid={`add-suggest-${idx}`}
          >
            Add to Cart
          </button>
        </div>
      ))}
    </div>
  );
};

// Suggestion tabs for "Before you checkout"
const SUGGESTION_TABS = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'tests', label: 'Book Tests' },
  { id: 'essentials', label: 'Essentials' },
];

const CartPage = () => {
  const navigate = useNavigate();
  const {
    pharmacyCart,
    labCart,
    consultationCart,
    removeFromPharmacyCart,
    updatePharmacyQuantity,
    removeFromLabCart,
    removeFromConsultationCart,
    clearPharmacyCart,
    clearLabCart,
    getPharmacyTotal,
    getLabTotal,
    getConsultationTotal,
    deliveryOption,
    setDeliveryOption,
    getDeliveryCharge,
    getDeliveryLabel,
  } = useCart();

  const [activeTab, setActiveTab] = useState('all');
  const [suggestionTab, setSuggestionTab] = useState('recommended');
  const [stripeLoading, setStripeLoading] = useState(false);

  // Auto-select active tab based on cart contents
  useEffect(() => {
    if (pharmacyCart.length > 0 && labCart.length === 0) setActiveTab('pharmacy');
    else if (labCart.length > 0 && pharmacyCart.length === 0) setActiveTab('lab');
    else setActiveTab('all');
  }, [pharmacyCart.length, labCart.length]);

  const handleProceedToCheckout = () => {
    const hasMultipleTypes = [pharmacyCart.length > 0, labCart.length > 0, consultationCart.length > 0].filter(Boolean).length > 1;
    if (hasMultipleTypes) navigate('/unified-checkout');
    else if (pharmacyCart.length > 0) navigate('/pharmacy/checkout');
    else if (labCart.length > 0) navigate('/mango/checkout');
    else if (consultationCart.length > 0) navigate('/unified-checkout?type=consultation');
  };

  // Stripe international payment
  const handleStripePayment = async () => {
    setStripeLoading(true);
    try {
      const originUrl = window.location.origin;
      const res = await fetch(`${API}/api/payments/stripe/pharmacy-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin_url: originUrl,
          items: pharmacyCart.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price || 0,
            mrp: item.mrp || item.price || 0,
          })),
          patient_phone: localStorage.getItem('guestMobile') || localStorage.getItem('userPhone') || '',
          patient_name: (() => { try { return JSON.parse(localStorage.getItem('patientInfo') || '{}').name || ''; } catch { return ''; } })(),
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error('Failed to create payment session');
      }
    } catch (err) {
      toast.error('Payment service unavailable');
    } finally {
      setStripeLoading(false);
    }
  };

  // Calculations — simple: sale price + delivery
  const pharmSubtotal = getPharmacyTotal();
  const labSubtotal = getLabTotal();
  const consultSubtotal = getConsultationTotal();
  
  const pharmMrpTotal = pharmacyCart.reduce((sum, item) => {
    const mrp = Math.max(item.mrp || 0, item.price || 0);
    return sum + mrp * item.quantity;
  }, 0);
  
  // Delivery: ₹49 for pharmacy orders < ₹1000, free for >= ₹1000
  const deliveryCharge = (pharmacyCart.length > 0 && pharmSubtotal < 1000) ? 49 : 0;
  
  const finalTotal = pharmSubtotal + labSubtotal + consultSubtotal + deliveryCharge;

  const isEmpty = pharmacyCart.length === 0 && labCart.length === 0 && consultationCart.length === 0;

  // Filter items based on active tab
  const showPharmacy = activeTab === 'all' || activeTab === 'pharmacy';
  const showLab = activeTab === 'all' || activeTab === 'lab';

  // Empty Cart State
  if (isEmpty) {
    return (
      <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #0D0D12 0%, #111118 100%)' }}>
        {/* Header */}
        <div className="sticky top-0 z-10" style={{ background: 'rgba(13,13,18,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }} data-testid="cart-back-btn">
              <ArrowLeft className="w-4.5 h-4.5 text-white/80" />
            </button>
            <h1 className="text-lg font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Cart</h1>
            <button onClick={() => navigate('/pharmacy')} className="ml-auto w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <Search className="w-4 h-4 text-white/60" />
            </button>
          </div>
        </div>
        
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <ShoppingCart className="w-10 h-10 text-white/20" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>Your cart is empty</h2>
          <p className="text-white/40 text-sm text-center mb-8 max-w-xs">Browse our pharmacy or book lab tests to get started with your healthcare needs.</p>
          <div className="flex gap-3 w-full max-w-sm">
            <button onClick={() => navigate('/pharmacy')} className="flex-1 py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97]" style={{ background: 'linear-gradient(135deg, #EA580C, #F97316)', color: '#fff' }} data-testid="browse-pharmacy-btn">
              <Package className="w-4 h-4" /> Pharmacy
            </button>
            <button onClick={() => navigate('/mango')} className="flex-1 py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97]" style={{ background: 'rgba(255,255,255,0.06)', color: '#4ADE80', border: '1px solid rgba(74,222,128,0.2)' }} data-testid="browse-lab-btn">
              <FlaskConical className="w-4 h-4" /> Lab Tests
            </button>
          </div>
        </div>

        <div className="px-4 pb-8">
          <CartProductSuggestions />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-40" style={{ background: 'linear-gradient(180deg, #0D0D12 0%, #111118 100%)' }}>
      {/* Frosted Glass Header */}
      <div className="sticky top-0 z-10" style={{ background: 'rgba(13,13,18,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }} data-testid="cart-back-btn">
            <ArrowLeft className="w-4.5 h-4.5 text-white/80" />
          </button>
          <h1 className="text-lg font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Cart</h1>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => navigate('/pharmacy')} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <Search className="w-4 h-4 text-white/60" />
            </button>
          </div>
        </div>
      </div>

      {/* Cart Type Toggle */}
      {(pharmacyCart.length > 0 && labCart.length > 0) && (
        <div className="px-4 pt-3" data-testid="cart-toggle">
          <div className="p-1 rounded-2xl flex gap-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {[
              { id: 'all', label: `All (${pharmacyCart.length + labCart.length})`, icon: ShoppingCart },
              { id: 'pharmacy', label: `Medicines (${pharmacyCart.length})`, icon: Package },
              { id: 'lab', label: `Tests (${labCart.length})`, icon: FlaskConical },
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 py-2.5 px-2 rounded-xl font-medium text-xs transition-all flex items-center justify-center gap-1.5"
                style={{
                  background: activeTab === tab.id 
                    ? (tab.id === 'lab' ? 'linear-gradient(135deg, #15803D, #16A34A)' : tab.id === 'pharmacy' ? 'linear-gradient(135deg, #EA580C, #F97316)' : 'linear-gradient(135deg, #7C3AED, #8B5CF6)')
                    : 'transparent',
                  color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.4)',
                  boxShadow: activeTab === tab.id ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
                }}
                data-testid={`tab-${tab.id}`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 pt-3 space-y-3">

        {/* Delivery Option */}
        {showPharmacy && pharmacyCart.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }} data-testid="delivery-options">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="w-4 h-4 text-white/50" />
              <span className="text-white text-sm font-semibold">Delivery</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setDeliveryOption('priority')}
                className="p-3 rounded-xl text-left transition-all"
                style={{
                  background: deliveryOption === 'priority' ? 'rgba(249,115,22,0.1)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${deliveryOption === 'priority' ? 'rgba(249,115,22,0.3)' : 'rgba(255,255,255,0.06)'}`,
                }}
                data-testid="delivery-priority">
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-white text-xs font-semibold">Priority</span>
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold" style={{ background: 'rgba(249,115,22,0.2)', color: '#FB923C' }}>FAST</span>
                </div>
                <p className="text-white/40 text-[10px]">Within 60 min</p>
                <p className="text-orange-400 text-xs font-bold mt-1">₹30</p>
              </button>
              <button onClick={() => setDeliveryOption('standard')}
                className="p-3 rounded-xl text-left transition-all"
                style={{
                  background: deliveryOption === 'standard' ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${deliveryOption === 'standard' ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.06)'}`,
                }}
                data-testid="delivery-standard">
                <div className="flex items-center gap-1.5 mb-1">
                  <Truck className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-white text-xs font-semibold">Standard</span>
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-bold" style={{ background: 'rgba(34,197,94,0.2)', color: '#4ADE80' }}>FREE</span>
                </div>
                <p className="text-white/40 text-[10px]">{new Date().getHours() < 15 ? 'Same day' : 'Next day'}</p>
                <p className="text-green-400 text-xs font-bold mt-1">₹0</p>
              </button>
            </div>
          </div>
        )}

        {/* Pharmacy Cart Items */}
        {showPharmacy && pharmacyCart.length > 0 && (
          <div data-testid="pharmacy-items-section">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-orange-400" />
                <span className="text-white text-sm font-semibold">Medicines ({pharmacyCart.length})</span>
              </div>
              <button onClick={clearPharmacyCart} className="text-xs text-red-400/70 hover:text-red-400 transition-colors" data-testid="clear-pharmacy-btn">Clear</button>
            </div>

            {pharmacyCart.map((item, idx) => (
              <div key={idx} className="rounded-2xl p-3.5 mb-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }} data-testid={`cart-item-${idx}`}>
                <div className="flex items-start gap-3">
                  <button onClick={() => navigate(`/pharmacy/product/${item.id || item.name}`)} className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }} data-testid={`cart-item-view-${idx}`}>
                    {item.image ? <img src={item.image} alt={item.name} className="w-14 h-14 object-contain" /> : <Package className="w-7 h-7 text-orange-500/30" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <button onClick={() => navigate(`/pharmacy/product/${item.id || item.name}`)} className="text-left" data-testid={`cart-item-name-${idx}`}>
                      <h3 className="font-medium text-white text-sm leading-tight mb-0.5 line-clamp-2">{item.name}</h3>
                    </button>
                    {item.form && <p className="text-white/30 text-[10px] mb-1">{item.form}</p>}
                    <div className="flex items-center gap-2">
                      {item.mrp && item.mrp > (item.price || 0) && item.price > 0 && (
                        <span className="text-white/30 text-xs line-through">₹{(item.mrp * item.quantity).toFixed(0)}</span>
                      )}
                      {item.price > 0 && <span className="text-orange-400 font-bold text-base">₹{(item.price * item.quantity).toFixed(0)}</span>}
                      {item.discount_percent > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ADE80' }}>{item.discount_percent}% off</span>
                      )}
                    </div>
                  </div>
                </div>
                {/* Quantity + Remove Row */}
                <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="flex items-center rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <button onClick={() => updatePharmacyQuantity(item.name, item.quantity - 1)} className="w-9 h-9 flex items-center justify-center text-white/50 hover:text-white transition-colors" data-testid={`decrease-qty-${idx}`}>
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-semibold text-white text-sm tabular-nums">{item.quantity}</span>
                    <button onClick={() => updatePharmacyQuantity(item.name, item.quantity + 1)} className="w-9 h-9 flex items-center justify-center text-white/50 hover:text-white transition-colors" data-testid={`increase-qty-${idx}`}>
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button onClick={() => removeFromPharmacyCart(item.name)} className="w-9 h-9 flex items-center justify-center rounded-xl text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-all" data-testid={`remove-item-${idx}`}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Lab Cart Items */}
        {showLab && labCart.length > 0 && (
          <div data-testid="lab-items-section">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-green-400" />
                <span className="text-white text-sm font-semibold">Lab Tests ({labCart.length})</span>
              </div>
              <button onClick={clearLabCart} className="text-xs text-red-400/70 hover:text-red-400 transition-colors" data-testid="clear-lab-btn">Clear</button>
            </div>

            {labCart.map((test, idx) => (
              <div key={idx} className="rounded-2xl p-3.5 mb-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }} data-testid={`lab-item-${idx}`}>
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)' }}>
                    <FlaskConical className="w-6 h-6 text-green-400/60" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white text-sm leading-tight mb-0.5">{test.name}</h3>
                    {test.parameters && <p className="text-white/30 text-[10px] mb-1">{test.parameters} parameters</p>}
                    {test.price > 0 && <span className="text-green-400 font-bold text-base">₹{test.price}</span>}
                  </div>
                  <button onClick={() => removeFromLabCart(test.name)} className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            <div className="rounded-xl px-3 py-2 flex items-center gap-2 mb-2" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.1)' }}>
              <Truck className="w-3.5 h-3.5 text-green-400" />
              <span className="text-green-400 text-xs font-medium">Home collection - FREE</span>
            </div>
          </div>
        )}

        {/* Consultation Cart */}
        {consultationCart.length > 0 && (
          <div data-testid="consultation-items-section">
            <div className="flex items-center gap-2 mb-2">
              <Stethoscope className="w-4 h-4 text-teal-400" />
              <span className="text-white text-sm font-semibold">Consultations ({consultationCart.length})</span>
            </div>
            {consultationCart.map((c, idx) => (
              <div key={idx} className="flex items-center justify-between p-3.5 rounded-2xl mb-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div><p className="text-white font-medium text-sm">{c.doctor}</p><p className="text-white/30 text-xs">{c.date} - {c.time}</p></div>
                <div className="flex items-center gap-3">
                  <span className="text-teal-400 font-bold">₹{c.fee}</span>
                  <button onClick={() => removeFromConsultationCart(c.id)} className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bill Summary — Clean & Simple */}
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }} data-testid="price-summary">
          <h3 className="font-bold text-white text-sm mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>Bill Summary</h3>
          <div className="space-y-3">
            {pharmSubtotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Medicines ({pharmacyCart.length} items)</span>
                <span className="text-white font-medium tabular-nums">₹{pharmSubtotal.toFixed(0)}</span>
              </div>
            )}
            {labSubtotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Lab Tests ({labCart.length})</span>
                <span className="text-white font-medium tabular-nums">₹{labSubtotal.toFixed(0)}</span>
              </div>
            )}
            {consultSubtotal > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Consultations</span>
                <span className="text-white font-medium tabular-nums">₹{consultSubtotal.toFixed(0)}</span>
              </div>
            )}

            {/* Delivery */}
            {pharmacyCart.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-white/50 flex items-center gap-1">
                  <Truck className="w-3 h-3 text-green-400" /> Delivery
                </span>
                {deliveryCharge > 0 ? (
                  <span className="text-orange-400 font-medium tabular-nums">₹{deliveryCharge}</span>
                ) : (
                  <span className="text-green-400 font-medium">FREE</span>
                )}
              </div>
            )}
            {labCart.length > 0 && pharmacyCart.length === 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-white/50 flex items-center gap-1">
                  <Truck className="w-3 h-3 text-green-400" /> Home Collection
                </span>
                <span className="text-green-400 font-medium">FREE</span>
              </div>
            )}

            {/* Total */}
            <div className="flex justify-between items-center pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="text-white font-bold text-base">Total amount</span>
              <span className="font-bold text-xl tabular-nums" style={{ color: pharmacyCart.length > 0 ? '#FB923C' : '#4ADE80' }} data-testid="grand-total">₹{finalTotal.toFixed(0)}</span>
            </div>
            {pharmacyCart.length > 0 && pharmSubtotal < 1000 && (
              <p className="text-white/30 text-[10px] text-center">Add ₹{(1000 - pharmSubtotal).toFixed(0)} more for FREE delivery</p>
            )}
          </div>
        </div>

        {/* CuraOne Membership Banner */}
        <div className="rounded-2xl p-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(168,85,247,0.06))', border: '1px solid rgba(168,85,247,0.15)' }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[9px] font-bold" style={{ background: 'rgba(168,85,247,0.25)', color: '#C084FC' }}>CuraOne</span>
                <span className="text-white/60 text-[10px]">Membership</span>
              </div>
              <p className="text-white text-xs font-medium">Extra 4% off on all products</p>
              <p className="text-white/40 text-[10px]">Free & faster delivery</p>
            </div>
            <button onClick={() => navigate('/cura-one')} className="px-3 py-2 rounded-xl text-xs font-bold" style={{ background: 'rgba(168,85,247,0.2)', color: '#C084FC', border: '1px solid rgba(168,85,247,0.3)' }}>
              View Plans
            </button>
          </div>
        </div>

        {/* Before You Checkout - Product Suggestions */}
        <div data-testid="before-checkout-section">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: labCart.length > 0 && pharmacyCart.length === 0 ? 'rgba(74,222,128,0.1)' : 'rgba(249,115,22,0.1)' }}>
              {labCart.length > 0 && pharmacyCart.length === 0
                ? <FlaskConical className="w-4 h-4 text-green-400" />
                : <ShoppingBag className="w-4 h-4 text-orange-400" />}
            </div>
            <span className="text-white font-bold text-sm" style={{ fontFamily: 'Outfit, sans-serif' }}>
              {labCart.length > 0 && pharmacyCart.length === 0 ? 'Recommended Tests' : 'Before you checkout'}
            </span>
          </div>
          
          {/* Suggestion Tabs — only for pharmacy */}
          {pharmacyCart.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide">
              {SUGGESTION_TABS.map(tab => (
                <button key={tab.id} onClick={() => setSuggestionTab(tab.id)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all"
                  style={{
                    background: suggestionTab === tab.id ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                    color: suggestionTab === tab.id ? '#fff' : 'rgba(255,255,255,0.4)',
                    border: `1px solid ${suggestionTab === tab.id ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Context-aware suggestions */}
          <CartProductSuggestions />
        </div>

        {/* Smart Bundle Suggestions */}
        {pharmacyCart.length > 0 && <SmartBundleSuggestions className="mt-0" />}
        {pharmacyCart.length > 0 && <FrequentlyBoughtTogether cartItems={pharmacyCart} />}

        {/* Trust Badges */}
        <TrustBadges />
        <div className="text-center pb-4">
          <button onClick={() => navigate('/return-refund-policy')} className="text-[10px] text-white/20 hover:text-orange-400 transition-colors underline" data-testid="return-policy-link">Return & Refund Policy</button>
        </div>
      </div>

      {/* Sticky Bottom Checkout Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20" style={{ background: 'rgba(13,13,18,0.95)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderTop: '1px solid rgba(255,255,255,0.06)' }} data-testid="checkout-footer">
        {/* CuraOne Free Delivery Banner */}
        {deliveryCharge === 0 && pharmacyCart.length > 0 && (
          <div className="px-4 py-2 flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, rgba(22,163,74,0.15), rgba(34,197,94,0.1))', borderBottom: '1px solid rgba(34,197,94,0.1)' }}>
            <span className="text-[10px] text-emerald-400 font-medium">Free Delivery unlocked</span>
            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold" style={{ background: 'rgba(168,85,247,0.2)', color: '#C084FC' }}>CuraOne</span>
          </div>
        )}
        
        <div className="max-w-lg mx-auto px-4 py-3 space-y-2">
          {/* Main Checkout Button */}
          <button
            onClick={handleProceedToCheckout}
            className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{
              background: pharmacyCart.length > 0 
                ? 'linear-gradient(135deg, #EA580C, #F97316, #FB923C)'
                : 'linear-gradient(135deg, #15803D, #16A34A, #22C55E)',
              color: '#fff',
              boxShadow: pharmacyCart.length > 0 
                ? '0 4px 20px rgba(234,88,12,0.35)' 
                : '0 4px 20px rgba(22,163,74,0.35)',
            }}
            data-testid="proceed-to-checkout-btn"
          >
            Confirm and pay ₹{finalTotal.toFixed(0)}
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Stripe International Payment Option */}
          {pharmacyCart.length > 0 && (
            <button
              onClick={handleStripePayment}
              disabled={stripeLoading}
              className="w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{ background: 'rgba(99,102,241,0.08)', color: '#A5B4FC', border: '1px solid rgba(99,102,241,0.2)' }}
              data-testid="stripe-intl-btn"
            >
              <Globe className="w-4 h-4" />
              {stripeLoading ? 'Processing...' : 'Pay with Card (International)'}
              <CreditCard className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartPage;

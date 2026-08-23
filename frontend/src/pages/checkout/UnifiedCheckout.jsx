import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCart } from '@/context/CartContext';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { toast } from 'sonner';
import axios from 'axios';
import CuraPayTransition from '@/components/CuraPayTransition';
import InvoiceStatusAnimation from '@/components/InvoiceStatusAnimation';
import PharmacistVerification from '@/components/PharmacistVerification';
import TrustBadges from '@/components/TrustBadges';
import {
  ArrowLeft, Package, FlaskConical, MapPin, CreditCard, Clock,
  CheckCircle2, Loader2, Home, Building2, ChevronRight, Phone,
  MessageCircle, Trash2, Plus, Minus, ShieldCheck, Gift, Wallet, Star, Tag
} from 'lucide-react';
import BookingConfirmation from '@/components/BookingConfirmation';
import { RatingModal, useRatingPrompt } from '@/components/RatingModal';
import { successPattern, errorPattern, bookingConfirmed } from '@/utils/haptics';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

/**
 * Unified Checkout Component
 * Handles both Pharmacy (medicine) and Mango Labs (tests) checkouts
 * 
 * Usage:
 *   /checkout?type=pharmacy  - For pharmacy orders
 *   /checkout?type=lab       - For lab test bookings
 *   /checkout                - Auto-detects based on cart contents
 */

// Theme configuration based on checkout type
const THEMES = {
  pharmacy: {
    name: 'Orange Pharmacy',
    bg: '#0D0D0D',
    accent: '#EA580C',
    accentLight: '#FED7AA',
    icon: Package,
    gradient: 'from-orange-600 to-amber-500',
  },
  lab: {
    name: 'Nevika Labs',
    bg: '#0A0A0A',
    accent: '#C8F56A',
    accentLight: '#E8FCAD',
    icon: FlaskConical,
    gradient: 'from-green-600 to-emerald-500',
  },
  consultation: {
    name: 'DiaGyn Consultation',
    bg: '#0A0A0A',
    accent: '#14b8a6',
    accentLight: '#ccfbf1',
    icon: FlaskConical,
    gradient: 'from-teal-600 to-cyan-500',
  }
};

// Checkout Steps
const STEPS = {
  REVIEW: 1,
  DETAILS: 2,
  PAYMENT: 3,
  CONFIRMATION: 4
};

const UnifiedCheckout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    pharmacyCart,
    labCart,
    consultationCart,
    removeFromPharmacyCart,
    removeFromLabCart,
    removeFromConsultationCart,
    updatePharmacyQuantity,
    clearPharmacyCart,
    clearLabCart,
    clearConsultationCart,
    getPharmacyTotal,
    getLabTotal,
    getConsultationTotal,
    calculateDiscount,
    appliedCoupon,
    getCouponDiscount,
    getCoinsDiscount,
    coinsToRedeem,
    pointsToUse,
  } = useCart();

  // Use unified auth hook
  const auth = useUnifiedAuth();

  // Auto-detect guest login and skip OTP
  const guestMobile = localStorage.getItem('guestMobile') || localStorage.getItem('userPhone');
  const isGuestVerified = Boolean(guestMobile);
  const isEmailAuth = localStorage.getItem('authMethod') === 'email';
  const emailUserData = isEmailAuth ? JSON.parse(localStorage.getItem('userData') || '{}') : {};

  useEffect(() => {
    if (isGuestVerified && guestMobile) {
      setCustomerDetails(prev => ({ ...prev, phone: prev.phone || guestMobile }));
    }
    if (isEmailAuth && emailUserData.email) {
      setCustomerDetails(prev => ({ ...prev, email: prev.email || emailUserData.email, name: prev.name || emailUserData.name || '' }));
    }
  }, [isGuestVerified, guestMobile, isEmailAuth]);

  // Determine checkout type
  const typeParam = searchParams.get('type');
  const isUnifiedMulti = !typeParam && [pharmacyCart.length > 0, labCart.length > 0, consultationCart.length > 0].filter(Boolean).length > 1;
  const checkoutType = typeParam || (pharmacyCart.length > 0 ? 'pharmacy' : labCart.length > 0 ? 'lab' : 'consultation');
  const theme = THEMES[checkoutType] || THEMES.pharmacy;
  const Icon = theme.icon;

  // Get all carts for unified checkout
  const allCarts = isUnifiedMulti ? [
    ...pharmacyCart.map(i => ({ ...i, cartType: 'pharmacy' })),
    ...labCart.map(i => ({ ...i, cartType: 'lab' })),
    ...consultationCart.map(i => ({ ...i, cartType: 'consultation' })),
  ] : (checkoutType === 'pharmacy' ? pharmacyCart : checkoutType === 'lab' ? labCart : consultationCart);
  const cart = allCarts;
  const getTotal = isUnifiedMulti
    ? () => getPharmacyTotal() + getLabTotal() + getConsultationTotal()
    : checkoutType === 'pharmacy' ? getPharmacyTotal : checkoutType === 'lab' ? getLabTotal : getConsultationTotal;
  const clearCart = () => {
    if (isUnifiedMulti) { clearPharmacyCart(); clearLabCart(); clearConsultationCart(); }
    else if (checkoutType === 'pharmacy') clearPharmacyCart();
    else if (checkoutType === 'lab') clearLabCart();
    else clearConsultationCart();
  };

  // State
  const [currentStep, setCurrentStep] = useState(STEPS.REVIEW);
  const [loading, setLoading] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const { showRating, ratingService, ratingOrderId, triggerRating, dismissRating } = useRatingPrompt();
  const [orderDetails, setOrderDetails] = useState(null);

  // Customer details
  const [customerDetails, setCustomerDetails] = useState({
    name: '',
    phone: '',
    email: '',
  });

  // OTP verification (using unified auth)
  const [otp, setOtp] = useState('');
  const otpRefs = useRef([]);
  const nameInputRef = useRef(null);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(isGuestVerified || isEmailAuth);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);

  // Address
  const [address, setAddress] = useState({
    type: 'home',
    line1: '',
    line2: '',
    landmark: '',
    city: 'Chhindwara',
    pincode: '480001',
  });

  // Payment
  const [paymentMethod, setPaymentMethod] = useState('pay_later');

  // Loyalty Points & Wallet
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loyaltyApplied, setLoyaltyApplied] = useState(false);
  const [walletApplied, setWalletApplied] = useState(false);
  const [loyaltyDiscount, setLoyaltyDiscount] = useState(0);
  const [walletDiscount, setWalletDiscount] = useState(0);
  const [paymentFailure, setPaymentFailure] = useState(false);
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);
  const [failureMessage, setFailureMessage] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [pendingOrderDetails, setPendingOrderDetails] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Best coupon auto-suggest
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [bestCoupon, setBestCoupon] = useState(null);
  const [couponApplied, setCouponApplied] = useState(false);

  // Delivery time estimates
  const getDeliveryEstimate = () => {
    const hour = new Date().getHours();
    if (checkoutType === 'pharmacy') {
      if (hour >= 8 && hour < 17) return { time: '45-60 mins', label: 'Express Delivery', fast: true };
      if (hour >= 17 && hour < 21) return { time: '60-90 mins', label: 'Evening Delivery', fast: false };
      return { time: 'By 10 AM tomorrow', label: 'Next Morning', fast: false };
    }
    if (checkoutType === 'lab') {
      if (hour >= 6 && hour < 10) return { time: '60 mins', label: 'Morning Slot Available', fast: true };
      if (hour >= 10 && hour < 18) return { time: '2-3 hours', label: 'Same Day Collection', fast: false };
      return { time: 'Tomorrow 7-10 AM', label: 'Next Morning Slot', fast: false };
    }
    return { time: '30-60 mins', label: 'Consultation', fast: true };
  };
  const deliveryEstimate = getDeliveryEstimate();

  // Empty cart check
  useEffect(() => {
    if (cart.length === 0 && !orderComplete) {
      navigate(checkoutType === 'pharmacy' ? '/pharmacy' : '/labs');
    }
  }, [cart, orderComplete, navigate, checkoutType]);

  // Fetch loyalty points and wallet balance
  useEffect(() => {
    const fetchRewards = async () => {
      const token = localStorage.getItem('token') || localStorage.getItem('patientToken');
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };
      try {
        const [loyaltyRes, walletRes] = await Promise.all([
          axios.get(`${API}/user/loyalty-points`, { headers }).catch(() => ({ data: { loyalty_points: 0 } })),
          axios.get(`${API}/wallet/balance`, { headers }).catch(() => ({ data: { balance: 0 } }))
        ]);
        setLoyaltyPoints(loyaltyRes.data.loyalty_points || 0);
        setWalletBalance(walletRes.data.balance || 0);
      } catch (e) { console.error(e); }
    };
    fetchRewards();
  }, []);

  // Fetch available coupons and auto-suggest best one
  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const r = await axios.get(`${API}/coupons/available`, { params: { order_type: checkoutType, subtotal } }).catch(() => null);
        if (r?.data?.coupons) {
          setAvailableCoupons(r.data.coupons);
          // Find best coupon by discount amount
          const best = r.data.coupons.reduce((max, c) => {
            const val = c.discount_type === 'percentage' ? Math.min(subtotal * c.discount_value / 100, c.max_discount || Infinity) : c.discount_value;
            return val > (max?.value || 0) ? { ...c, value: val } : max;
          }, null);
          if (best && best.value > 0) setBestCoupon(best);
        }
      } catch { /* no coupons available */ }
    };
    if (subtotal > 0) fetchCoupons();
  }, [subtotal, checkoutType]);

  // Calculate totals — with coupon + coins + loyalty from CartContext
  const subtotal = getTotal();
  const discount = checkoutType === 'pharmacy' ? calculateDiscount() : 0;
  const couponDiscount = getCouponDiscount();
  const coinsDiscount = getCoinsDiscount();
  const deliveryFee = subtotal >= 500 ? 0 : 30;
  const totalBeforeRewards = subtotal - discount - couponDiscount - coinsDiscount + deliveryFee;
  const total = Math.max(0, totalBeforeRewards - loyaltyDiscount - walletDiscount);

  // Toggle loyalty points (10 points = ₹1)
  const toggleLoyalty = () => {
    if (!loyaltyApplied && loyaltyPoints > 0) {
      const maxLoyaltyValue = Math.floor(loyaltyPoints / 10); // 10 pts = ₹1
      const applicableDiscount = Math.min(maxLoyaltyValue, totalBeforeRewards - walletDiscount);
      setLoyaltyDiscount(applicableDiscount);
      setLoyaltyApplied(true);
      toast.success(`₹${applicableDiscount} loyalty discount applied!`);
    } else {
      setLoyaltyDiscount(0);
      setLoyaltyApplied(false);
    }
  };

  // Toggle wallet balance
  const toggleWallet = () => {
    if (!walletApplied && walletBalance > 0) {
      const applicableDiscount = Math.min(walletBalance, totalBeforeRewards - loyaltyDiscount);
      setWalletDiscount(applicableDiscount);
      setWalletApplied(true);
      toast.success(`₹${applicableDiscount.toFixed(2)} wallet balance applied!`);
    } else {
      setWalletDiscount(0);
      setWalletApplied(false);
    }
  };

  // OTP input handlers
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otpDigits];
    newOtp[index] = value.slice(-1);
    setOtpDigits(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Send OTP for phone change
  const sendPhoneChangeOtp = async () => {
    if (!editPhone || editPhone.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    const result = await auth.sendOtp(editPhone, 'phone_change');
    if (result.success) {
      setOtpDigits(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  };

  const verifyPhoneChangeOtp = async () => {
    const otpValue = otpDigits.join('');
    if (otpValue.length !== 6) {
      toast.error('Please enter complete 6-digit OTP');
      return;
    }
    const result = await auth.verifyOtp(otpValue);
    if (result.success) {
      setCustomerDetails(prev => ({ ...prev, phone: editPhone }));
      localStorage.setItem('guestMobile', editPhone);
      setPhoneVerified(true);
      setIsEditingPhone(false);
      setOtpDigits(['', '', '', '', '', '']);
      toast.success('Phone number verified!');
      successPattern();
    } else {
      setOtpDigits(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    }
  };

  // Send OTP using unified auth (for unverified users)
  const handleSendOtp = async () => {
    if (!customerDetails.name.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (customerDetails.phone.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    const purpose = checkoutType === 'pharmacy' ? 'pharmacy_order' : 'lab_booking';
    await auth.sendOtp(customerDetails.phone, purpose);
  };

  // Verify OTP using unified auth
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }
    const result = await auth.verifyOtp(otp);
    if (result.success) {
      setCurrentStep(STEPS.PAYMENT);
    }
  };

  // CuraPay transition state
  const [showCuraPay, setShowCuraPay] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState(null);
  const pendingRedirectRef = useRef(null);

  // Place order
  const handlePlaceOrder = async () => {
    // For non-online payments
    if (paymentMethod === 'curapay') {
      setLoading(true);
      // Check balance
      if (walletBalance < total) {
        setFailureMessage(`Insufficient CuraPay balance. Need ₹${(total - walletBalance).toFixed(0)} more.`);
        setPaymentFailure(true);
        setLoading(false);
        return;
      }
    } else if (paymentMethod !== 'upi' && paymentMethod !== 'split') {
      setLoading(true);
    }
    try {
      const orderData = {
        customer: {
          name: customerDetails.name,
          phone: customerDetails.phone,
          email: customerDetails.email,
        },
        address: {
          type: address.type,
          line1: address.line1,
          line2: address.line2,
          landmark: address.landmark,
          city: address.city,
          pincode: address.pincode,
          full_address: `${address.line1}${address.line2 ? ', ' + address.line2 : ''}${address.landmark ? ', Near ' + address.landmark : ''}, ${address.city} - ${address.pincode}`
        },
        payment_method: paymentMethod === 'upi' || paymentMethod === 'split' ? 'cashfree' : paymentMethod,
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity || 1,
          type: item.cartType || item.type || checkoutType
        })),
        subtotal,
        discount,
        delivery_fee: deliveryFee,
        loyalty_points_used: loyaltyApplied ? loyaltyDiscount * 10 : 0,
        loyalty_discount: loyaltyDiscount,
        wallet_discount: walletDiscount,
        total,
        order_type: isUnifiedMulti ? 'unified' : checkoutType
      };

      const endpoint = isUnifiedMulti ? '/checkout/unified' : checkoutType === 'pharmacy' ? '/pharmacy/order' : checkoutType === 'lab' ? '/lab/booking' : '/checkout/unified';
      const response = await axios.post(`${API}${endpoint}`, orderData);
      const orderId = response.data.order_id || response.data.booking_id || `${checkoutType.toUpperCase()}-${Date.now()}`;

      // For online payment methods, redirect to Cashfree
      if (paymentMethod === 'upi' || paymentMethod === 'split') {
        const cleanPhone = customerDetails.phone.replace(/\D/g, '').slice(-10);
        const payAmount = paymentMethod === 'split' ? Math.ceil(total / 2) : total;
        const payRes = await fetch(`${API}/payments/cashfree/create-order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_id: `UNIFIED_${cleanPhone}_${Date.now()}`,
            customer_name: customerDetails.name,
            customer_email: customerDetails.email || `${cleanPhone}@nevikacura.com`,
            customer_phone: cleanPhone,
            amount: payAmount,
            product_type: checkoutType === 'pharmacy' ? 'pharmacy' : 'lab_test',
            product_id: orderId,
            return_url: `${window.location.origin}/payment-success?order_id=${orderId}&type=${checkoutType}`
          })
        });
        const payData = await payRes.json();
        
        if (payData.payment_session_id) {
          const url = `/checkout?session=${payData.payment_session_id}&order=${payData.order_id || orderId}&amount=${payAmount}&type=${checkoutType}`;
          setPendingRedirect(url);
          pendingRedirectRef.current = url;
          // Show CuraPay transition AFTER API success
          setShowCuraPay(true);
        } else {
          setFailureMessage(payData.detail || 'Payment session creation failed');
          setPaymentFailure(true);
          setLoading(false);
        }
        return;
      }

      // CuraPay Wallet Payment — instant deduction
      if (paymentMethod === 'curapay') {
        try {
          const token = localStorage.getItem('token');
          const payRes = await axios.post(`${API}/wallet/curapay/checkout`, {
            amount: total,
            service_type: checkoutType,
            reference_id: orderId,
            description: `${checkoutType === 'pharmacy' ? 'Orange Pharmacy' : checkoutType === 'lab' ? 'Mango Labs' : 'DiaGyn'} order #${orderId}`
          }, { headers: { Authorization: `Bearer ${token}` } });
          
          if (payRes.data.success) {
            // CuraPay success — animation will show in the general success block below
            setWalletBalance(payRes.data.new_balance);
          }
        } catch (e) {
          setFailureMessage(e.response?.data?.detail || 'CuraPay payment failed');
          setPaymentFailure(true);
          setLoading(false);
          return;
        }
      }

      // Pay Later / COD — show verification for pharmacy, then confirmation
      const details = {
        orderId,
        items: cart,
        total,
        paymentMethod,
        address: orderData.address.full_address,
        customerName: customerDetails.name,
        customerPhone: customerDetails.phone,
      };

      if (checkoutType === 'pharmacy') {
        setPendingOrderDetails(details);
        setShowVerification(true);
      } else {
        setOrderDetails(details);
        clearCart();
        setShowSuccessAnim(true);
        triggerRating(checkoutType === 'pharmacy' ? 'orange' : 'mango');
      }

    } catch (error) {
      console.error('Order error:', error);
      setShowCuraPay(false);
      setFailureMessage(error.response?.data?.detail || 'Failed to place order');
      setPaymentFailure(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCuraPayComplete = () => {
    const url = pendingRedirectRef.current;
    if (url) {
      clearCart();
      navigate(url);
    }
  };

  const handleVerificationComplete = () => {
    setShowVerification(false);
    if (pendingOrderDetails) {
      setOrderDetails(pendingOrderDetails);
      setPendingOrderDetails(null);
      clearCart();
      setShowSuccessAnim(true);
      triggerRating('orange');
    }
  };

  // Show confirmation
  if (orderComplete && orderDetails) {
    return (
      <BookingConfirmation
        type={checkoutType}
        orderDetails={orderDetails}
      />
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bg }}>
      {/* Pharmacist Verification Overlay */}
      <PharmacistVerification
        hasRxItems={checkoutType === 'pharmacy'}
        visible={showVerification}
        onComplete={handleVerificationComplete}
      />
      {/* Order Success Animation */}
      {showSuccessAnim && (
        <InvoiceStatusAnimation
          variant="success"
          show={true}
          title="Order Confirmed!"
          subtitle="Your order has been placed successfully"
          autoHide={true}
          autoHideDelay={3000}
          onComplete={() => { setShowSuccessAnim(false); setOrderComplete(true); }}
        />
      )}
      {/* Payment Failure with Retry */}
      {paymentFailure && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6" data-testid="payment-failure-modal">
          <div className="bg-[#1A1A1A] rounded-3xl p-8 max-w-sm w-full text-center border border-red-500/20">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </div>
            <h3 className="text-white text-xl font-bold mb-2">Payment Failed</h3>
            <p className="text-zinc-400 text-sm mb-6">{failureMessage || 'Something went wrong. Please try again.'}</p>
            <div className="space-y-3">
              <Button onClick={() => { setPaymentFailure(false); setFailureMessage(''); setRetryCount(p => p + 1); handlePlaceOrder(); }}
                className="w-full py-4 font-semibold" style={{ backgroundColor: theme.accent }} data-testid="retry-payment-btn">
                Retry Payment {retryCount > 0 && `(Attempt ${retryCount + 1})`}
              </Button>
              <Button variant="outline" onClick={() => { setPaymentFailure(false); setFailureMessage(''); setPaymentMethod('pay_later'); }}
                className="w-full py-4 border-zinc-700 text-zinc-300 hover:bg-zinc-800" data-testid="switch-payment-btn">
                Try Different Payment Method
              </Button>
              <button onClick={() => { setPaymentFailure(false); setFailureMessage(''); }} className="text-zinc-500 text-sm hover:text-zinc-400">Dismiss</button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className={`bg-gradient-to-r ${theme.gradient} p-4 sticky top-0 z-10`}>
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => currentStep > STEPS.REVIEW ? setCurrentStep(s => s - 1) : navigate(-1)}
            className="p-2 hover:bg-white/20 rounded-full text-white transition-colors"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Icon className="w-6 h-6 text-white" />
          <h1 className="text-lg font-semibold text-white">{theme.name} Checkout</h1>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {['Review', 'Details', 'Payment'].map((step, idx) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                currentStep > idx + 1 ? `bg-[${theme.accent}] text-white` :
                currentStep === idx + 1 ? `bg-[${theme.accent}] text-white` :
                'bg-zinc-800 text-zinc-500'
              }`} style={{ backgroundColor: currentStep >= idx + 1 ? theme.accent : undefined }}>
                {currentStep > idx + 1 ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
              </div>
              <span className={`ml-2 text-sm ${currentStep >= idx + 1 ? 'text-white' : 'text-zinc-500'}`}>
                {step}
              </span>
              {idx < 2 && <ChevronRight className="w-4 h-4 mx-2 text-zinc-600" />}
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-32">
        {/* Step 1: Review Cart */}
        {currentStep === STEPS.REVIEW && (
          <div className="space-y-4">
            <Card className="bg-[#1A1A1A] border-zinc-800 p-4">
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Icon className="w-5 h-5" style={{ color: theme.accent }} />
                Order Items ({cart.length})
              </h2>
              
              <div className="space-y-3">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0">
                    <div className="flex-1">
                      <p className="text-white font-medium">{item.name}</p>
                      <p className="text-zinc-400 text-sm">₹{item.price}</p>
                    </div>
                    
                    {checkoutType === 'pharmacy' && item.quantity && (
                      <div className="flex items-center gap-2 mr-4">
                        <button
                          onClick={() => updatePharmacyQuantity(item.name, Math.max(1, item.quantity - 1))}
                          className="p-1 bg-zinc-800 rounded hover:bg-zinc-700"
                        >
                          <Minus className="w-4 h-4 text-white" />
                        </button>
                        <span className="text-white w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updatePharmacyQuantity(item.name, item.quantity + 1)}
                          className="p-1 bg-zinc-800 rounded hover:bg-zinc-700"
                        >
                          <Plus className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    )}
                    
                    <button
                      onClick={() => checkoutType === 'pharmacy' ? removeFromPharmacyCart(item.name) : removeFromLabCart(item.id)}
                      className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg"
                      data-testid={`remove-item-${idx}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </Card>

            {/* Order Summary */}
            <Card className="bg-[#1A1A1A] border-zinc-800 p-4">
              <h3 className="text-white font-semibold mb-3">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-400">
                    <span>Discount</span>
                    <span>-₹{discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-zinc-400">
                  <span>Delivery</span>
                  <span>{deliveryFee > 0 ? `₹${deliveryFee}` : 'FREE'}</span>
                </div>
                {loyaltyDiscount > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span className="flex items-center gap-1"><Star className="w-3 h-3" /> Loyalty Points</span>
                    <span>-₹{loyaltyDiscount.toFixed(2)}</span>
                  </div>
                )}
                {walletDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span className="flex items-center gap-1"><Wallet className="w-3 h-3" /> Wallet</span>
                    <span>-₹{walletDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-white font-semibold pt-2 border-t border-zinc-700">
                  <span>Total</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>
            </Card>

            {/* Apply Rewards Section */}
            {(loyaltyPoints > 0 || walletBalance > 0) && (
              <Card className="bg-[#1A1A1A] border-zinc-800 p-4">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4" style={{ color: theme.accent }} />
                  Apply Rewards
                </h3>
                <div className="space-y-3">
                  {loyaltyPoints > 0 && (
                    <button
                      onClick={toggleLoyalty}
                      data-testid="apply-loyalty-btn"
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                        loyaltyApplied 
                          ? 'border-amber-500/50 bg-amber-500/10' 
                          : 'border-zinc-700 hover:border-zinc-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                          <Star className="w-5 h-5 text-amber-400" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-white">Loyalty Points</p>
                          <p className="text-xs text-zinc-400">{loyaltyPoints} pts = ₹{Math.floor(loyaltyPoints / 10)} value</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                        loyaltyApplied 
                          ? 'bg-amber-500 text-black' 
                          : 'bg-zinc-700 text-zinc-300'
                      }`}>
                        {loyaltyApplied ? 'Applied' : 'Apply'}
                      </div>
                    </button>
                  )}
                  {walletBalance > 0 && (
                    <button
                      onClick={toggleWallet}
                      data-testid="apply-wallet-btn"
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                        walletApplied 
                          ? 'border-emerald-500/50 bg-emerald-500/10' 
                          : 'border-zinc-700 hover:border-zinc-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                          <Wallet className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-white">Wallet Balance</p>
                          <p className="text-xs text-zinc-400">₹{walletBalance.toFixed(2)} available</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                        walletApplied 
                          ? 'bg-emerald-500 text-black' 
                          : 'bg-zinc-700 text-zinc-300'
                      }`}>
                        {walletApplied ? 'Applied' : 'Apply'}
                      </div>
                    </button>
                  )}
                </div>
              </Card>
            )}

            {/* Delivery Time Estimate */}
            <Card className="bg-[#1A1A1A] border-zinc-800 p-4" data-testid="delivery-estimate-card">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${deliveryEstimate.fast ? 'bg-green-900/30' : 'bg-amber-900/30'}`}>
                  <Clock className={`w-6 h-6 ${deliveryEstimate.fast ? 'text-green-400' : 'text-amber-400'}`} />
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold">{deliveryEstimate.label}</p>
                  <p className="text-zinc-400 text-sm">Estimated: <span className={deliveryEstimate.fast ? 'text-green-400 font-medium' : 'text-amber-400 font-medium'}>{deliveryEstimate.time}</span></p>
                </div>
                {deliveryEstimate.fast && <span className="px-2 py-1 bg-green-900/50 text-green-300 text-xs font-medium rounded-full">Fast</span>}
              </div>
            </Card>

            {/* Best Coupon Auto-Suggest */}
            {bestCoupon && !couponApplied && (
              <Card className="bg-gradient-to-r from-amber-900/20 to-orange-900/20 border-amber-500/30 p-4" data-testid="best-coupon-card">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Gift className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-amber-200 font-semibold text-sm">Best coupon for you!</p>
                    <p className="text-amber-300/70 text-xs">{bestCoupon.code} — Save ₹{bestCoupon.value?.toFixed(0)}</p>
                  </div>
                  <Button size="sm" onClick={() => { setCouponApplied(true); toast.success(`Coupon ${bestCoupon.code} applied! You save ₹${bestCoupon.value?.toFixed(0)}`); }}
                    className="bg-amber-500 text-black hover:bg-amber-400 font-bold px-4 rounded-full" data-testid="apply-best-coupon-btn">
                    Apply
                  </Button>
                </div>
              </Card>
            )}
            {couponApplied && bestCoupon && (
              <Card className="bg-green-900/20 border-green-500/30 p-3" data-testid="coupon-applied-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-green-300 text-sm font-medium">Coupon {bestCoupon.code} applied — ₹{bestCoupon.value?.toFixed(0)} off</span>
                  </div>
                  <button onClick={() => { setCouponApplied(false); toast.info('Coupon removed'); }} className="text-zinc-400 text-xs hover:text-red-400">Remove</button>
                </div>
              </Card>
            )}

            {/* Trust Badges */}
            <div className="py-2">
              <TrustBadges variant="compact" />
            </div>

            <Button
              onClick={() => setCurrentStep(STEPS.DETAILS)}
              className="w-full py-6 text-lg font-semibold"
              style={{ backgroundColor: theme.accent }}
              data-testid="continue-btn"
            >
              Continue
            </Button>
          </div>
        )}

        {/* Step 2: Customer Details */}
        {currentStep === STEPS.DETAILS && (
          <div className="space-y-4">
            <Card className="bg-[#1A1A1A] border-zinc-800 p-5">
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5" style={{ color: theme.accent }} />
                Your Details
              </h2>

              <div className="space-y-4">
                {/* Name — large and prominent */}
                <div>
                  <Label className="text-zinc-400 text-xs font-medium mb-1.5 block">Full Name *</Label>
                  <Input
                    ref={nameInputRef}
                    value={customerDetails.name}
                    onChange={(e) => {
                      setCustomerDetails(prev => ({ ...prev, name: e.target.value }));
                      localStorage.setItem('patientName', e.target.value);
                    }}
                    placeholder="Enter your full name"
                    className="h-12 rounded-lg border-2 text-base font-medium focus:ring-1"
                    style={{ backgroundColor: '#0F0F1A', borderColor: '#333', color: '#FFFFFF', '--tw-ring-color': theme.accent }}
                    autoFocus
                    data-testid="name-input"
                  />
                </div>

                {/* Phone — auto-filled with edit option */}
                <div>
                  <Label className="text-zinc-400 text-xs font-medium mb-1.5 block">Mobile Number {isEmailAuth ? '(for contact)' : ''}</Label>
                  {isEmailAuth && !customerDetails.phone ? (
                    <div className="space-y-2">
                      <Input
                        value={customerDetails.phone}
                        onChange={(e) => setCustomerDetails(prev => ({ ...prev, phone: e.target.value.replace(/[^\d+]/g, '').slice(0, 15) }))}
                        placeholder="e.g. +14161234567 or 9876543210"
                        className="h-12 rounded-lg border-2 text-base font-medium"
                        style={{ backgroundColor: '#0F0F1A', borderColor: '#333', color: '#FFFFFF' }}
                        data-testid="contact-phone-input"
                      />
                      <p className="text-[10px] text-zinc-500">International numbers accepted. No OTP required.</p>
                    </div>
                  ) : isEmailAuth && customerDetails.phone ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-12 rounded-lg border flex items-center px-3 gap-2"
                        style={{ backgroundColor: '#0F0F1A', borderColor: '#333' }}>
                        <span className="text-white font-medium">{customerDetails.phone}</span>
                      </div>
                      <span className="flex items-center gap-1 text-blue-400 text-xs whitespace-nowrap px-2 py-1 rounded-full bg-blue-900/30 border border-blue-800/50">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Contact
                      </span>
                      <button
                        onClick={() => setCustomerDetails(prev => ({ ...prev, phone: '' }))}
                        className="text-xs font-semibold px-3 py-2 rounded-lg hover:opacity-80 transition-colors whitespace-nowrap"
                        style={{ color: theme.accent }}
                        data-testid="edit-contact-phone-btn"
                      >
                        Change
                      </button>
                    </div>
                  ) : !isEditingPhone ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-12 rounded-lg border flex items-center px-3 gap-2"
                        style={{ backgroundColor: '#0F0F1A', borderColor: '#333' }}>
                        <span className="text-zinc-500 font-medium text-sm">+91</span>
                        <span className="text-white font-medium">{customerDetails.phone || '—'}</span>
                      </div>
                      {phoneVerified && (
                        <span className="flex items-center gap-1 text-green-400 text-xs whitespace-nowrap px-2 py-1 rounded-full bg-green-900/30 border border-green-800/50">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                        </span>
                      )}
                      <button
                        onClick={() => { setIsEditingPhone(true); setEditPhone(customerDetails.phone); auth.reset?.(); }}
                        className="text-xs font-semibold px-3 py-2 rounded-lg hover:opacity-80 transition-colors whitespace-nowrap"
                        style={{ color: theme.accent }}
                        data-testid="edit-phone-btn"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 p-3 rounded-lg border bg-white/[0.02]" style={{ borderColor: `${theme.accent}40` }}>
                      <div className="flex gap-2">
                        <div className="px-3 h-11 rounded-lg flex items-center text-zinc-500 text-sm font-medium border" style={{ backgroundColor: '#0F0F1A', borderColor: '#333' }}>+91</div>
                        <Input
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="New number"
                          className="flex-1 h-11 rounded-lg border text-sm"
                          style={{ backgroundColor: '#0F0F1A', borderColor: '#333', color: '#FFFFFF' }}
                          autoFocus
                          data-testid="edit-phone-input"
                        />
                      </div>
                      {!auth.otpSent ? (
                        <div className="flex gap-2">
                          <Button
                            onClick={sendPhoneChangeOtp}
                            disabled={auth.loading || editPhone.length < 10}
                            className="flex-1 h-10 rounded-lg text-sm font-semibold"
                            style={{ backgroundColor: theme.accent }}
                            data-testid="send-phone-otp-btn"
                          >
                            {auth.loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <MessageCircle className="w-4 h-4 mr-1" />}
                            Verify via WhatsApp
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => { setIsEditingPhone(false); auth.reset?.(); }}
                            className="h-10 rounded-lg text-sm border-zinc-600 text-zinc-300"
                            data-testid="cancel-phone-edit-btn"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-center text-xs text-zinc-400">
                            Enter OTP sent to <span className="font-medium text-white">+91 {editPhone}</span>
                          </p>
                          <div className="flex justify-center gap-1.5">
                            {otpDigits.map((digit, idx) => (
                              <Input
                                key={idx}
                                ref={(el) => (otpRefs.current[idx] = el)}
                                type="text" inputMode="numeric" maxLength={1}
                                value={digit}
                                onChange={(e) => handleOtpChange(idx, e.target.value)}
                                onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                                className="w-10 h-11 text-center text-base font-bold rounded-lg border-2"
                                style={{ backgroundColor: '#0F0F1A', borderColor: '#444', color: '#FFFFFF' }}
                                data-testid={`phone-otp-${idx}`}
                              />
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={verifyPhoneChangeOtp}
                              disabled={otpDigits.join('').length !== 6 || auth.loading}
                              className="flex-1 h-10 rounded-lg text-sm font-semibold"
                              style={{ backgroundColor: theme.accent }}
                              data-testid="verify-phone-otp-btn"
                            >
                              {auth.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                            </Button>
                            <Button variant="outline"
                              onClick={() => { setIsEditingPhone(false); auth.reset?.(); setOtpDigits(['','','','','','']); }}
                              className="h-10 rounded-lg text-sm border-zinc-600 text-zinc-300">
                              Cancel
                            </Button>
                          </div>
                          <p className="text-center text-xs">
                            {auth.resendTimer > 0 ? (
                              <span className="text-zinc-500">Resend in {auth.resendTimer}s</span>
                            ) : (
                              <button onClick={sendPhoneChangeOtp} disabled={auth.loading} style={{ color: theme.accent }} className="font-medium">Resend OTP</button>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Email (optional) */}
                {!isEditingPhone && (
                  <div>
                    <Label className="text-zinc-400 text-xs font-medium mb-1.5 block">Email (Optional)</Label>
                    <Input
                      type="email"
                      value={customerDetails.email}
                      onChange={(e) => {
                        setCustomerDetails(prev => ({ ...prev, email: e.target.value }));
                        localStorage.setItem('patientEmail', e.target.value);
                      }}
                      placeholder="your@email.com"
                      className="h-11 rounded-lg border text-sm"
                      style={{ backgroundColor: '#0F0F1A', borderColor: '#333', color: '#FFFFFF' }}
                      data-testid="email-input"
                    />
                  </div>
                )}
              </div>
            </Card>

            {/* Address */}
            <Card className="bg-[#1A1A1A] border-zinc-800 p-4">
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" style={{ color: theme.accent }} />
                {checkoutType === 'pharmacy' ? 'Delivery Address' : 'Sample Collection Address'}
              </h2>

              <div className="space-y-4">
                {/* Address Type */}
                <div className="flex gap-3">
                  {[{ type: 'home', icon: Home, label: 'Home' }, { type: 'office', icon: Building2, label: 'Office' }].map(({ type, icon: TypeIcon, label }) => (
                    <button
                      key={type}
                      onClick={() => setAddress(prev => ({ ...prev, type }))}
                      className={`flex-1 p-3 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${
                        address.type === type 
                          ? 'border-[var(--accent)] bg-[var(--accent)]/10' 
                          : 'border-zinc-700 hover:border-zinc-600'
                      }`}
                      style={{ '--accent': theme.accent }}
                    >
                      <TypeIcon className="w-5 h-5" style={{ color: address.type === type ? theme.accent : '#9CA3AF' }} />
                      <span className={address.type === type ? 'text-white' : 'text-zinc-400'}>{label}</span>
                    </button>
                  ))}
                </div>

                <div>
                  <Label className="text-zinc-400">Address Line 1 *</Label>
                  <Input
                    value={address.line1}
                    onChange={(e) => setAddress(prev => ({ ...prev, line1: e.target.value }))}
                    placeholder="House/Flat No., Building Name"
                    className="bg-zinc-900 border-zinc-700 text-white mt-1"
                    data-testid="address-line1"
                  />
                </div>

                <div>
                  <Label className="text-zinc-400">Address Line 2</Label>
                  <Input
                    value={address.line2}
                    onChange={(e) => setAddress(prev => ({ ...prev, line2: e.target.value }))}
                    placeholder="Street, Area"
                    className="bg-zinc-900 border-zinc-700 text-white mt-1"
                    data-testid="address-line2"
                  />
                </div>

                <div>
                  <Label className="text-zinc-400">Landmark</Label>
                  <Input
                    value={address.landmark}
                    onChange={(e) => setAddress(prev => ({ ...prev, landmark: e.target.value }))}
                    placeholder="Near..."
                    className="bg-zinc-900 border-zinc-700 text-white mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-zinc-400">City</Label>
                    <Input
                      value={address.city}
                      onChange={(e) => setAddress(prev => ({ ...prev, city: e.target.value }))}
                      className="bg-zinc-900 border-zinc-700 text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-zinc-400">Pincode</Label>
                    <Input
                      value={address.pincode}
                      onChange={(e) => setAddress(prev => ({ ...prev, pincode: e.target.value }))}
                      className="bg-zinc-900 border-zinc-700 text-white mt-1"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Continue to Payment Button */}
            <Button
              onClick={() => {
                if (!customerDetails.name.trim()) {
                  toast.error('Please enter your name');
                  nameInputRef.current?.focus();
                  return;
                }
                if (!phoneVerified && !isEmailAuth) {
                  toast.error('Please verify your phone number');
                  return;
                }
                if (isEmailAuth && !customerDetails.phone) {
                  toast.error('Please enter a contact phone number');
                  return;
                }
                if (isEditingPhone) {
                  toast.error('Please complete phone verification first');
                  return;
                }
                if (!address.line1.trim()) {
                  toast.error('Please enter your address');
                  return;
                }
                localStorage.setItem('patientName', customerDetails.name);
                setCurrentStep(STEPS.PAYMENT);
              }}
              disabled={isEditingPhone}
              className="w-full py-5 text-base font-semibold"
              style={{ backgroundColor: theme.accent }}
              data-testid="continue-to-payment-btn"
            >
              Continue to Payment
            </Button>
          </div>
        )}

        {/* Step 3: Payment */}
        {currentStep === STEPS.PAYMENT && (
          <div className="space-y-4">
            <Card className="bg-[#1A1A1A] border-zinc-800 p-4">
              <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" style={{ color: theme.accent }} />
                Payment Method
              </h2>

              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                {/* Pay Later */}
                <Label
                  htmlFor="pay_later"
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'pay_later' ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-zinc-700 hover:border-zinc-600'
                  }`}
                  style={{ '--accent': theme.accent }}
                >
                  <RadioGroupItem value="pay_later" id="pay_later" />
                  <div className="w-12 h-12 bg-blue-900/30 rounded-full flex items-center justify-center">
                    <Clock className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">Pay Later</p>
                    <p className="text-sm text-zinc-400">Receive payment link on WhatsApp</p>
                  </div>
                  <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs font-medium rounded-full">Recommended</span>
                </Label>

                {/* Pay Later Note */}
                {paymentMethod === 'pay_later' && (
                  <div className="flex items-start gap-3 p-3 bg-amber-900/20 border border-amber-500/30 rounded-xl ml-4">
                    <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-200">
                      <span className="font-medium">Note:</span> {checkoutType === 'pharmacy' 
                        ? 'Payment must be completed before your order is dispatched. You\'ll receive a payment link on WhatsApp within 30 minutes.'
                        : 'Payment to be made at the time of sample collection when our phlebotomist visits.'}
                    </p>
                  </div>
                )}

                {/* UPI */}
                {/* CuraPay Wallet */}
                {walletBalance > 0 && (
                  <Label
                    htmlFor="curapay"
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      paymentMethod === 'curapay' ? 'border-[#16a34a] bg-green-900/20' : 'border-zinc-700 hover:border-zinc-600'
                    }`}
                  >
                    <RadioGroupItem value="curapay" id="curapay" />
                    <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(76,29,149,0.4), rgba(22,163,74,0.4))', border: '1px solid rgba(22,163,74,0.3)' }}>
                      <Wallet className="w-6 h-6 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">CuraPay Wallet</p>
                      <p className="text-sm text-zinc-400">Balance: ₹{walletBalance.toFixed(0)} &middot; Earn 3% points</p>
                    </div>
                    {walletBalance >= total && (
                      <span className="px-2 py-1 bg-green-900/50 text-green-300 text-xs font-medium rounded-full">Instant</span>
                    )}
                  </Label>
                )}

                {paymentMethod === 'curapay' && walletBalance < total && (
                  <div className="flex items-start gap-3 p-3 bg-amber-900/20 border border-amber-500/30 rounded-xl ml-4">
                    <Wallet className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-200">
                      <span className="font-medium">Insufficient balance.</span> You need ₹{(total - walletBalance).toFixed(0)} more. <span className="text-green-400 cursor-pointer" onClick={() => window.open('/cura-wallet', '_blank')}>Add money →</span>
                    </p>
                  </div>
                )}

                <Label
                  htmlFor="upi"
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'upi' ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-zinc-700 hover:border-zinc-600'
                  }`}
                  style={{ '--accent': theme.accent }}
                >
                  <RadioGroupItem value="upi" id="upi" />
                  <div className="w-12 h-12 bg-purple-900/30 rounded-full flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">Pay Now (UPI)</p>
                    <p className="text-sm text-zinc-400">GPay, PhonePe, Paytm</p>
                  </div>
                </Label>

                {/* Split Payment - 50% now, 50% on delivery */}
                {total >= 500 && (
                  <>
                    <Label
                      htmlFor="split"
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        paymentMethod === 'split' ? 'border-[var(--accent)] bg-[var(--accent)]/10' : 'border-zinc-700 hover:border-zinc-600'
                      }`}
                      style={{ '--accent': theme.accent }}
                    >
                      <RadioGroupItem value="split" id="split" />
                      <div className="w-12 h-12 bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-full flex items-center justify-center">
                        <div className="text-green-400 font-bold text-sm">50%</div>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-white">Split Payment</p>
                        <p className="text-sm text-zinc-400">Pay ₹{(total / 2).toFixed(0)} now, ₹{(total / 2).toFixed(0)} on delivery</p>
                      </div>
                      <span className="px-2 py-1 bg-green-900/50 text-green-300 text-xs font-medium rounded-full">New</span>
                    </Label>

                    {/* Split Payment Note */}
                    {paymentMethod === 'split' && (
                      <div className="space-y-3 ml-4">
                        <div className="flex items-start gap-3 p-3 bg-green-900/20 border border-green-500/30 rounded-xl">
                          <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                          <div className="text-sm">
                            <p className="text-green-200 font-medium mb-1">How Split Payment works:</p>
                            <ul className="text-green-300/80 space-y-1">
                              <li>• Pay ₹{(total / 2).toFixed(0)} now to confirm order</li>
                              <li>• Pay remaining ₹{(total / 2).toFixed(0)} on delivery</li>
                              <li>• Cash/UPI accepted on delivery</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </RadioGroup>
            </Card>

            {/* Final Summary */}
            <Card className="bg-[#1A1A1A] border-zinc-800 p-4">
              <h3 className="text-white font-semibold mb-3">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-zinc-400">
                  <span>{cart.length} items</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-400">
                    <span>Discount</span>
                    <span>-₹{discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-zinc-400">
                  <span>Delivery</span>
                  <span>{deliveryFee > 0 ? `₹${deliveryFee}` : 'FREE'}</span>
                </div>
                {loyaltyDiscount > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span className="flex items-center gap-1"><Star className="w-3 h-3" /> Loyalty Points</span>
                    <span>-₹{loyaltyDiscount.toFixed(2)}</span>
                  </div>
                )}
                {walletDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span className="flex items-center gap-1"><Wallet className="w-3 h-3" /> Wallet</span>
                    <span>-₹{walletDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-zinc-700">
                  <span>Total</span>
                  <span>₹{total.toFixed(2)}</span>
                </div>
              </div>
            </Card>

            {/* Delivery Info */}
            <Card className="bg-[#1A1A1A] border-zinc-800 p-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-zinc-400 flex-shrink-0" />
                <div>
                  <p className="text-zinc-400 text-sm">{checkoutType === 'pharmacy' ? 'Delivering to' : 'Collection at'}:</p>
                  <p className="text-white">{customerDetails.name}</p>
                  <p className="text-zinc-400 text-sm">{address.line1}, {address.city}</p>
                  <p className="text-zinc-400 text-sm">+91 {customerDetails.phone}</p>
                </div>
              </div>
            </Card>

            {/* Trust Badges */}
            <div className="flex items-center justify-center gap-4 py-4 text-zinc-500 text-xs">
              <div className="flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Secure Payment</span>
              </div>
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>100% Authentic</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mb-3 text-[10px]">
              <a href="/return-refund-policy" className="text-white/25 hover:text-orange-400 underline transition-colors" data-testid="checkout-return-policy">Return & Refund Policy</a>
              <span className="text-white/10">|</span>
              <span className="text-white/25">By placing this order, you agree to our terms</span>
            </div>

            <Button
              onClick={handlePlaceOrder}
              disabled={loading || !address.line1}
              className="w-full py-6 text-lg font-semibold"
              style={{ backgroundColor: theme.accent }}
              data-testid="place-order-btn"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                `Place Order • ₹${total.toFixed(2)}`
              )}
            </Button>
          </div>
        )}
      </div>
      <RatingModal isOpen={showRating} onClose={dismissRating} service={ratingService} orderId={ratingOrderId} />

      {/* CuraPay Transition */}
      <CuraPayTransition visible={showCuraPay} amount={total} onComplete={handleCuraPayComplete} />
    </div>
  );
};

export default UnifiedCheckout;

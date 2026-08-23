import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCart } from '@/context/CartContext';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { toast } from 'sonner';
import axios from 'axios';
import CuraPayTransition from '@/components/CuraPayTransition';
import {
  ArrowLeft, Package, MapPin, CreditCard, Clock, User,
  CheckCircle2, Loader2, Plus, Home, Building2, ChevronRight,
  ShieldCheck, Truck, Phone, MessageCircle, X, Edit2, Trash2
} from 'lucide-react';
import BookingConfirmation from '@/components/BookingConfirmation';
import InvoiceStatusAnimation from '@/components/InvoiceStatusAnimation';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

// Dark Theme Colors for Pharmacy Checkout
const THEME = {
  bg: '#0D0D0D',
  card: '#1A1A1A',
  cardHover: '#222222',
  border: '#333333',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  accent: '#EA580C',
  accentHover: '#DC4B06',
};

// Checkout Steps
const STEPS = {
  CART: 1,
  ADDRESS: 2,
  PAYMENT: 3
};

const PharmacyCheckout = () => {
  const navigate = useNavigate();
  const {
    pharmacyCart,
    removeFromPharmacyCart,
    updatePharmacyQuantity,
    clearPharmacyCart,
  } = useCart();
  const [searchParams] = useSearchParams();

  // Use unified auth hook for OTP handling
  const auth = useUnifiedAuth();

  // Auto-detect guest login — skip OTP if already verified
  const guestMobile = localStorage.getItem('guestMobile') || localStorage.getItem('userPhone');
  const isGuestVerified = Boolean(guestMobile);
  const isEmailAuth = localStorage.getItem('authMethod') === 'email';
  const emailUserData = isEmailAuth ? JSON.parse(localStorage.getItem('userData') || '{}') : {};

  const [currentStep, setCurrentStep] = useState(STEPS.CART);
  const [loading, setLoading] = useState(false);

  // User info - Auto-fill from localStorage
  const [patientInfo, setPatientInfo] = useState(() => {
    const savedName = localStorage.getItem('patientName') || '';
    const savedPhone = localStorage.getItem('guestMobile') || '';
    const savedEmail = localStorage.getItem('patientEmail') || emailUserData.email || '';
    return {
      name: savedName || emailUserData.name || '',
      phone: savedPhone,
      email: savedEmail
    };
  });

  // OTP state - Using unified auth
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([]);
  const nameInputRef = useRef(null);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(isGuestVerified || isEmailAuth);
  // Address state
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: 'home',
    line1: '',
    line2: '',
    landmark: '',
    city: 'Chhindwara',
    pincode: ''
  });

  // Payment state - Default to pay_now (direct Cashfree)
  const [paymentMethod, setPaymentMethod] = useState('pay_now');
  const [savedPaymentMethods, setSavedPaymentMethods] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  
  // Booking confirmation state
  const [showBookingConfirmation, setShowBookingConfirmation] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);

  // Load saved addresses from API when entering address step
  useEffect(() => {
    if (currentStep === STEPS.ADDRESS && patientInfo.phone) {
      axios.get(`${API}/addresses/${patientInfo.phone}`)
        .then(res => {
          const addrs = (res.data.addresses || []).map(a => ({
            ...a,
            fullAddress: a.full_address || `${a.city} - ${a.pincode}`
          }));
          setSavedAddresses(addrs);
          const def = addrs.find(a => a.is_default);
          if (def && !selectedAddressId) setSelectedAddressId(def.id);
        })
        .catch(() => {});
    }
  }, [currentStep, patientInfo.phone]);

  // Load saved payment methods and wallet balance
  useEffect(() => {
    if (currentStep === STEPS.PAYMENT && patientInfo.phone) {
      Promise.all([
        axios.get(`${API}/payment-methods/${patientInfo.phone}`).catch(() => ({ data: { payment_methods: [] } })),
        axios.get(`${API}/wallet/${patientInfo.phone}`).catch(() => ({ data: { wallet: { balance: 0 } } })),
      ]).then(([pmRes, wRes]) => {
        setSavedPaymentMethods(pmRes.data.payment_methods || []);
        setWalletBalance(wRes.data.wallet?.balance || 0);
      });
    }
  }, [currentStep, patientInfo.phone]);

  // Cart calculations — Simple: sale price + delivery
  const subtotal = Math.round(pharmacyCart.reduce((sum, item) => sum + (Math.round(item.mrp || item.price || 0) * item.quantity), 0));
  const itemsTotal = Math.round(pharmacyCart.reduce((sum, item) => sum + (Math.round(item.price || item.mrp || 0) * item.quantity), 0));
  const totalDiscount = Math.max(0, subtotal - itemsTotal);
  
  // No coupon or coin discounts — simplified billing
  
  // Delivery: ₹49 for orders < ₹1000, free for >= ₹1000
  const deliveryCharge = itemsTotal >= 1000 ? 0 : 49;
  // Final total = items + delivery
  const total = Math.max(0, itemsTotal + deliveryCharge);

  // Send OTP for phone change verification
  const sendPhoneChangeOtp = async () => {
    if (!editPhone || editPhone.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    const result = await auth.sendOtp(editPhone, 'phone_change');
    if (result.success) {
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  };

  // Verify phone change OTP
  const verifyPhoneChangeOtp = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      toast.error('Please enter complete 6-digit OTP');
      return;
    }
    const result = await auth.verifyOtp(otpValue);
    if (result.success) {
      setPatientInfo(prev => ({ ...prev, phone: editPhone }));
      localStorage.setItem('guestMobile', editPhone);
      setPhoneVerified(true);
      setIsEditingPhone(false);
      setOtp(['', '', '', '', '', '']);
      toast.success('Phone number verified!');
    } else {
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    }
  };

  // Send OTP using unified auth (for unverified users)
  const sendOtp = async () => {
    if (!patientInfo.phone || patientInfo.phone.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    const result = await auth.sendOtp(patientInfo.phone, 'pharmacy_order');
    if (result.success) {
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  };

  // Verify OTP using unified auth
  const verifyOtp = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      toast.error('Please enter complete 6-digit OTP');
      return;
    }
    const result = await auth.verifyOtp(otpValue);
    if (result.success) {
      // Save patient info to localStorage for future auto-fill
      localStorage.setItem('patientName', patientInfo.name);
      localStorage.setItem('guestMobile', patientInfo.phone);
      if (patientInfo.email) localStorage.setItem('patientEmail', patientInfo.email);
      // Move to address step
      setCurrentStep(STEPS.ADDRESS);
    } else {
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    }
  };

  // OTP input handlers
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  // Save new address via API
  const saveNewAddress = async () => {
    if (!newAddress.line1.trim() || !newAddress.pincode.trim()) {
      toast.error('Please fill in address and pincode');
      return;
    }
    const fullAddr = `${newAddress.line1}${newAddress.line2 ? ', ' + newAddress.line2 : ''}${newAddress.landmark ? ', Near ' + newAddress.landmark : ''}, ${newAddress.city} - ${newAddress.pincode}`;
    try {
      const res = await axios.post(`${API}/addresses?phone=${patientInfo.phone}`, {
        label: newAddress.label,
        full_address: fullAddr,
        landmark: newAddress.landmark,
        pincode: newAddress.pincode,
        city: newAddress.city,
        state: '',
        is_default: savedAddresses.length === 0,
      });
      const saved = { ...res.data.address, fullAddress: res.data.address.full_address };
      setSavedAddresses(prev => [...prev, saved]);
      setSelectedAddressId(saved.id);
      setShowNewAddressForm(false);
      setNewAddress({ label: 'home', line1: '', line2: '', landmark: '', city: 'Chhindwara', pincode: '' });
      toast.success('Address saved!');
    } catch {
      toast.error('Failed to save address');
    }
  };

  // Delete address via API
  const deleteAddress = async (id) => {
    try {
      await axios.delete(`${API}/addresses/${id}`);
      setSavedAddresses(prev => prev.filter(a => a.id !== id));
      if (selectedAddressId === id) setSelectedAddressId(null);
      toast.success('Address removed');
    } catch {
      toast.error('Failed to remove address');
    }
  };

  // Proceed to next step
  const proceedToPayment = () => {
    if (!selectedAddressId && savedAddresses.length > 0) {
      toast.error('Please select a delivery address');
      return;
    }
    if (savedAddresses.length === 0) {
      toast.error('Please add a delivery address');
      return;
    }
    setCurrentStep(STEPS.PAYMENT);
  };

  // CuraPay transition state
  const [showCuraPay, setShowCuraPay] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState(null);
  const pendingRedirectRef = useRef(null);

  // Place order
  const placeOrder = async () => {
    const cleanPhone = (patientInfo.phone || '').replace(/\D/g, '').slice(-10);
    if (cleanPhone.length < 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    if (!patientInfo.name?.trim()) {
      toast.error('Please enter your name');
      return;
    }

    try {
      const selectedAddress = savedAddresses.find(a => a.id === selectedAddressId);
      
      const orderData = {
        medicines: pharmacyCart.map(m => ({
          name: m.name,
          quantity: m.quantity,
          mrp: Math.round(m.mrp || m.price || 0),
          price: Math.round(m.price || m.mrp || 0),
        })),
        patient_name: patientInfo.name.trim(),
        patient_phone: cleanPhone,
        patient_email: patientInfo.email || null,
        delivery_address: selectedAddress?.fullAddress || '',
        payment_method: 'cashfree',
        payment_status: 'pending',
        subtotal: itemsTotal,
        discount: totalDiscount,
        delivery_charge: deliveryCharge,
        total_amount: total,
      };

      const response = await axios.post(`${API}/pharmacy`, orderData);
      const orderId = response.data?.order_id || response.data?.id || Date.now().toString().slice(-6);

      const payRes = await fetch(`${API}/payments/cashfree/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: `PHARM_${cleanPhone}_${Date.now()}`,
          customer_name: patientInfo.name.trim() || 'Patient',
          customer_email: patientInfo.email || `${cleanPhone}@nevikacura.com`,
          customer_phone: cleanPhone,
          amount: total,
          product_type: 'pharmacy',
          product_id: orderId,
          return_url: `${window.location.origin}/payment-success?order_id=${orderId}&type=pharmacy`
        })
      });
      
      if (!payRes.ok) {
        const errData = await payRes.json().catch(() => ({}));
        throw new Error(errData.detail || `Payment gateway error (${payRes.status})`);
      }
      
      const payData = await payRes.json();
      
      if (payData.payment_session_id) {
        const url = `/checkout?session=${payData.payment_session_id}&order=${payData.order_id || orderId}&amount=${total}&type=pharmacy`;
        setPendingRedirect(url);
        pendingRedirectRef.current = url;
        // Show CuraPay transition AFTER API success so redirect URL is ready
        setShowCuraPay(true);
      } else {
        throw new Error('No payment session received');
      }
    } catch (error) {
      setShowCuraPay(false);
      console.error('Order error:', error);
      toast.error(error.response?.data?.detail || error.message || 'Payment setup failed. Please try again.');
    }
  };

  const handleCuraPayComplete = () => {
    const url = pendingRedirectRef.current;
    if (url) {
      // Track purchased items for "Buy it Again"
      try {
        const { trackPurchasedItems } = require('@/components/BuyItAgain');
        trackPurchasedItems(pharmacyCart);
      } catch {}
      clearPharmacyCart();
      navigate(url);
    }
  };

  if (showBookingConfirmation && orderDetails) {
    return (
      <BookingConfirmation
        type="pharmacy"
        paymentMethod={paymentMethod}
        collectionMode="delivery"
        orderDetails={orderDetails}
      />
    );
  }

  // Empty cart check — skip if CuraPay animation is active or booking confirmed
  if (pharmacyCart.length === 0 && !showCuraPay && !showBookingConfirmation && !orderDetails) {
    return (
      <div className="dark-page min-h-screen" style={{ background: THEME.bg }}>
        <header className="bg-[#EA580C] text-white p-4 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <button onClick={() => navigate('/pharmacy')} className="p-2 hover:bg-white/20 rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <Package className="w-6 h-6" />
            <h1 className="text-lg font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>Orange Medcare</h1>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6" style={{ background: '#EA580C20' }}>
            <Package className="w-12 h-12" style={{ color: THEME.accent }} />
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: 'Outfit, sans-serif', color: THEME.text }}>Your cart is empty</h2>
          <p className="mb-6" style={{ color: THEME.textSecondary }}>Add medicines to proceed with checkout</p>
          <Button onClick={() => navigate('/pharmacy')} className="bg-[#EA580C] hover:bg-[#DC4B06]" data-testid="browse-pharmacy-btn">
            Browse Pharmacy
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: THEME.bg }}>
      {/* Header */}
      <header className="bg-[#EA580C] text-white p-4 sticky top-0 z-20 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => currentStep === STEPS.CART ? navigate('/cart') : setCurrentStep(currentStep - 1)}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            data-testid="checkout-back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Package className="w-6 h-6" />
          <h1 className="text-lg font-semibold" style={{ fontFamily: 'Outfit, sans-serif' }}>Checkout</h1>
        </div>
      </header>

      {/* Step Progress */}
      <div className="border-b py-4 px-4 sticky top-[60px] z-10" style={{ background: THEME.card, borderColor: THEME.border }}>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            {[
              { step: STEPS.CART, label: 'Cart', icon: Package },
              { step: STEPS.ADDRESS, label: 'Address', icon: MapPin },
              { step: STEPS.PAYMENT, label: 'Payment', icon: CreditCard }
            ].map((item, idx) => (
              <React.Fragment key={item.step}>
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    currentStep >= item.step
                      ? 'bg-[#EA580C] text-white'
                      : ''
                  }`} style={currentStep < item.step ? { background: THEME.cardHover, color: THEME.textMuted } : {}}>
                    {currentStep > item.step ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <item.icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className={`text-xs mt-1 font-medium ${
                    currentStep >= item.step ? 'text-[#EA580C]' : ''
                  }`} style={currentStep < item.step ? { color: THEME.textMuted } : { fontFamily: 'DM Sans, sans-serif' }}>
                    {item.label}
                  </span>
                </div>
                {idx < 2 && (
                  <div className={`flex-1 h-1 mx-2 rounded-full transition-all ${
                    currentStep > item.step ? 'bg-[#EA580C]' : ''
                  }`} style={currentStep <= item.step ? { background: THEME.border } : {}} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto p-4 pb-32">
        {/* STEP 1: Cart & OTP Verification */}
        {currentStep === STEPS.CART && (
          <div className="space-y-4">
            {/* Your Details — Name prominent + Phone auto-filled */}
            <Card className="p-5 rounded-xl border-0" style={{ background: THEME.card }}>
              <h2 className="font-semibold mb-4 flex items-center gap-2 text-base" style={{ fontFamily: 'Outfit, sans-serif', color: THEME.text }}>
                <User className="w-5 h-5 text-[#EA580C]" />
                Your Details
              </h2>
              <div className="space-y-4">
                {/* Name — large and prominent */}
                <div>
                  <Label className="text-zinc-400 text-xs font-medium mb-1.5 block">Full Name *</Label>
                  <Input
                    ref={nameInputRef}
                    value={patientInfo.name}
                    onChange={(e) => {
                      setPatientInfo(prev => ({ ...prev, name: e.target.value }));
                      localStorage.setItem('patientName', e.target.value);
                    }}
                    placeholder="Enter your full name"
                    className="h-12 rounded-lg border-2 text-base font-medium focus:border-[#EA580C] focus:ring-1 focus:ring-[#EA580C]"
                    style={{ backgroundColor: '#1A1A2E', borderColor: '#333', color: '#FFFFFF' }}
                    autoFocus
                    data-testid="patient-name-input"
                  />
                </div>

                {/* Phone — auto-filled with edit option */}
                <div>
                  <Label className="text-zinc-400 text-xs font-medium mb-1.5 block">Mobile Number {isEmailAuth ? '(for contact)' : ''}</Label>
                  {isEmailAuth && !patientInfo.phone ? (
                    <div className="space-y-2">
                      <Input
                        value={patientInfo.phone}
                        onChange={(e) => setPatientInfo(prev => ({ ...prev, phone: e.target.value.replace(/[^\d+]/g, '').slice(0, 15) }))}
                        placeholder="e.g. +14161234567 or 9876543210"
                        className="h-12 rounded-lg border-2 text-base font-medium"
                        style={{ backgroundColor: '#1A1A2E', borderColor: '#333', color: '#FFFFFF' }}
                        data-testid="contact-phone-input"
                      />
                      <p className="text-[10px] text-zinc-500">International numbers accepted. No OTP required.</p>
                    </div>
                  ) : isEmailAuth && patientInfo.phone ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-12 rounded-lg border flex items-center px-3 gap-2"
                        style={{ backgroundColor: '#1A1A2E', borderColor: '#333' }}>
                        <span className="text-white font-medium">{patientInfo.phone}</span>
                      </div>
                      <span className="flex items-center gap-1 text-blue-400 text-xs whitespace-nowrap px-2 py-1 rounded-full bg-blue-900/30 border border-blue-800/50">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Contact
                      </span>
                      <button onClick={() => setPatientInfo(prev => ({ ...prev, phone: '' }))} className="text-[#EA580C] text-xs font-semibold px-3 py-2 rounded-lg hover:bg-[#EA580C]/10 transition-colors whitespace-nowrap" data-testid="edit-contact-phone-btn">Change</button>
                    </div>
                  ) : !isEditingPhone ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-12 rounded-lg border flex items-center px-3 gap-2"
                        style={{ backgroundColor: '#1A1A2E', borderColor: '#333' }}>
                        <span className="text-zinc-500 font-medium text-sm">+91</span>
                        <span className="text-white font-medium">{patientInfo.phone || '—'}</span>
                      </div>
                      {phoneVerified && (
                        <span className="flex items-center gap-1 text-green-400 text-xs whitespace-nowrap px-2 py-1 rounded-full bg-green-900/30 border border-green-800/50">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                        </span>
                      )}
                      <button
                        onClick={() => { setIsEditingPhone(true); setEditPhone(patientInfo.phone); auth.reset?.(); }}
                        className="text-[#EA580C] text-xs font-semibold px-3 py-2 rounded-lg hover:bg-[#EA580C]/10 transition-colors whitespace-nowrap"
                        data-testid="edit-phone-btn"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 p-3 rounded-lg border border-[#EA580C]/30 bg-[#EA580C]/5">
                      <div className="flex gap-2">
                        <div className="px-3 h-11 bg-[#1A1A2E] rounded-lg flex items-center text-zinc-500 text-sm font-medium border border-[#333]">+91</div>
                        <Input
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="New number"
                          className="flex-1 h-11 rounded-lg border text-sm"
                          style={{ backgroundColor: '#1A1A2E', borderColor: '#333', color: '#FFFFFF' }}
                          autoFocus
                          data-testid="edit-phone-input"
                        />
                      </div>
                      {!auth.otpSent ? (
                        <div className="flex gap-2">
                          <Button
                            onClick={sendPhoneChangeOtp}
                            disabled={auth.loading || editPhone.length < 10}
                            className="flex-1 h-10 bg-[#EA580C] hover:bg-[#DC4B06] rounded-lg text-sm font-semibold"
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
                            {otp.map((digit, idx) => (
                              <Input
                                key={idx}
                                ref={(el) => (otpRefs.current[idx] = el)}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleOtpChange(idx, e.target.value)}
                                onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                                className="w-10 h-11 text-center text-base font-bold rounded-lg border-2"
                                style={{ backgroundColor: '#1A1A2E', borderColor: '#444', color: '#FFFFFF' }}
                                data-testid={`phone-otp-${idx}`}
                              />
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={verifyPhoneChangeOtp}
                              disabled={otp.join('').length !== 6 || auth.loading}
                              className="flex-1 h-10 bg-[#EA580C] hover:bg-[#DC4B06] rounded-lg text-sm font-semibold"
                              data-testid="verify-phone-otp-btn"
                            >
                              {auth.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => { setIsEditingPhone(false); auth.reset?.(); setOtp(['','','','','','']); }}
                              className="h-10 rounded-lg text-sm border-zinc-600 text-zinc-300"
                            >
                              Cancel
                            </Button>
                          </div>
                          <p className="text-center text-xs">
                            {auth.resendTimer > 0 ? (
                              <span className="text-zinc-500">Resend in {auth.resendTimer}s</span>
                            ) : (
                              <button onClick={sendPhoneChangeOtp} disabled={auth.loading} className="text-[#EA580C] font-medium">Resend OTP</button>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Email (optional, collapsed) */}
                {!isEditingPhone && (
                  <div>
                    <Label className="text-zinc-400 text-xs font-medium mb-1.5 block">Email (Optional)</Label>
                    <Input
                      type="email"
                      value={patientInfo.email}
                      onChange={(e) => {
                        setPatientInfo(prev => ({ ...prev, email: e.target.value }));
                        localStorage.setItem('patientEmail', e.target.value);
                      }}
                      placeholder="your@email.com"
                      className="h-11 rounded-lg border text-sm"
                      style={{ backgroundColor: '#1A1A2E', borderColor: '#333', color: '#FFFFFF' }}
                      data-testid="patient-email-input"
                    />
                  </div>
                )}
              </div>
            </Card>

            {/* Order Items */}
            <Card className="p-4 rounded-xl border-0" style={{ background: THEME.card }}>
              <h2 className="font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif', color: THEME.text }}>
                <Package className="w-5 h-5 text-[#EA580C]" />
                Your Items ({pharmacyCart.length})
              </h2>
              <div className="space-y-3">
                {pharmacyCart.map((item, idx) => {
                  const mrp = item.mrp || item.price || 0;
                  const salePrice = item.price || mrp;
                  const hasDiscount = item.discount_percent > 0 && mrp > salePrice;
                  return (
                  <div key={idx} className="flex items-center gap-3 py-3 last:border-0" style={{ borderBottom: `1px solid ${THEME.border}` }} data-testid={`checkout-item-${idx}`}>
                    <div className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#EA580C20' }}>
                      {item.image ? (
                        <img src={item.image} alt="" className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Package className="w-7 h-7" style={{ color: THEME.accent }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm" style={{ fontFamily: 'DM Sans, sans-serif', color: THEME.text }}>{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {hasDiscount ? (
                          <>
                            <span className="text-xs font-bold" style={{ color: '#EA580C' }}>₹{salePrice.toFixed(0)}</span>
                            <span className="text-[10px] line-through" style={{ color: THEME.textMuted }}>₹{mrp.toFixed(0)}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#EA580C20', color: '#EA580C' }}>
                              {item.discount_percent}% off
                            </span>
                          </>
                        ) : (
                          <span className="text-xs" style={{ color: THEME.textSecondary }}>₹{salePrice.toFixed(0)} each</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <button
                          onClick={() => item.quantity <= 1 ? removeFromPharmacyCart(item.name) : updatePharmacyQuantity(item.name, item.quantity - 1)}
                          className="w-7 h-7 rounded-md flex items-center justify-center transition-colors text-sm font-bold"
                          style={{ background: THEME.cardHover, color: THEME.text }}
                          data-testid={`checkout-dec-${idx}`}
                        >-</button>
                        <span className="w-8 text-center text-sm font-bold" style={{ color: THEME.text }}>{item.quantity}</span>
                        <button
                          onClick={() => updatePharmacyQuantity(item.name, item.quantity + 1)}
                          className="w-7 h-7 rounded-md flex items-center justify-center transition-colors text-sm font-bold"
                          style={{ background: THEME.cardHover, color: THEME.text }}
                          data-testid={`checkout-inc-${idx}`}
                        >+</button>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="font-bold text-sm block" style={{ color: THEME.text }}>₹{(salePrice * item.quantity).toFixed(0)}</span>
                      {item.quantity > 1 && (
                        <span className="text-[10px]" style={{ color: THEME.textMuted }}>({item.quantity} × ₹{salePrice.toFixed(0)})</span>
                      )}
                    </div>
                    <button
                      onClick={() => removeFromPharmacyCart(item.name)}
                      className="p-2 text-red-400 hover:text-red-500 transition-colors"
                      data-testid={`checkout-remove-${idx}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  );
                })}
              </div>
            </Card>

            {/* Price Breakdown Card */}
            <Card className="p-4 rounded-xl border-0" style={{ background: THEME.card }}>
              <h2 className="font-semibold mb-3 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif', color: THEME.text }}>
                <CreditCard className="w-5 h-5 text-[#EA580C]" />
                Price Details
              </h2>
              <div className="space-y-2.5">
                <div className="flex justify-between">
                  <span style={{ color: THEME.textSecondary }}>MRP Total ({pharmacyCart.reduce((s, i) => s + i.quantity, 0)} items)</span>
                  <span style={{ color: THEME.text }}>₹{subtotal.toFixed(0)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-green-400">Item Discount</span>
                    <span className="text-green-400 font-semibold">- ₹{totalDiscount.toFixed(0)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span style={{ color: THEME.textSecondary }}>Delivery</span>
                  {deliveryCharge === 0 ? (
                    <span className="text-green-400 font-semibold">FREE</span>
                  ) : (
                    <span style={{ color: THEME.text }}>₹{deliveryCharge}</span>
                  )}
                </div>
                {deliveryCharge > 0 && (
                  <div className="p-2 rounded-lg text-[11px] text-center" style={{ background: '#EA580C15', color: '#EA580C' }}>
                    Add ₹{(1000 - itemsTotal).toFixed(0)} more for free delivery
                  </div>
                )}
                <div className="border-t pt-2.5 flex justify-between" style={{ borderColor: THEME.border }}>
                  <span className="font-bold" style={{ color: THEME.text }}>Total Amount</span>
                  <span className="font-bold text-lg" style={{ color: '#EA580C' }}>₹{total.toFixed(0)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="p-2 rounded-lg text-xs text-center font-semibold" style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E' }}>
                    You save ₹{totalDiscount.toFixed(0)} on this order
                  </div>
                )}
              </div>
            </Card>

          </div>
        )}

        {/* STEP 2: Address Selection */}
        {currentStep === STEPS.ADDRESS && (
          <div className="space-y-4">
            <Card className="p-4 rounded-xl border-0" style={{ background: THEME.card }}>
              <h2 className="font-semibold text-white mb-4 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                <MapPin className="w-5 h-5 text-[#EA580C]" />
                Select Delivery Address
              </h2>

              {/* Saved Addresses */}
              {savedAddresses.length > 0 && (
                <div className="space-y-3 mb-4">
                  {savedAddresses.map((address) => (
                    <div
                      key={address.id}
                      onClick={() => setSelectedAddressId(address.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedAddressId === address.id
                          ? 'border-[#EA580C] bg-orange-900/20'
                          : 'border-[#404040] hover:border-orange-600 bg-[#2A2A2A]'
                      }`}
                      data-testid={`address-${address.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            address.label === 'home' ? 'bg-blue-900/50' : 'bg-purple-900/50'
                          }`}>
                            {address.label === 'home' ? (
                              <Home className="w-5 h-5 text-blue-400" />
                            ) : (
                              <Building2 className="w-5 h-5 text-purple-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-white capitalize">{address.label}</p>
                            <p className="text-sm text-gray-400 mt-0.5">{address.fullAddress}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedAddressId === address.id && (
                            <CheckCircle2 className="w-5 h-5 text-[#EA580C]" />
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteAddress(address.id); }}
                            className="p-1.5 text-gray-500 hover:text-red-400"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Address */}
              {!showNewAddressForm ? (
                <button
                  onClick={() => setShowNewAddressForm(true)}
                  className="w-full py-3 border-2 border-dashed border-[#404040] rounded-xl text-gray-400 hover:border-[#EA580C] hover:text-[#EA580C] transition-colors flex items-center justify-center gap-2"
                  data-testid="add-new-address-btn"
                >
                  <Plus className="w-5 h-5" />
                  Add New Address
                </button>
              ) : (
                <div className="p-4 bg-[#2A2A2A] rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-white">New Address</h3>
                    <button onClick={() => setShowNewAddressForm(false)} className="text-gray-500 hover:text-gray-300">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {/* Address Type */}
                  <div className="flex gap-3">
                    {['home', 'work', 'other'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setNewAddress({ ...newAddress, label: type })}
                        className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-all ${
                          newAddress.label === type
                            ? 'bg-[#EA580C] text-white'
                            : 'bg-[#1A1A1A] border border-[#404040] text-gray-400 hover:border-[#EA580C]'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  <div>
                    <Label className="text-gray-300 mb-1.5 block">Address Line 1 *</Label>
                    <Input
                      value={newAddress.line1}
                      onChange={(e) => setNewAddress({ ...newAddress, line1: e.target.value })}
                      placeholder="House no, Building, Street"
                      className="h-12 rounded-lg bg-[#1A1A1A] border-[#404040] text-white placeholder:text-gray-500"
                      data-testid="address-line1-input"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300 mb-1.5 block">Address Line 2</Label>
                    <Input
                      value={newAddress.line2}
                      onChange={(e) => setNewAddress({ ...newAddress, line2: e.target.value })}
                      placeholder="Area, Colony"
                      className="h-12 rounded-lg bg-[#1A1A1A] border-[#404040] text-white placeholder:text-gray-500"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300 mb-1.5 block">Landmark</Label>
                    <Input
                      value={newAddress.landmark}
                      onChange={(e) => setNewAddress({ ...newAddress, landmark: e.target.value })}
                      placeholder="Near..."
                      className="h-12 rounded-lg bg-[#1A1A1A] border-[#404040] text-white placeholder:text-gray-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300 mb-1.5 block">City</Label>
                      <Input
                        value={newAddress.city}
                        onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                        className="h-12 rounded-lg bg-[#1A1A1A] border-[#404040] text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300 mb-1.5 block">Pincode *</Label>
                      <Input
                        value={newAddress.pincode}
                        onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                        placeholder="480001"
                        className="h-12 rounded-lg bg-[#1A1A1A] border-[#404040] text-white placeholder:text-gray-500"
                        data-testid="address-pincode-input"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={saveNewAddress}
                    className="w-full h-12 bg-[#EA580C] hover:bg-[#DC4B06] rounded-lg font-semibold"
                    data-testid="save-address-btn"
                  >
                    Save Address
                  </Button>
                </div>
              )}
            </Card>

            {/* Delivery Info */}
            <Card className="p-4 rounded-xl border-0" style={{ background: THEME.card }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-900/30 rounded-full flex items-center justify-center">
                  <Truck className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-white">Same Day Delivery</p>
                  <p className="text-sm text-gray-400">Order before 6 PM for delivery today</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* STEP 3: Payment */}
        {currentStep === STEPS.PAYMENT && (
          <div className="space-y-4">
            <Card className="p-4 rounded-xl border-0" style={{ background: THEME.card }}>
              <h2 className="font-semibold text-white mb-4 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                <CreditCard className="w-5 h-5 text-[#EA580C]" />
                Select Payment Method
              </h2>

              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                {/* Pay with Cura Wallet */}
                {walletBalance > 0 && (
                  <Label
                    htmlFor="wallet_pay"
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      paymentMethod === 'wallet_pay' ? 'border-[#EA580C] bg-orange-900/20' : 'border-[#404040] hover:border-orange-600 bg-[#2A2A2A]'
                    }`}
                  >
                    <RadioGroupItem value="wallet_pay" id="wallet_pay" className="text-[#EA580C]" />
                    <div className="w-12 h-12 bg-teal-900/30 rounded-full flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-teal-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">Cura Wallet</p>
                      <p className="text-sm text-gray-400">Balance: {'\u20B9'}{walletBalance.toFixed(2)}</p>
                    </div>
                    {walletBalance >= total && (
                      <span className="px-2 py-1 bg-teal-900/50 text-teal-300 text-xs font-medium rounded-full">Instant</span>
                    )}
                  </Label>
                )}

                {/* Saved Payment Methods */}
                {savedPaymentMethods.map((pm, i) => (
                  <Label
                    key={pm.id}
                    htmlFor={`saved_${pm.id}`}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      paymentMethod === `saved_${pm.id}` ? 'border-[#EA580C] bg-orange-900/20' : 'border-[#404040] hover:border-orange-600 bg-[#2A2A2A]'
                    }`}
                  >
                    <RadioGroupItem value={`saved_${pm.id}`} id={`saved_${pm.id}`} className="text-[#EA580C]" />
                    <div className="w-12 h-12 bg-indigo-900/30 rounded-full flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">{pm.type === 'upi' ? 'UPI' : pm.details?.network || 'Card'}</p>
                      <p className="text-sm text-gray-400">{pm.type === 'upi' ? (pm.details?.upi_id || 'UPI') : `****${pm.details?.last4 || '••••'}`}</p>
                    </div>
                    {pm.is_default && <span className="px-2 py-1 bg-blue-900/50 text-blue-300 text-xs font-medium rounded-full">Default</span>}
                  </Label>
                ))}

                {/* Pay Later - Default & Recommended */}
                <Label
                  htmlFor="pay_later"
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'pay_later' ? 'border-[#EA580C] bg-orange-900/20' : 'border-[#404040] hover:border-orange-600 bg-[#2A2A2A]'
                  }`}
                >
                  <RadioGroupItem value="pay_later" id="pay_later" className="text-[#EA580C]" />
                  <div className="w-12 h-12 bg-blue-900/30 rounded-full flex items-center justify-center">
                    <Clock className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">Pay Later</p>
                    <p className="text-sm text-gray-400">Receive payment link on WhatsApp</p>
                  </div>
                  <span className="px-2 py-1 bg-green-900/50 text-green-300 text-xs font-medium rounded-full">Recommended</span>
                </Label>
                
                {/* Pay Later Note */}
                {paymentMethod === 'pay_later' && (
                  <div className="flex items-start gap-3 p-3 bg-amber-900/20 border border-amber-500/30 rounded-xl mt-2">
                    <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-200">
                      <span className="font-medium">Note:</span> Payment must be completed before your order is dispatched. You'll receive a payment link on WhatsApp within 30 minutes.
                    </p>
                  </div>
                )}

                {/* Pay Now */}
                <Label
                  htmlFor="pay_now"
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'pay_now' ? 'border-[#EA580C] bg-orange-900/20' : 'border-[#404040] hover:border-orange-600 bg-[#2A2A2A]'
                  }`}
                >
                  <RadioGroupItem value="pay_now" id="pay_now" className="text-[#EA580C]" />
                  <div className="w-12 h-12 bg-purple-900/30 rounded-full flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-white">Pay Now (UPI / Card)</p>
                    <p className="text-sm text-gray-400">Instant payment via Cashfree</p>
                  </div>
                </Label>
              </RadioGroup>
            </Card>

            {/* Security Badge */}
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>Secure payment powered by Cashfree</span>
            </div>

            {/* Order Summary on Payment Step */}
            <Card className="p-4 rounded-xl border-0" style={{ background: THEME.card }}>
              <h2 className="font-semibold mb-3 text-sm" style={{ fontFamily: 'Outfit, sans-serif', color: THEME.textSecondary }}>
                Order Summary
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span style={{ color: THEME.textSecondary }}>Items ({pharmacyCart.reduce((s, i) => s + i.quantity, 0)})</span>
                  <span style={{ color: THEME.text }}>₹{subtotal.toFixed(0)}</span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-green-400">Discount</span>
                    <span className="text-green-400">- ₹{totalDiscount.toFixed(0)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span style={{ color: THEME.textSecondary }}>Delivery</span>
                  <span style={{ color: deliveryCharge === 0 ? '#22C55E' : THEME.text }}>{deliveryCharge === 0 ? 'FREE' : `₹${deliveryCharge}`}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold" style={{ borderColor: THEME.border }}>
                  <span style={{ color: THEME.text }}>Total</span>
                  <span style={{ color: '#EA580C' }}>₹{total.toFixed(0)}</span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* Sticky Bottom Bar - Dark theme */}
      <div className="fixed bottom-0 left-0 right-0 p-4 z-20" style={{ background: THEME.bg, borderTop: `1px solid ${THEME.border}` }}>
        <div className="max-w-2xl mx-auto">
          {/* Price Summary */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-gray-400">Total Amount</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  ₹{total.toFixed(0)}
                </p>
                {totalDiscount > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.15)', color: '#22C55E' }}>
                    Save ₹{totalDiscount.toFixed(0)}
                  </span>
                )}
              </div>
              {deliveryCharge === 0 && <p className="text-[10px] text-green-400 font-semibold">Free delivery included</p>}
            </div>
            
            {/* Action Button */}
            {currentStep === STEPS.CART && (
              <Button
                onClick={() => {
                  if (!patientInfo.name.trim()) {
                    toast.error('Please enter your name');
                    nameInputRef.current?.focus();
                    return;
                  }
                  if (!phoneVerified && !isEmailAuth) {
                    toast.error('Please verify your phone number');
                    return;
                  }
                  if (isEmailAuth && !patientInfo.phone) {
                    toast.error('Please enter a contact phone number');
                    return;
                  }
                  if (isEditingPhone) {
                    toast.error('Please complete phone verification first');
                    return;
                  }
                  localStorage.setItem('patientName', patientInfo.name);
                  setCurrentStep(STEPS.ADDRESS);
                }}
                disabled={isEditingPhone}
                className="h-12 px-8 bg-[#EA580C] hover:bg-[#DC4B06] rounded-lg font-semibold disabled:bg-gray-300"
                data-testid="proceed-to-address-btn"
              >
                Continue
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            )}
            
            {currentStep === STEPS.ADDRESS && (
              <Button
                onClick={proceedToPayment}
                disabled={!selectedAddressId}
                className="h-12 px-8 bg-[#EA580C] hover:bg-[#DC4B06] rounded-lg font-semibold disabled:bg-gray-300"
                data-testid="proceed-to-payment-btn"
              >
                Continue
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            )}
            
            {currentStep === STEPS.PAYMENT && (
              <Button
                onClick={placeOrder}
                disabled={loading}
                className="h-12 px-8 bg-[#EA580C] hover:bg-[#DC4B06] rounded-lg font-semibold"
                data-testid="place-order-btn"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Processing...</>
                ) : (
                  `Pay ₹${total.toFixed(0)}`
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* CuraPay Transition */}
      <CuraPayTransition visible={showCuraPay} amount={total} onComplete={handleCuraPayComplete} />
    </div>
  );
};

export default PharmacyCheckout;

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { useCart } from '@/context/CartContext';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { FamilyMemberBooking } from '@/components/mango';
import { toast } from 'sonner';
import axios from 'axios';
import CuraPayTransition from '@/components/CuraPayTransition';
import { format, addDays } from 'date-fns';
import {
  ArrowLeft, FlaskConical, MapPin, CreditCard, Banknote, Clock,
  CheckCircle2, Loader2, Plus, Home, Building2, ChevronRight,
  ShieldCheck, Phone, MessageCircle, X, Trash2, Calendar as CalendarIcon,
  User, TestTube, Stethoscope
} from 'lucide-react';
import BookingConfirmation from '@/components/BookingConfirmation';
import InvoiceStatusAnimation from '@/components/InvoiceStatusAnimation';
import FamilyMemberPicker from '@/components/FamilyMemberPicker';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

// Dark Theme Colors for Mango Checkout
const THEME = {
  bg: '#0A0A0A',
  card: '#1A1A1A',
  cardHover: '#222222',
  border: '#333333',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',
  accent: '#C8F56A',
  accentDark: '#A3D944',
};

// Test icon helper
const getTestIcon = (testName) => {
  const lowerName = testName.toLowerCase();
  if (lowerName.includes('cbc') || lowerName.includes('blood')) return '🩸';
  if (lowerName.includes('sugar') || lowerName.includes('glucose') || lowerName.includes('hba1c')) return '🍬';
  if (lowerName.includes('thyroid') || lowerName.includes('tsh')) return '🦋';
  if (lowerName.includes('liver') || lowerName.includes('lft')) return '🫀';
  if (lowerName.includes('kidney') || lowerName.includes('rft')) return '🫘';
  if (lowerName.includes('lipid') || lowerName.includes('cholesterol')) return '🧈';
  if (lowerName.includes('vitamin')) return '💊';
  if (lowerName.includes('urine')) return '🧪';
  if (lowerName.includes('scan') || lowerName.includes('sonography')) return '📷';
  return '🧬';
};

// Checkout Steps
const STEPS = {
  CART: 1,
  DETAILS: 2,
  PAYMENT: 3
};

const MangoCheckout = () => {
  const navigate = useNavigate();
  const {
    labCart,
    removeFromLabCart,
    clearLabCart,
    getLabTotal,
    labMembers,
    getTestMember,
    getMemberById,
    appliedCoupon,
    getCouponDiscount,
    getCoinsDiscount,
    coinsToRedeem,
    pointsToUse,
    loyaltyPoints,
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

  // User info
  const [patientInfo, setPatientInfo] = useState({
    name: localStorage.getItem('patientName') || (isEmailAuth ? emailUserData.name : '') || '',
    phone: localStorage.getItem('guestMobile') || '',
    email: localStorage.getItem('patientEmail') || (isEmailAuth ? emailUserData.email : '') || ''
  });

  // OTP state - Using unified auth
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([]);
  const nameInputRef = useRef(null);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(isGuestVerified || isEmailAuth);

  // Collection details
  const [collectionType, setCollectionType] = useState('home');
  const [selectedDate, setSelectedDate] = useState(addDays(new Date(), 1));
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('08:00-10:00');
  const [showCalendar, setShowCalendar] = useState(false);

  // Address state (for home collection)
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

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState('pay_now');
  
  // Booking confirmation state
  const [showBookingConfirmation, setShowBookingConfirmation] = useState(false);
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);
  const [showFailure, setShowFailure] = useState(false);
  const [failureMessage, setFailureMessage] = useState('');
  const [orderDetails, setOrderDetails] = useState(null);

  // Time slots
  const timeSlots = [
    { value: '08:00-10:00', label: '8:00 AM - 10:00 AM', badge: 'Best for fasting' },
    { value: '10:00-12:00', label: '10:00 AM - 12:00 PM' },
    { value: '12:00-14:00', label: '12:00 PM - 2:00 PM' },
    { value: '14:00-16:00', label: '2:00 PM - 4:00 PM' },
    { value: '16:00-19:00', label: '4:00 PM - 7:00 PM' }
  ];

  // Load saved addresses from API when entering details step
  useEffect(() => {
    if (currentStep === STEPS.DETAILS && patientInfo.phone) {
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

  // No wallet/saved payment methods needed — simplified checkout

  // Calculations - with cart-level coupon/coins/loyalty discounts
  const subtotal = Math.round(getLabTotal());
  const homeCollectionFee = 0; // Free home collection
  
  const couponDiscount = Math.round(getCouponDiscount());
  const coinsDiscount = Math.round(getCoinsDiscount());
  const loyaltyDiscount = pointsToUse > 0 ? Math.round((pointsToUse / 100) * 10) : 0;
  const cartDiscount = Math.min(couponDiscount + coinsDiscount + loyaltyDiscount, subtotal);
  
  const total = Math.max(0, subtotal - cartDiscount + homeCollectionFee);

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

  // Send OTP using unified auth
  const sendOtp = async () => {
    if (!patientInfo.phone || patientInfo.phone.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    const result = await auth.sendOtp(patientInfo.phone, 'lab_booking');
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
      setCurrentStep(STEPS.DETAILS);
    } else {
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    }
  };

  // OTP handlers
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

  // Proceed to payment
  const proceedToPayment = () => {
    if (collectionType === 'home') {
      if (!selectedAddressId && savedAddresses.length > 0) {
        toast.error('Please select a collection address');
        return;
      }
      if (savedAddresses.length === 0) {
        toast.error('Please add a collection address');
        return;
      }
    }
    setCurrentStep(STEPS.PAYMENT);
  };

  // Place order
  // CuraPay transition state
  const [showCuraPay, setShowCuraPay] = useState(false);
  const [pendingRedirect, setPendingRedirect] = useState(null);
  const pendingRedirectRef = useRef(null);

  const placeOrder = async () => {
    try {
      const selectedAddress = savedAddresses.find(a => a.id === selectedAddressId);
      const cleanPhone = (patientInfo.phone || '').replace(/\D/g, '').slice(-10);
      
      // Build family member assignments
      const memberAssignments = labCart.map(t => {
        const memberId = getTestMember(t.name);
        const member = getMemberById(memberId);
        return { test: t.name, member_name: member?.name || patientInfo.name, member_age: member?.age || '' };
      });

      const orderData = {
        tests: labCart.map(t => t.name),
        patient_name: patientInfo.name || 'Patient',
        patient_phone: cleanPhone,
        patient_email: patientInfo.email || null,
        patient_address: collectionType === 'home' ? selectedAddress?.fullAddress : null,
        preferred_date: format(selectedDate, 'yyyy-MM-dd'),
        preferred_time_slot: selectedTimeSlot,
        collection_type: collectionType,
        payment_method: paymentMethod === 'pay_now' ? 'cashfree' : paymentMethod,
        payment_status: paymentMethod === 'cod' || paymentMethod === 'pay_on_collection' ? 'cod' : 'pending',
        subtotal: subtotal,
        coupon_code: appliedCoupon || null,
        coupon_discount: couponDiscount,
        coins_discount: coinsDiscount,
        loyalty_discount: loyaltyDiscount,
        total_amount: total,
        member_assignments: memberAssignments
      };

      if (paymentMethod === 'pay_now') {
        // Create order and payment session BEFORE showing transition
        const response = await axios.post(`${API}/diagnostics`, orderData);
        const orderId = response.data.id || response.data.order_id || `MNG${Date.now()}`;

        const payRes = await fetch(`${API}/payments/cashfree/create-order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_id: `LAB_${cleanPhone}_${Date.now()}`,
            customer_name: patientInfo.name || 'Patient',
            customer_email: patientInfo.email || `${cleanPhone}@nevikacura.com`,
            customer_phone: cleanPhone,
            amount: total,
            product_type: 'lab_test',
            product_id: orderId,
            return_url: `${window.location.origin}/payment-success?order_id=${orderId}&type=mango`
          })
        });
        
        if (!payRes.ok) throw new Error('Payment gateway error');
        const payData = await payRes.json();
        
        if (payData.payment_session_id) {
          const url = `/checkout?session=${payData.payment_session_id}&order=${payData.order_id || orderId}&amount=${total}&type=mango`;
          setPendingRedirect(url);
          pendingRedirectRef.current = url;
          // Show CuraPay transition AFTER API success
          setShowCuraPay(true);
        } else {
          throw new Error('No payment session');
        }
        return;
      }
      
      // COD / Pay on Collection — direct confirmation
      setLoading(true);
      const response = await axios.post(`${API}/diagnostics`, orderData);
      const orderId = response.data.id || response.data.order_id || `MNG${Date.now()}`;
      
      setOrderDetails({
        orderId,
        items: labCart.map(t => t.name),
        date: format(selectedDate, 'dd MMM yyyy'),
        time: selectedTimeSlot,
        address: collectionType === 'home' ? selectedAddress?.fullAddress : 'Visit Lab',
        trackingPath: `/track?phone=${patientInfo.phone}`
      });
      
      clearLabCart();
      setShowBookingConfirmation(true);
    } catch (error) {
      setShowCuraPay(false);
      setFailureMessage(error.response?.data?.detail || error.message || 'Failed to place booking');
      setShowFailure(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCuraPayComplete = () => {
    const url = pendingRedirectRef.current;
    if (url) {
      clearLabCart();
      navigate(url);
    }
  };
  
  // Show booking confirmation
  if (showBookingConfirmation && orderDetails) {
    return (
      <BookingConfirmation
        type="mango"
        collectionMode={collectionType}
        paymentMethod={paymentMethod}
        orderDetails={orderDetails}
      />
    );
  }

  // Empty cart — skip if CuraPay animation is active or booking is confirmed
  if (labCart.length === 0 && !showCuraPay && !showBookingConfirmation && !orderDetails) {
    return (
      <div className="min-h-screen" style={{ background: THEME.bg }}>
        <header className="text-white p-4 sticky top-0 z-10" style={{ background: THEME.accent }}>
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <button onClick={() => navigate('/mango')} className="p-2 hover:bg-white/20 rounded-full text-gray-900">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <FlaskConical className="w-6 h-6 text-gray-900" />
            <h1 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'Outfit, sans-serif' }}>Mango Health Labs</h1>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6" style={{ background: `${THEME.accent}20` }}>
            <FlaskConical className="w-12 h-12" style={{ color: THEME.accent }} />
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: 'Outfit, sans-serif', color: THEME.text }}>No tests selected</h2>
          <p className="mb-6" style={{ color: THEME.textSecondary }}>Add lab tests to proceed with booking</p>
          <Button onClick={() => navigate('/mango')} style={{ background: THEME.accent, color: '#111' }} className="hover:opacity-90" data-testid="browse-tests-btn">
            Browse Lab Tests
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: THEME.bg }}>
      {/* Header */}
      <header className="p-4 sticky top-0 z-20 shadow-lg" style={{ background: THEME.accent }}>
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => currentStep === STEPS.CART ? navigate('/cart') : setCurrentStep(currentStep - 1)}
            className="p-2 hover:bg-white/20 rounded-full transition-colors text-gray-900"
            data-testid="checkout-back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <FlaskConical className="w-6 h-6 text-gray-900" />
          <h1 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'Outfit, sans-serif' }}>Book Tests</h1>
        </div>
      </header>

      {/* Step Progress */}
      <div className="border-b py-4 px-4 sticky top-[60px] z-10" style={{ background: THEME.card, borderColor: THEME.border }}>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            {[
              { step: STEPS.CART, label: 'Tests', icon: FlaskConical },
              { step: STEPS.DETAILS, label: 'Schedule', icon: CalendarIcon },
              { step: STEPS.PAYMENT, label: 'Payment', icon: CreditCard }
            ].map((item, idx) => (
              <React.Fragment key={item.step}>
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    currentStep >= item.step
                      ? 'text-gray-900'
                      : ''
                  }`} style={currentStep >= item.step ? { background: THEME.accent } : { background: THEME.cardHover, color: THEME.textMuted }}>
                    {currentStep > item.step ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <item.icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className={`text-xs mt-1 font-medium`} style={{ fontFamily: 'DM Sans, sans-serif', color: currentStep >= item.step ? THEME.accent : THEME.textMuted }}>
                    {item.label}
                  </span>
                </div>
                {idx < 2 && (
                  <div className={`flex-1 h-1 mx-2 rounded-full transition-all ${
                    currentStep > item.step ? 'bg-[#22C55E]' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto p-4 pb-32">
        {/* STEP 1: Tests & OTP */}
        {currentStep === STEPS.CART && (
          <div className="space-y-4">
            {/* Selected Tests */}
            <Card className="p-4 rounded-xl border border-gray-200">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                <FlaskConical className="w-5 h-5 text-[#22C55E]" />
                Selected Tests ({labCart.length})
              </h2>
              <div className="space-y-3">
                {labCart.map((test, idx) => {
                  const memberId = getTestMember(test.name);
                  const member = getMemberById(memberId);
                  return (
                  <div key={idx} className="py-3 border-b border-gray-100 last:border-0" data-testid={`checkout-test-${idx}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center text-xl">
                        {getTestIcon(test.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800" style={{ fontFamily: 'DM Sans, sans-serif' }}>{test.name}</p>
                        {test.parameters && (
                          <p className="text-xs text-gray-500">{test.parameters} parameters</p>
                        )}
                      </div>
                      {test.price > 0 && (
                        <span className="font-semibold text-[#22C55E]">₹{test.price}</span>
                      )}
                      <button
                        onClick={() => removeFromLabCart(test.name)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    {member?.name && (
                      <div className="mt-1.5 ml-[60px]">
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                          {member.name}{member.age ? `, ${member.age} yrs` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            </Card>

            {/* Family Member Booking */}
            <FamilyMemberBooking variant="light" />

            {/* Patient Details — Name prominent + Phone auto-filled */}
            <Card className="p-5 rounded-xl border border-gray-200">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                <User className="w-5 h-5 text-[#22C55E]" />
                Patient Details
              </h2>
              <div className="space-y-4">
                {/* Family Member Picker */}
                <FamilyMemberPicker
                  phone={localStorage.getItem('userPhone') || ''}
                  onSelect={(member) => {
                    if (member) {
                      setPatientInfo(prev => ({ ...prev, name: member.name, phone: member.phone || prev.phone }));
                    }
                  }}
                  className="mb-2"
                />
                {/* Name — large and prominent */}
                <div>
                  <Label className="text-gray-700 text-xs font-medium mb-1.5 block">Full Name *</Label>
                  <Input
                    ref={nameInputRef}
                    value={patientInfo.name}
                    onChange={(e) => {
                      setPatientInfo(prev => ({ ...prev, name: e.target.value }));
                      localStorage.setItem('patientName', e.target.value);
                    }}
                    placeholder="Enter patient name"
                    className="h-12 rounded-lg border-2 text-base font-medium focus:border-[#22C55E] focus:ring-1 focus:ring-[#22C55E]"
                    autoFocus
                    data-testid="checkout-name-input"
                  />
                </div>

                {/* Phone — auto-filled with edit option */}
                <div>
                  <Label className="text-gray-700 text-xs font-medium mb-1.5 block">Mobile Number {isEmailAuth ? '(for contact)' : ''}</Label>
                  {isEmailAuth && !patientInfo.phone ? (
                    <div className="space-y-2">
                      <Input
                        value={patientInfo.phone}
                        onChange={(e) => setPatientInfo(prev => ({ ...prev, phone: e.target.value.replace(/[^\d+]/g, '').slice(0, 15) }))}
                        placeholder="e.g. +14161234567 or 9876543210"
                        className="h-12 rounded-lg border-2 text-base font-medium bg-gray-50 border-gray-200 text-gray-800"
                        data-testid="contact-phone-input"
                      />
                      <p className="text-[10px] text-gray-400">International numbers accepted. No OTP required.</p>
                    </div>
                  ) : isEmailAuth && patientInfo.phone ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-12 rounded-lg border flex items-center px-3 gap-2 bg-gray-50 border-gray-200">
                        <span className="text-gray-800 font-medium">{patientInfo.phone}</span>
                      </div>
                      <span className="flex items-center gap-1 text-blue-600 text-xs whitespace-nowrap px-2 py-1 rounded-full bg-blue-50 border border-blue-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Contact
                      </span>
                      <button onClick={() => setPatientInfo(prev => ({ ...prev, phone: '' }))} className="text-emerald-600 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-emerald-50 transition-colors whitespace-nowrap" data-testid="edit-contact-phone-btn">Change</button>
                    </div>
                  ) : !isEditingPhone ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-12 rounded-lg border flex items-center px-3 gap-2 bg-gray-50 border-gray-200">
                        <span className="text-gray-500 font-medium text-sm">+91</span>
                        <span className="text-gray-800 font-medium">{patientInfo.phone || '—'}</span>
                      </div>
                      {phoneVerified && (
                        <span className="flex items-center gap-1 text-green-600 text-xs whitespace-nowrap px-2 py-1 rounded-full bg-green-50 border border-green-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                        </span>
                      )}
                      <button
                        onClick={() => { setIsEditingPhone(true); setEditPhone(patientInfo.phone); auth.reset?.(); }}
                        className="text-[#22C55E] text-xs font-semibold px-3 py-2 rounded-lg hover:bg-green-50 transition-colors whitespace-nowrap"
                        data-testid="edit-phone-btn"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 p-3 rounded-lg border border-[#22C55E]/30 bg-green-50/50">
                      <div className="flex gap-2">
                        <div className="px-3 h-11 bg-gray-100 rounded-lg flex items-center text-gray-500 text-sm font-medium border border-gray-200">+91</div>
                        <Input
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="New number"
                          className="flex-1 h-11 rounded-lg border text-sm"
                          autoFocus
                          data-testid="edit-phone-input"
                        />
                      </div>
                      {!auth.otpSent ? (
                        <div className="flex gap-2">
                          <Button
                            onClick={sendPhoneChangeOtp}
                            disabled={auth.loading || editPhone.length < 10}
                            className="flex-1 h-10 bg-[#22C55E] hover:bg-[#16A34A] rounded-lg text-sm font-semibold"
                            data-testid="send-phone-otp-btn"
                          >
                            {auth.loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <MessageCircle className="w-4 h-4 mr-1" />}
                            Verify via WhatsApp
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => { setIsEditingPhone(false); auth.reset?.(); }}
                            className="h-10 rounded-lg text-sm"
                            data-testid="cancel-phone-edit-btn"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-center text-xs text-gray-600">
                            Enter OTP sent to <span className="font-medium text-gray-800">+91 {editPhone}</span>
                          </p>
                          <div className="flex justify-center gap-1.5">
                            {otp.map((digit, idx) => (
                              <Input
                                key={idx}
                                ref={(el) => (otpRefs.current[idx] = el)}
                                type="text" inputMode="numeric" maxLength={1}
                                value={digit}
                                onChange={(e) => handleOtpChange(idx, e.target.value)}
                                onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                                className="w-10 h-11 text-center text-base font-bold rounded-lg border-2 border-gray-200 focus:border-[#22C55E]"
                                data-testid={`phone-otp-${idx}`}
                              />
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={verifyPhoneChangeOtp}
                              disabled={otp.join('').length !== 6 || auth.loading}
                              className="flex-1 h-10 bg-[#22C55E] hover:bg-[#16A34A] rounded-lg text-sm font-semibold"
                              data-testid="verify-phone-otp-btn"
                            >
                              {auth.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                            </Button>
                            <Button variant="outline"
                              onClick={() => { setIsEditingPhone(false); auth.reset?.(); setOtp(['','','','','','']); }}
                              className="h-10 rounded-lg text-sm">
                              Cancel
                            </Button>
                          </div>
                          <p className="text-center text-xs">
                            {auth.resendTimer > 0 ? (
                              <span className="text-gray-500">Resend in {auth.resendTimer}s</span>
                            ) : (
                              <button onClick={sendPhoneChangeOtp} disabled={auth.loading} className="text-[#22C55E] font-medium">Resend OTP</button>
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
                    <Label className="text-gray-700 text-xs font-medium mb-1.5 block">Email (Optional)</Label>
                    <Input
                      type="email"
                      value={patientInfo.email}
                      onChange={(e) => {
                        setPatientInfo(prev => ({ ...prev, email: e.target.value }));
                        localStorage.setItem('patientEmail', e.target.value);
                      }}
                      placeholder="your@email.com"
                      className="h-11 rounded-lg border text-sm"
                      data-testid="checkout-email-input"
                    />
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* STEP 2: Schedule & Address */}
        {currentStep === STEPS.DETAILS && (
          <div className="space-y-4">
            {/* Collection Type */}
            <Card className="p-4 rounded-xl border border-gray-200">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                <Stethoscope className="w-5 h-5 text-[#22C55E]" />
                Sample Collection
              </h2>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setCollectionType('home')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    collectionType === 'home'
                      ? 'border-[#22C55E] bg-green-50'
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                  data-testid="collection-home"
                >
                  <Home className={`w-6 h-6 mb-2 ${collectionType === 'home' ? 'text-[#22C55E]' : 'text-gray-400'}`} />
                  <p className="font-medium text-gray-800">Home Collection</p>
                  <p className="text-xs text-green-600 mt-1">FREE</p>
                </button>
                <button
                  onClick={() => setCollectionType('center')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    collectionType === 'center'
                      ? 'border-[#22C55E] bg-green-50'
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                  data-testid="collection-center"
                >
                  <Building2 className={`w-6 h-6 mb-2 ${collectionType === 'center' ? 'text-[#22C55E]' : 'text-gray-400'}`} />
                  <p className="font-medium text-gray-800">Visit Lab</p>
                  <p className="text-xs text-gray-500 mt-1">NABL Certified</p>
                </button>
              </div>
            </Card>

            {/* Date & Time */}
            <Card className="p-4 rounded-xl border border-gray-200">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                <CalendarIcon className="w-5 h-5 text-[#22C55E]" />
                Preferred Date & Time
              </h2>

              {/* Date Picker */}
              <div className="mb-4">
                <Label className="text-gray-700 mb-2 block">Select Date</Label>
                <button
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="w-full h-12 px-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between hover:bg-gray-100 transition-colors"
                  data-testid="date-picker-btn"
                >
                  <span className="font-medium text-gray-800">{format(selectedDate, 'EEEE, dd MMMM yyyy')}</span>
                  <CalendarIcon className="w-5 h-5 text-gray-400" />
                </button>
                {showCalendar && (
                  <div className="mt-2 border rounded-xl overflow-hidden">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => { setSelectedDate(date); setShowCalendar(false); }}
                      disabled={(date) => date < new Date() || date > addDays(new Date(), 14)}
                      className="rounded-xl"
                    />
                  </div>
                )}
              </div>

              {/* Time Slots */}
              <div>
                <Label className="text-gray-700 mb-2 block">Select Time Slot</Label>
                <div className="space-y-2">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot.value}
                      onClick={() => setSelectedTimeSlot(slot.value)}
                      className={`w-full p-3 rounded-lg border-2 text-left flex items-center justify-between transition-all ${
                        selectedTimeSlot === slot.value
                          ? 'border-[#22C55E] bg-green-50'
                          : 'border-gray-200 hover:border-green-300'
                      }`}
                      data-testid={`time-slot-${slot.value}`}
                    >
                      <span className="font-medium text-gray-800">{slot.label}</span>
                      {slot.badge && (
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                          {slot.badge}
                        </span>
                      )}
                      {selectedTimeSlot === slot.value && (
                        <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Address (for home collection) */}
            {collectionType === 'home' && (
              <Card className="p-4 rounded-xl border border-gray-200">
                <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  <MapPin className="w-5 h-5 text-[#22C55E]" />
                  Collection Address
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
                            ? 'border-[#22C55E] bg-green-50'
                            : 'border-gray-200 hover:border-green-300'
                        }`}
                        data-testid={`address-${address.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              address.label === 'home' ? 'bg-blue-100' : 'bg-purple-100'
                            }`}>
                              {address.label === 'home' ? (
                                <Home className="w-5 h-5 text-blue-600" />
                              ) : (
                                <Building2 className="w-5 h-5 text-purple-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800 capitalize">{address.label}</p>
                              <p className="text-sm text-gray-600 mt-0.5">{address.fullAddress}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedAddressId === address.id && (
                              <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteAddress(address.id); }}
                              className="p-1.5 text-gray-400 hover:text-red-500"
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
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-[#22C55E] hover:text-[#22C55E] transition-colors flex items-center justify-center gap-2"
                    data-testid="add-new-address-btn"
                  >
                    <Plus className="w-5 h-5" />
                    Add New Address
                  </button>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-800">New Address</h3>
                      <button onClick={() => setShowNewAddressForm(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="flex gap-3">
                      {['home', 'work', 'other'].map((type) => (
                        <button
                          key={type}
                          onClick={() => setNewAddress({ ...newAddress, label: type })}
                          className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-all ${
                            newAddress.label === type
                              ? 'bg-[#22C55E] text-white'
                              : 'bg-white border border-gray-200 text-gray-600 hover:border-[#22C55E]'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>

                    <div>
                      <Label className="text-gray-700 mb-1.5 block">Address Line 1 *</Label>
                      <Input
                        value={newAddress.line1}
                        onChange={(e) => setNewAddress({ ...newAddress, line1: e.target.value })}
                        placeholder="House no, Building, Street"
                        className="h-12 rounded-lg"
                        data-testid="address-line1-input"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700 mb-1.5 block">Landmark</Label>
                      <Input
                        value={newAddress.landmark}
                        onChange={(e) => setNewAddress({ ...newAddress, landmark: e.target.value })}
                        placeholder="Near..."
                        className="h-12 rounded-lg"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-700 mb-1.5 block">City</Label>
                        <Input
                          value={newAddress.city}
                          onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                          className="h-12 rounded-lg"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-700 mb-1.5 block">Pincode *</Label>
                        <Input
                          value={newAddress.pincode}
                          onChange={(e) => setNewAddress({ ...newAddress, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                          placeholder="480001"
                          className="h-12 rounded-lg"
                          data-testid="address-pincode-input"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={saveNewAddress}
                      className="w-full h-12 bg-[#22C55E] hover:bg-[#16A34A] rounded-lg font-semibold"
                      data-testid="save-address-btn"
                    >
                      Save Address
                    </Button>
                  </div>
                )}
              </Card>
            )}
          </div>
        )}

        {/* STEP 3: Payment */}
        {currentStep === STEPS.PAYMENT && (
          <div className="space-y-4">
            <Card className="p-4 rounded-xl border border-gray-200">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                <CreditCard className="w-5 h-5 text-[#22C55E]" />
                Select Payment Method
              </h2>

              <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                {/* Pay Now - Online */}
                <Label
                  htmlFor="pay_now"
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'pay_now' ? 'border-[#22C55E] bg-green-50' : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  <RadioGroupItem value="pay_now" id="pay_now" className="text-[#22C55E]" />
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">Pay Online</p>
                    <p className="text-sm text-gray-500">UPI, Cards, Net Banking</p>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Recommended</span>
                </Label>

                {/* COD */}
                <Label
                  htmlFor="cod"
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'cod' ? 'border-[#22C55E] bg-green-50' : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  <RadioGroupItem value="cod" id="cod" className="text-[#22C55E]" />
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Banknote className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">Cash on Collection</p>
                    <p className="text-sm text-gray-500">Pay cash when phlebotomist arrives</p>
                  </div>
                </Label>

                {/* Pay Online on Collection */}
                <Label
                  htmlFor="pay_on_collection"
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    paymentMethod === 'pay_on_collection' ? 'border-[#22C55E] bg-green-50' : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  <RadioGroupItem value="pay_on_collection" id="pay_on_collection" className="text-[#22C55E]" />
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">Pay Online on Collection</p>
                    <p className="text-sm text-gray-500">UPI / Card when phlebotomist visits</p>
                  </div>
                </Label>

                {/* Payment Note for COD/Collection options */}
                {(paymentMethod === 'cod' || paymentMethod === 'pay_on_collection') && (
                  <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mt-2">
                    <Clock className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-emerald-700">
                      <span className="font-medium">Note:</span> Payment to be made at the time of sample collection when our phlebotomist visits.
                    </p>
                  </div>
                )}
              </RadioGroup>
            </Card>

            {/* Booking Summary */}
            <Card className="p-4 rounded-xl border border-gray-200 bg-green-50/50">
              <h3 className="font-medium text-gray-800 mb-3">Booking Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Date</span>
                  <span className="font-medium">{format(selectedDate, 'dd MMM yyyy')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time</span>
                  <span className="font-medium">{timeSlots.find(s => s.value === selectedTimeSlot)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Collection</span>
                  <span className="font-medium capitalize">{collectionType === 'home' ? 'Home Visit' : 'Lab Visit'}</span>
                </div>
              </div>
            </Card>

            {/* Security Badge */}
            <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>NABL Certified Lab • Reports in 6-24 hrs</span>
            </div>
          </div>
        )}
      </main>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-20 shadow-lg">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-gray-500">Total Amount</p>
              <p className="text-2xl font-bold text-gray-800" style={{ fontFamily: 'Outfit, sans-serif' }}>
                {total > 0 ? `₹${total.toFixed(0)}` : 'Price on confirmation'}
              </p>
              {cartDiscount > 0 ? (
                <p className="text-xs text-green-600">You save ₹{cartDiscount.toFixed(0)} {appliedCoupon ? `(${appliedCoupon})` : ''}</p>
              ) : (
                <p className="text-xs text-green-600">Home collection FREE</p>
              )}
            </div>
            
            {/* Action Buttons */}
            {currentStep === STEPS.CART && (
              <Button
                onClick={() => {
                  if (!patientInfo.name.trim()) {
                    toast.error('Please enter patient name');
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
                  setCurrentStep(STEPS.DETAILS);
                }}
                disabled={isEditingPhone}
                className="h-12 px-8 bg-[#22C55E] hover:bg-[#16A34A] rounded-lg font-semibold disabled:bg-gray-300"
                data-testid="proceed-to-schedule-btn"
              >
                Continue
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            )}
            
            {currentStep === STEPS.DETAILS && (
              <Button
                onClick={proceedToPayment}
                disabled={collectionType === 'home' && !selectedAddressId}
                className="h-12 px-8 bg-[#22C55E] hover:bg-[#16A34A] rounded-lg font-semibold disabled:bg-gray-300"
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
                className="h-12 px-8 bg-[#22C55E] hover:bg-[#16A34A] rounded-lg font-semibold"
                data-testid="place-order-btn"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Processing...</>
                ) : paymentMethod === 'pay_now' ? (
                  'Proceed to Pay'
                ) : (
                  'Confirm Booking'
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

export default MangoCheckout;

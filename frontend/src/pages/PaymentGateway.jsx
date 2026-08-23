import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { 
  ArrowLeft, CreditCard, Banknote, Clock, CheckCircle2, 
  Loader2, Shield, ChevronRight, Sparkles, Smartphone,
  QrCode, Building2, Wallet, User, Phone, Package, FlaskConical,
  Camera, X, Eye, EyeOff, Calendar, Lock
} from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

// Design System - Clean Dark Header + White Cards (Based on reference)
const THEME = {
  bg: {
    dark: '#1A1A1A',         // Dark header background
    darkSecondary: '#2A2A2A', // Slightly lighter dark
    white: '#FFFFFF',         // White card background
    lightGray: '#F5F5F5',     // Light gray for inputs
  },
  accent: {
    primary: '#22C55E',       // Green for primary actions
    secondary: '#3B82F6',     // Blue for secondary
    gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
  },
  text: {
    white: '#FFFFFF',
    dark: '#1A1A1A',
    gray: '#6B7280',
    lightGray: '#9CA3AF',
  },
  status: {
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
  }
};

// GradientCard component removed - using clean design without card visualization

// Card Input Form with scanning capability
const CardInputForm = ({ onCardData, onClose }) => {
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [showCvv, setShowCvv] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cardType, setCardType] = useState('unknown');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Detect card type from number
  useEffect(() => {
    const cleanNumber = cardNumber.replace(/\s/g, '');
    if (/^4/.test(cleanNumber)) setCardType('visa');
    else if (/^5[1-5]/.test(cleanNumber) || /^2[2-7]/.test(cleanNumber)) setCardType('mastercard');
    else if (/^3[47]/.test(cleanNumber)) setCardType('amex');
    else if (/^6(?:011|5)/.test(cleanNumber)) setCardType('discover');
    else if (/^(?:2131|1800|35)/.test(cleanNumber)) setCardType('jcb');
    else if (/^60|^65|^81|^82/.test(cleanNumber)) setCardType('rupay');
    else setCardType('unknown');
  }, [cardNumber]);

  // Format card number with spaces
  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : value;
  };

  // Format expiry date
  const formatExpiry = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  // Start camera for card scanning
  const startScanning = async () => {
    try {
      setScanning(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      toast.error('Camera access denied. Please enter card details manually.');
      setScanning(false);
    }
  };

  // Stop camera
  const stopScanning = () => {
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
    setScanning(false);
  };

  // Capture and process card image (simplified OCR simulation)
  const captureCard = () => {
    if (canvasRef.current && videoRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);
      
      // Simulate card detection (in production, use OCR API)
      toast.success('Card captured! Please verify the details.');
      setCardNumber('4242 4242 4242 4242');
      setExpiry('12/28');
      stopScanning();
    }
  };

  // Autofill with test card
  const autofillTestCard = () => {
    setCardNumber('4242 4242 4242 4242');
    setCardName('TEST USER');
    setExpiry('12/28');
    setCvv('123');
    toast.success('Test card details filled');
  };

  const handleSubmit = () => {
    if (cardNumber.replace(/\s/g, '').length < 16) {
      toast.error('Please enter a valid card number');
      return;
    }
    if (!cardName.trim()) {
      toast.error('Please enter cardholder name');
      return;
    }
    if (expiry.length < 5) {
      toast.error('Please enter valid expiry date');
      return;
    }
    if (cvv.length < 3) {
      toast.error('Please enter valid CVV');
      return;
    }

    onCardData({
      number: cardNumber.replace(/\s/g, ''),
      name: cardName,
      expiry,
      cvv,
      type: cardType
    });
  };

  const getCardLogo = () => {
    switch(cardType) {
      case 'visa':
        return <span className="text-blue-500 font-bold italic text-xl">VISA</span>;
      case 'mastercard':
        return (
          <div className="flex -space-x-2">
            <div className="w-5 h-5 rounded-full bg-red-500" />
            <div className="w-5 h-5 rounded-full bg-orange-400" />
          </div>
        );
      case 'rupay':
        return <span className="text-green-500 font-bold text-sm">RuPay</span>;
      default:
        return <CreditCard className="w-6 h-6" style={{ color: THEME.text.muted }} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div 
        className="w-full max-w-lg rounded-t-3xl p-6 animate-slide-up"
        style={{ background: THEME.bg.secondary }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: THEME.accent.gradient }}
            >
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold" style={{ color: THEME.text.primary }}>Add Card</h3>
              <p className="text-xs" style={{ color: THEME.text.muted }}>Enter or scan your card</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl" style={{ background: THEME.bg.card }}>
            <X className="w-5 h-5" style={{ color: THEME.text.primary }} />
          </button>
        </div>

        {/* Camera Scanner */}
        {scanning ? (
          <div className="relative mb-6 rounded-2xl overflow-hidden">
            <video ref={videoRef} className="w-full aspect-[1.6/1] object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 border-2 border-dashed border-white/50 m-4 rounded-xl" />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
              <Button onClick={captureCard} className="bg-white text-gray-900 hover:bg-gray-100">
                <Camera className="w-4 h-4 mr-2" /> Capture
              </Button>
              <Button onClick={stopScanning} variant="outline" className="border-white/30 text-white">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Card Preview */}
            <div 
              className="rounded-2xl p-4 mb-6 relative overflow-hidden"
              style={{ 
                background: THEME.accent.gradient,
                boxShadow: `0 10px 30px ${THEME.accent.glow}`
              }}
            >
              <div className="flex justify-between items-start mb-8">
                <div className="w-10 h-7 rounded bg-gradient-to-br from-yellow-200 to-yellow-400" />
                {getCardLogo()}
              </div>
              <p className="font-mono text-lg tracking-wider text-white/90 mb-4">
                {cardNumber || '•••• •••• •••• ••••'}
              </p>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] text-white/60 uppercase">Cardholder</p>
                  <p className="text-white font-medium text-sm">{cardName || 'YOUR NAME'}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-white/60 uppercase">Expires</p>
                  <p className="text-white font-medium">{expiry || 'MM/YY'}</p>
                </div>
              </div>
            </div>

            {/* Scan Button */}
            <button
              onClick={startScanning}
              className="w-full p-3 rounded-xl mb-4 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
              style={{ background: THEME.bg.card, border: `1px dashed ${THEME.accent.primary}` }}
            >
              <Camera className="w-5 h-5" style={{ color: THEME.accent.secondary }} />
              <span style={{ color: THEME.accent.secondary }}>Scan Card with Camera</span>
            </button>

            {/* Card Input Fields */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: THEME.text.muted }}>
                  Card Number
                </label>
                <div className="relative">
                  <Input
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    className="pl-4 pr-12 h-12 text-lg font-mono border-0"
                    style={{ background: THEME.bg.card, color: THEME.text.primary }}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {getCardLogo()}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: THEME.text.muted }}>
                  Cardholder Name
                </label>
                <Input
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value.toUpperCase())}
                  placeholder="JOHN DOE"
                  className="h-12 border-0 uppercase"
                  style={{ background: THEME.bg.card, color: THEME.text.primary }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: THEME.text.muted }}>
                    Expiry Date
                  </label>
                  <div className="relative">
                    <Input
                      value={expiry}
                      onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      placeholder="MM/YY"
                      maxLength={5}
                      className="h-12 border-0 font-mono"
                      style={{ background: THEME.bg.card, color: THEME.text.primary }}
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: THEME.text.muted }} />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: THEME.text.muted }}>
                    CVV
                  </label>
                  <div className="relative">
                    <Input
                      type={showCvv ? 'text' : 'password'}
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="•••"
                      maxLength={4}
                      className="h-12 border-0 font-mono"
                      style={{ background: THEME.bg.card, color: THEME.text.primary }}
                    />
                    <button 
                      onClick={() => setShowCvv(!showCvv)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showCvv ? (
                        <EyeOff className="w-4 h-4" style={{ color: THEME.text.muted }} />
                      ) : (
                        <Eye className="w-4 h-4" style={{ color: THEME.text.muted }} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Test Card Autofill */}
            <button
              onClick={autofillTestCard}
              className="w-full mt-4 py-2 text-xs"
              style={{ color: THEME.text.muted }}
            >
              Use test card (4242 4242 4242 4242)
            </button>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              className="w-full mt-4 h-14 text-lg font-bold text-white"
              style={{ 
                background: THEME.accent.gradient,
                boxShadow: `0 10px 30px ${THEME.accent.glow}`
              }}
            >
              <Lock className="w-5 h-5 mr-2" />
              Add Card Securely
            </Button>

            <p className="text-center text-xs mt-4" style={{ color: THEME.text.muted }}>
              <Shield className="w-3 h-3 inline mr-1" />
              Your card details are encrypted and secure
            </p>
          </>
        )}
      </div>
    </div>
  );
};

// Payment method card - Clean White Card Design
const PaymentMethodCard = ({ method, selected, onClick, icon: Icon, title, subtitle, badge }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all duration-300 border ${
        selected ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div 
        className={`w-12 h-12 rounded-xl flex items-center justify-center ${
          selected ? 'bg-green-500' : 'bg-gray-100'
        }`}
      >
        <Icon className={`w-5 h-5 ${selected ? 'text-white' : 'text-gray-600'}`} />
      </div>
      
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${selected ? 'text-green-700' : 'text-gray-800'}`}>{title}</span>
          {badge && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              selected ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
            }`}>
              {badge}
            </span>
          )}
        </div>
        <span className="text-sm text-gray-500">{subtitle}</span>
      </div>
      
      <div 
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
          selected ? 'border-green-500 bg-green-500' : 'border-gray-300'
        }`}
      >
        {selected && <CheckCircle2 className="w-3 h-3 text-white" />}
      </div>
    </button>
  );
};

// Transaction item
const TransactionItem = ({ icon: Icon, name, category, amount, type = 'debit' }) => (
  <div 
    className="flex items-center gap-3 p-3 rounded-xl"
    style={{ background: THEME.bg.card }}
  >
    <div 
      className="w-10 h-10 rounded-xl flex items-center justify-center"
      style={{ background: `${THEME.accent.primary}20` }}
    >
      <Icon className="w-5 h-5" style={{ color: THEME.accent.secondary }} />
    </div>
    <div className="flex-1">
      <p className="font-medium text-sm" style={{ color: THEME.text.primary }}>{name}</p>
      <p className="text-xs" style={{ color: THEME.text.muted }}>{category}</p>
    </div>
    <span 
      className="font-bold"
      style={{ color: type === 'credit' ? THEME.status.success : THEME.accent.secondary }}
    >
      {type === 'credit' ? '+' : '-'}₹{amount}
    </span>
  </div>
);

const PaymentGateway = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Get order details from URL params
  const orderType = searchParams.get('type') || 'pharmacy';
  const patientName = searchParams.get('name') || '';
  const patientPhone = searchParams.get('phone') || '';
  const patientEmail = searchParams.get('email') || '';
  const itemsParam = searchParams.get('items') || '';
  const addressParam = searchParams.get('address') || '';
  const collectionType = searchParams.get('collection') || 'home';
  const preferredDate = searchParams.get('date') || '';
  const preferredTime = searchParams.get('time') || '';
  const totalAmount = parseFloat(searchParams.get('amount') || '0');
  
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);
  const [animatingSuccess, setAnimatingSuccess] = useState(false);
  const [showCardInput, setShowCardInput] = useState(false);
  const [savedCard, setSavedCard] = useState(null);

  // Parse items from URL
  const items = itemsParam ? decodeURIComponent(itemsParam).split('||').map(i => i.trim()) : [];
  
  // Service config
  const serviceConfig = orderType === 'pharmacy' 
    ? { 
        icon: Package,
        title: 'Orange Pharmacy',
        color: '#EA580C',
      }
    : { 
        icon: FlaskConical,
        title: 'Mango Health Labs',
        color: '#22C55E',
      };

  // Payment methods
  const paymentMethods = [
    {
      id: 'upi',
      title: 'UPI / QR Code',
      subtitle: 'Pay instantly via Google Pay, PhonePe, Paytm',
      icon: QrCode,
      badge: 'Instant',
    },
    {
      id: 'gpay',
      title: 'Google Pay',
      subtitle: 'One-tap payment with saved cards',
      icon: Smartphone,
      badge: 'Quick',
      isGooglePay: true,
    },
    {
      id: 'card',
      title: 'Credit / Debit Card',
      subtitle: 'Visa, Mastercard, Rupay supported',
      icon: CreditCard,
    },
    {
      id: 'netbanking',
      title: 'Net Banking',
      subtitle: 'All major banks supported',
      icon: Building2,
    },
    {
      id: 'wallet',
      title: 'Digital Wallet',
      subtitle: 'Amazon Pay, Paytm Wallet, MobiKwik',
      icon: Wallet,
    },
    {
      id: 'cod',
      title: 'Cash on Delivery',
      subtitle: orderType === 'pharmacy' ? 'Pay when you receive' : 'Pay at collection',
      icon: Banknote,
    },
    {
      id: 'pay_later',
      title: 'Pay Later',
      subtitle: 'Get payment link on WhatsApp',
      icon: Clock,
      badge: 'Recommended',
    },
  ];

  // Initialize Google Pay via Cashfree
  const initGooglePay = async () => {
    try {
      if (!window.Cashfree) {
        toast.error('Payment SDK not loaded');
        return;
      }
      
      setLoading(true);
      const cleanPhone = patientPhone.replace(/\D/g, '').slice(-10);
      
      // Create order first
      const orderData = orderType === 'pharmacy' 
        ? {
            medicines: items.map(name => ({ name, quantity: 1 })),
            patient_name: patientName,
            patient_phone: cleanPhone,
            payment_method: 'gpay',
            payment_status: 'pending'
          }
        : {
            tests: items,
            patient_name: patientName,
            patient_phone: cleanPhone,
            collection_type: collectionType,
            preferred_date: preferredDate,
            total_amount: totalAmount,
            payment_method: 'gpay',
            payment_status: 'pending'
          };

      const endpoint = orderType === 'pharmacy' ? '/pharmacy' : '/diagnostics';
      const orderResponse = await axios.post(`${API}${endpoint}`, orderData);
      const orderId = orderResponse.data?.id || orderResponse.data?.booking_id;

      // Create Cashfree payment session
      const paymentRes = await fetch(`${API}/payments/cashfree/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: `${orderType.toUpperCase()}_${cleanPhone}_${Date.now()}`,
          customer_name: patientName,
          customer_email: patientEmail || `${cleanPhone}@nevikacura.com`,
          customer_phone: cleanPhone,
          amount: totalAmount || 100,
          product_type: orderType === 'pharmacy' ? 'pharmacy' : 'lab_test',
          product_id: orderId,
          return_url: `${window.location.origin}/payment-success?order_id=${orderId}&type=${orderType === 'pharmacy' ? 'pharmacy' : 'lab_test'}`
        })
      });

      const paymentData = await paymentRes.json();

      if (paymentData.payment_session_id) {
        const cashfree = window.Cashfree({ mode: 'production' });
        
        // Use Google Pay specific checkout
        cashfree.checkout({
          paymentSessionId: paymentData.payment_session_id,
          redirectTarget: '_self',
          paymentMethod: {
            googlepay: {}
          }
        });
      }
    } catch (error) {
      console.error('Google Pay error:', error);
      toast.error('Google Pay initialization failed');
      setLoading(false);
    }
  };

  // Confetti effect
  useEffect(() => {
    if (orderPlaced) {
      setAnimatingSuccess(true);
      const duration = 3000;
      const end = Date.now() + duration;
      const colors = ['#8B5CF6', '#A78BFA', '#C4B5FD', '#FFFFFF'];

      (function frame() {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: colors
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: colors
        });
        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      }());

      setTimeout(() => setAnimatingSuccess(false), 2000);
    }
  }, [orderPlaced]);

  const handlePayment = async () => {
    if (!selectedMethod) {
      toast.error('Please select a payment method');
      return;
    }

    // Handle Google Pay separately
    if (selectedMethod === 'gpay') {
      await initGooglePay();
      return;
    }

    setLoading(true);

    try {
      const cleanPhone = patientPhone.replace(/\D/g, '').slice(-10);

      if (['upi', 'card', 'netbanking', 'wallet'].includes(selectedMethod)) {
        // Online payment via Cashfree
        const orderData = orderType === 'pharmacy' 
          ? {
              medicines: items.map(name => ({ name, quantity: 1 })),
              patient_name: patientName,
              patient_phone: cleanPhone,
              patient_email: patientEmail || null,
              delivery_address: decodeURIComponent(addressParam),
              payment_method: 'cashfree',
              payment_status: 'pending'
            }
          : {
              tests: items,
              patient_name: patientName,
              patient_phone: cleanPhone,
              patient_email: patientEmail || null,
              patient_address: collectionType === 'home' ? decodeURIComponent(addressParam) : null,
              preferred_date: preferredDate,
              preferred_time_slot: preferredTime,
              collection_type: collectionType,
              total_amount: totalAmount,
              payment_method: 'cashfree',
              payment_status: 'pending'
            };

        const endpoint = orderType === 'pharmacy' ? '/pharmacy' : '/diagnostics';
        const orderResponse = await axios.post(`${API}${endpoint}`, orderData);
        const orderId = orderResponse.data?.id || orderResponse.data?.order_id || orderResponse.data?.booking_id;

        const paymentRes = await fetch(`${API}/payments/cashfree/create-order`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_id: `${orderType.toUpperCase()}_${cleanPhone}_${Date.now()}`,
            customer_name: patientName,
            customer_email: patientEmail || `${cleanPhone}@nevikacura.com`,
            customer_phone: cleanPhone,
            amount: totalAmount || 100,
            product_type: orderType === 'pharmacy' ? 'pharmacy' : 'lab_test',
            product_id: orderId,
            return_url: `${window.location.origin}/payment-success?order_id=${orderId}&type=${orderType === 'pharmacy' ? 'pharmacy' : 'lab_test'}`
          })
        });

        const paymentData = await paymentRes.json();

        if (paymentData.payment_session_id && window.Cashfree) {
          const cashfree = window.Cashfree({ mode: 'production' });
          cashfree.checkout({
            paymentSessionId: paymentData.payment_session_id,
            redirectTarget: '_self'
          });
        } else if (paymentData.payment_link) {
          window.location.href = paymentData.payment_link;
        }
      } else {
        // COD or Pay Later
        const orderData = orderType === 'pharmacy' 
          ? {
              medicines: items.map(name => ({ name, quantity: 1 })),
              patient_name: patientName,
              patient_phone: cleanPhone,
              patient_email: patientEmail || null,
              delivery_address: decodeURIComponent(addressParam),
              payment_method: selectedMethod,
              payment_status: selectedMethod === 'cod' ? 'cod' : 'pending'
            }
          : {
              tests: items,
              patient_name: patientName,
              patient_phone: cleanPhone,
              patient_email: patientEmail || null,
              patient_address: collectionType === 'home' ? decodeURIComponent(addressParam) : null,
              preferred_date: preferredDate,
              preferred_time_slot: preferredTime,
              collection_type: collectionType,
              total_amount: totalAmount,
              payment_method: selectedMethod,
              payment_status: selectedMethod === 'cod' ? 'cod' : 'pending'
            };

        const endpoint = orderType === 'pharmacy' ? '/pharmacy' : '/diagnostics';
        const response = await axios.post(`${API}${endpoint}`, orderData);
        const newOrderId = response.data?.booking_id || response.data?.id || response.data?.order_id;

        setOrderDetails({
          orderId: newOrderId,
          method: selectedMethod,
          verificationCode: response.data?.booking_id || null
        });
        setOrderPlaced(true);
        setLoading(false);

        toast.success('Order confirmed! 🎉');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.response?.data?.detail || 'Failed to process order');
      setLoading(false);
    }
  };

  // Success Screen
  if (orderPlaced && orderDetails) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gray-50">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div 
            className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[100px] animate-pulse"
            style={{ background: 'rgba(34, 197, 94, 0.15)' }}
          />
          <div 
            className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[80px] animate-pulse"
            style={{ background: 'rgba(34, 197, 94, 0.1)', animationDelay: '1s' }}
          />
        </div>
        
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">
          {/* Success Icon */}
          <div 
            className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-500/30 ${animatingSuccess ? 'animate-bounce' : ''}`}
            style={{ background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)' }}
          >
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
          
          <h1 className="text-3xl font-black mb-2 text-center text-gray-800">
            Payment Successful!
          </h1>
          <p className="text-center mb-8 text-gray-500">
            Your order has been confirmed
          </p>
          
          {/* Order Card */}
          <div className="w-full max-w-sm rounded-3xl p-6 mb-6 bg-white shadow-lg border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-500">Order ID</span>
              <span className="font-bold text-lg text-green-600">
                #{orderDetails.orderId}
              </span>
            </div>
            
            {orderDetails.verificationCode && (
              <>
                <div className="h-px w-full mb-4 bg-gray-100" />
                <div className="text-center">
                  <p className="text-xs mb-2 text-gray-400">YOUR BOOKING ID</p>
                  <div 
                    className="font-mono text-4xl font-black tracking-[0.3em] py-4 text-gray-800"
                    data-testid="booking-id-display"
                  >
                    {orderDetails.verificationCode}
                  </div>
                  <p className="text-sm text-gray-500">
                    {orderType === 'pharmacy' 
                      ? 'Show this to delivery person'
                      : 'Show this to phlebotomist'}
                  </p>
                </div>
              </>
            )}
          </div>
          
          {/* Actions */}
          <Button
            onClick={() => navigate(`/track?phone=${patientPhone}`)}
            className="w-full max-w-sm py-6 rounded-2xl text-lg font-bold text-white mb-3 bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg shadow-green-500/30"
            data-testid="track-order-btn"
          >
            Track Order
            <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
          
          <button
            onClick={() => navigate('/')}
            className="py-3 font-medium text-gray-500 hover:text-gray-700"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dark Header Section */}
      <div className="bg-[#1A1A1A] rounded-b-[32px] shadow-lg">
        {/* Header */}
        <header className="px-4 py-4">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 rounded-xl bg-white/10"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="font-bold text-lg text-white">Payment</h1>
            <div className="p-2 rounded-xl bg-white/10">
              <Shield className="w-5 h-5 text-green-400" />
            </div>
          </div>
        </header>

        {/* Amount Display in Dark Section */}
        <div className="px-4 pb-8 pt-4">
          <div className="max-w-lg mx-auto text-center">
            <p className="text-gray-400 text-sm mb-2">Total Amount</p>
            <div className="text-5xl font-black text-white mb-2">
              ₹{totalAmount > 0 ? totalAmount.toLocaleString('en-IN') : 'TBD'}
            </div>
            {totalAmount === 0 && (
              <p className="text-xs text-gray-500">Amount will be confirmed by staff</p>
            )}
            <div className="flex items-center justify-center gap-2 mt-4">
              <serviceConfig.icon className="w-4 h-4" style={{ color: serviceConfig.color }} />
              <span className="text-sm text-gray-300">{serviceConfig.title}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-32 -mt-4">
        {/* Order Summary Card - White */}
        <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
          <h3 className="font-bold mb-4 text-gray-800">Order Summary</h3>
          <div className="space-y-3 max-h-40 overflow-y-auto">
            {items.slice(0, 5).map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2 rounded-xl bg-gray-50">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  orderType === 'pharmacy' ? 'bg-orange-100' : 'bg-amber-100'
                }`}>
                  {orderType === 'pharmacy' 
                    ? <Package className="w-5 h-5 text-orange-600" />
                    : <FlaskConical className="w-5 h-5 text-amber-600" />
                  }
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-800">{item}</p>
                  <p className="text-xs text-gray-500">{orderType === 'pharmacy' ? 'Medicine' : 'Lab Test'}</p>
                </div>
              </div>
            ))}
            {items.length > 5 && (
              <p className="text-sm text-center py-2 text-gray-400">
                +{items.length - 5} more items
              </p>
            )}
          </div>
        </div>

        {/* Payment Methods Card - White */}
        <div className="bg-white rounded-2xl p-5 mb-4 shadow-sm">
          <h3 className="font-bold mb-4 text-gray-800">Select Payment Method</h3>
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <PaymentMethodCard
                key={method.id}
                method={method.id}
                selected={selectedMethod === method.id}
                onClick={() => {
                  setSelectedMethod(method.id);
                  if (method.id === 'card') {
                    setShowCardInput(true);
                  }
                }}
                icon={method.icon}
                title={method.title}
                subtitle={savedCard && method.id === 'card' ? `•••• ${savedCard.number.slice(-4)}` : method.subtitle}
                badge={method.badge}
              />
            ))}
          </div>
        </div>

        {/* Saved Card Preview */}
        {savedCard && selectedMethod === 'card' && (
          <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-green-500 to-emerald-600">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-800">
                  •••• •••• •••• {savedCard.number.slice(-4)}
                </p>
                <p className="text-xs text-gray-500">
                  {savedCard.name} | Expires {savedCard.expiry}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setShowCardInput(true)}
              className="text-xs px-3 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
            >
              Change
            </button>
          </div>
        )}

        {/* User Info Summary Card - White */}
        <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-gray-800">{patientName}</p>
              <p className="text-sm text-gray-500">{patientPhone}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent">
        <div className="max-w-lg mx-auto">
          <Button
            onClick={handlePayment}
            disabled={!selectedMethod || loading || (selectedMethod === 'card' && !savedCard)}
            className="w-full py-6 rounded-2xl text-lg font-bold text-white disabled:opacity-50 disabled:bg-gray-300 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/30"
            data-testid="pay-now-btn"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                {selectedMethod === 'cod' ? 'Confirm Order' : 
                 selectedMethod === 'pay_later' ? 'Get Payment Link' : 
                 selectedMethod === 'card' && !savedCard ? 'Add Card to Pay' :
                 `Pay ${totalAmount > 0 ? `₹${totalAmount.toLocaleString('en-IN')}` : 'Now'}`}
              </>
            )}
          </Button>
          
          <p className="text-center text-xs mt-3" style={{ color: THEME.text.muted }}>
            <Shield className="w-3 h-3 inline mr-1" />
            Secured by Cashfree Payments
          </p>
        </div>
      </div>

      {/* Card Input Modal */}
      {showCardInput && (
        <CardInputForm
          onCardData={(cardData) => {
            setSavedCard(cardData);
            setShowCardInput(false);
            toast.success('Card added successfully');
          }}
          onClose={() => setShowCardInput(false)}
        />
      )}
    </div>
  );
};

export default PaymentGateway;

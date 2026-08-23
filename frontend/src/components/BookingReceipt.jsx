import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Copy, 
  Check,
  Calendar,
  Clock,
  MapPin,
  Phone,
  User,
  Stethoscope,
  FlaskConical,
  Package,
  Share2,
  Home
} from 'lucide-react';
import { Button } from './ui/button';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';

/**
 * BookingReceipt - Receipt-Print Style Confirmation
 * Beautiful animated receipt design like Swiggy/Zomato
 * 
 * @param {string} type - 'diagyn' | 'mango' | 'pharmacy'
 * @param {object} orderDetails - Booking details
 * @param {function} onClose - Close handler
 */
const BookingReceipt = ({ 
  type = 'diagyn', 
  orderDetails = {},
  onClose
}) => {
  const navigate = useNavigate();
  const [isAnimating, setIsAnimating] = useState(true);
  const [receiptVisible, setReceiptVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const receiptRef = useRef(null);

  // Type-specific configuration
  const typeConfig = {
    diagyn: {
      name: 'DiaGyn',
      bgColor: 'bg-gradient-to-b from-teal-500 to-emerald-600',
      accentColor: '#14b8a6',
      icon: Stethoscope,
      title: 'Appointment Booked!',
      subtitle: 'We look forward to seeing you',
      illustration: '🩺',
      homeRoute: '/diagyn'
    },
    mango: {
      name: 'Mango Labs',
      bgColor: 'bg-gradient-to-b from-green-500 to-emerald-600',
      accentColor: '#22c55e',
      icon: FlaskConical,
      title: 'Booking Confirmed!',
      subtitle: orderDetails.collectionMode === 'home' ? 'Sample collection at your doorstep' : 'Visit our NABL certified lab',
      illustration: '🧪',
      homeRoute: '/mango'
    },
    pharmacy: {
      name: 'Orange Pharmacy',
      bgColor: 'bg-gradient-to-b from-orange-500 to-amber-600',
      accentColor: '#f97316',
      icon: Package,
      title: 'Order Placed!',
      subtitle: 'Your medicines are on the way',
      illustration: '💊',
      homeRoute: '/pharmacy'
    }
  };

  const config = typeConfig[type] || typeConfig.diagyn;
  const TypeIcon = config.icon;

  // Animation sequence
  useEffect(() => {
    // Start animation
    const timer1 = setTimeout(() => {
      setReceiptVisible(true);
    }, 300);

    const timer2 = setTimeout(() => {
      setIsAnimating(false);
      launchConfetti();
    }, 1200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Confetti effect
  const launchConfetti = () => {
    const colors = type === 'pharmacy' 
      ? ['#f97316', '#fb923c', '#fbbf24'] 
      : type === 'mango' 
        ? ['#22c55e', '#4ade80', '#86efac']
        : ['#14b8a6', '#2dd4bf', '#5eead4'];

    // Multiple bursts
    const end = Date.now() + 2000;
    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: colors
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };

  // Copy booking code
  const handleCopy = async () => {
    const code = orderDetails.verificationCode || orderDetails.orderId;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  // Format date display
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={`min-h-screen ${config.bgColor} relative overflow-hidden`}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }} />
      </div>

      {/* Header */}
      <header className="relative z-10 p-4 flex items-center justify-between">
        <button 
          onClick={() => onClose ? onClose() : navigate(config.homeRoute)}
          className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          data-testid="receipt-back-btn"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-white font-semibold text-lg">{config.name}</h1>
        <div className="w-10" /> {/* Spacer */}
      </header>

      {/* Receipt Container */}
      <div className="relative z-10 px-4 pt-4 pb-32">
        {/* Animated Receipt Paper */}
        <div 
          ref={receiptRef}
          className={`
            relative bg-white rounded-t-3xl shadow-2xl mx-auto max-w-md
            transition-all duration-700 ease-out
            ${receiptVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}
          `}
          style={{
            minHeight: '70vh'
          }}
        >
          {/* Receipt Content */}
          <div className="p-6 pb-16">
            {/* Success Illustration */}
            <div className="text-center mb-6 pt-4">
              {/* Animated Icon Container */}
              <div className={`
                relative inline-block mb-4
                ${isAnimating ? 'animate-bounce' : ''}
              `}>
                {/* Confetti decorations */}
                <div className="absolute -top-2 -left-4 text-2xl animate-pulse">✨</div>
                <div className="absolute -top-3 -right-3 text-xl animate-pulse delay-100">🎉</div>
                <div className="absolute -bottom-1 -left-6 text-lg animate-pulse delay-200">✨</div>
                <div className="absolute -bottom-2 -right-5 text-xl animate-pulse delay-300">🎊</div>
                
                {/* Main Icon */}
                <div 
                  className="w-24 h-24 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{ backgroundColor: `${config.accentColor}15` }}
                >
                  <div className="relative">
                    {/* Package/Bag Icon */}
                    <div className="text-5xl">{config.illustration}</div>
                    {/* Checkmark */}
                    <div 
                      className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: config.accentColor }}
                    >
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{config.title}</h2>
              <p className="text-gray-500">{config.subtitle}</p>
            </div>

            {/* Divider with zigzag */}
            <div className="relative py-4">
              <div className="absolute left-0 right-0 top-1/2 h-px bg-gray-200" />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-gradient-to-b from-teal-500 to-emerald-600" style={{ backgroundColor: config.accentColor }} />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full" style={{ backgroundColor: config.accentColor }} />
            </div>

            {/* Booking ID / Order Number */}
            <div className="text-center mb-6">
              <p className="text-sm text-gray-500 mb-1">Booking ID</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl font-black tracking-wider" style={{ color: config.accentColor }}>
                  #{orderDetails.orderId || orderDetails.bookingId || '----'}
                </span>
                <button 
                  onClick={handleCopy}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                  data-testid="copy-booking-id"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-500" />}
                </button>
              </div>
              {orderDetails.verificationCode && orderDetails.verificationCode !== orderDetails.orderId && (
                <p className="text-sm text-gray-400 mt-2">
                  Verification Code: <span className="font-mono font-bold">{orderDetails.verificationCode}</span>
                </p>
              )}
            </div>

            {/* Details Section */}
            <div className="space-y-4 mb-6">
              {/* Doctor/Service Info (DiaGyn) */}
              {type === 'diagyn' && orderDetails.doctor && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${config.accentColor}15` }}>
                    <Stethoscope className="w-5 h-5" style={{ color: config.accentColor }} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{orderDetails.doctor}</p>
                    {orderDetails.clinic && <p className="text-sm text-gray-500">{orderDetails.clinic}</p>}
                  </div>
                </div>
              )}

              {/* Date & Time */}
              {(orderDetails.date || orderDetails.time) && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${config.accentColor}15` }}>
                    <Calendar className="w-5 h-5" style={{ color: config.accentColor }} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{formatDate(orderDetails.date)}</p>
                    {orderDetails.time && <p className="text-sm text-gray-500">{orderDetails.time}</p>}
                  </div>
                </div>
              )}

              {/* Patient Info */}
              {orderDetails.patientName && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${config.accentColor}15` }}>
                    <User className="w-5 h-5" style={{ color: config.accentColor }} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{orderDetails.patientName}</p>
                    {orderDetails.patientPhone && <p className="text-sm text-gray-500">+91 {orderDetails.patientPhone}</p>}
                  </div>
                </div>
              )}

              {/* Address (for delivery/home collection) */}
              {orderDetails.address && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${config.accentColor}15` }}>
                    <MapPin className="w-5 h-5" style={{ color: config.accentColor }} />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Delivery Address</p>
                    <p className="text-sm text-gray-500">{orderDetails.address}</p>
                  </div>
                </div>
              )}

              {/* Items/Tests (for Mango/Pharmacy) */}
              {(orderDetails.items?.length > 0 || orderDetails.tests?.length > 0) && (
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="font-semibold text-gray-900 mb-2">
                    {type === 'mango' ? 'Tests Booked' : 'Items Ordered'} 
                    ({(orderDetails.items || orderDetails.tests)?.length})
                  </p>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {(orderDetails.items || orderDetails.tests)?.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-gray-600">{typeof item === 'string' ? item : item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Payment Info */}
            {orderDetails.amount !== undefined && (
              <div className="border-t border-dashed border-gray-200 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Total Amount</span>
                  <span className="text-2xl font-bold" style={{ color: config.accentColor }}>
                    {orderDetails.amount > 0 ? `₹${orderDetails.amount.toLocaleString()}` : 'FREE'}
                  </span>
                </div>
                {orderDetails.paymentMethod && (
                  <p className="text-sm text-gray-400 text-right mt-1">
                    {orderDetails.paymentMethod === 'cod' && 'Cash on Delivery'}
                    {orderDetails.paymentMethod === 'pay_later' && 'Pay via WhatsApp link'}
                    {orderDetails.paymentMethod === 'free' && 'Free Consultation'}
                  </p>
                )}
              </div>
            )}

            {/* Important Note */}
            <div className="mt-6 p-4 rounded-xl border-2 border-dashed" style={{ borderColor: `${config.accentColor}40`, backgroundColor: `${config.accentColor}05` }}>
              <p className="text-sm text-center" style={{ color: config.accentColor }}>
                {type === 'diagyn' && '📋 Please show your Booking ID at the clinic reception'}
                {type === 'mango' && '🧪 Keep your phone handy - Our team will call to confirm'}
                {type === 'pharmacy' && '💊 Show Delivery Code to receive your order'}
              </p>
            </div>
          </div>

          {/* Zigzag Bottom Edge */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-6 overflow-hidden"
            style={{
              background: `linear-gradient(135deg, white 25%, transparent 25%), 
                          linear-gradient(225deg, white 25%, transparent 25%)`,
              backgroundSize: '12px 12px',
              backgroundPosition: '0 0'
            }}
          />
        </div>
      </div>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-4 shadow-2xl z-20">
        <div className="max-w-md mx-auto flex gap-3">
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="flex-1 py-6 rounded-2xl font-semibold border-2 flex items-center justify-center gap-2"
            data-testid="receipt-home-btn"
          >
            <Home className="w-5 h-5" />
            Home
          </Button>
          <Button
            onClick={() => navigate(orderDetails.trackingPath || '/my-appointments')}
            className="flex-1 py-6 rounded-2xl font-semibold text-white shadow-lg flex items-center justify-center gap-2"
            style={{ backgroundColor: config.accentColor }}
            data-testid="receipt-track-btn"
          >
            <Calendar className="w-5 h-5" />
            {type === 'diagyn' ? 'My Appointments' : 'Track Order'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BookingReceipt;

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Lock, Unlock, Gift, CreditCard, Check, Star, Sparkles, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const SubscriptionGate = ({ 
  planType, // 'glydex' or 'evara'
  patientId,
  patientName,
  patientPhone,
  patientEmail,
  children,
  onSubscriptionActive
}) => {
  const [loading, setLoading] = useState(true);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponValid, setCouponValid] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [planDetails, setPlanDetails] = useState(null);

  // Plan colors
  const planColors = {
    glydex: {
      primary: 'from-purple-600 to-indigo-600',
      light: 'bg-purple-50',
      text: 'text-purple-600',
      border: 'border-purple-200'
    },
    evara: {
      primary: 'from-pink-500 to-rose-500',
      light: 'bg-pink-50',
      text: 'text-pink-600',
      border: 'border-pink-200'
    }
  };

  const colors = planColors[planType] || planColors.glydex;

  useEffect(() => {
    checkSubscription();
    fetchPlanDetails();
  }, [patientId, planType]);

  const fetchPlanDetails = async () => {
    try {
      const res = await fetch(`${API}/api/subscriptions/plans/${planType}`);
      const data = await res.json();
      if (data.plan) {
        setPlanDetails(data.plan);
      }
    } catch (error) {
      console.error('Failed to fetch plan details:', error);
    }
  };

  const checkSubscription = async () => {
    if (!patientId) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API}/api/subscriptions/check/${planType}/${patientId}`);
      const data = await res.json();
      
      if (data.has_subscription) {
        setHasSubscription(true);
        setSubscriptionInfo(data);
        if (onSubscriptionActive) onSubscriptionActive(data);
      }
    } catch (error) {
      console.error('Subscription check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }

    setValidatingCoupon(true);
    try {
      // Get device ID for security binding
      const deviceId = localStorage.getItem('device_id') || 
        (() => {
          const newId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
          localStorage.setItem('device_id', newId);
          return newId;
        })();

      const res = await fetch(`${API}/api/subscriptions/validate-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coupon_code: couponCode.toUpperCase(),
          plan_type: planType,
          email: patientEmail || null,
          device_id: deviceId
        })
      });
      const data = await res.json();
      
      setCouponValid(data.valid);
      if (data.valid) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Failed to validate coupon');
      setCouponValid(false);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleSubscribe = async () => {
    if (!patientId || !patientPhone) {
      toast.error('Please login to subscribe');
      return;
    }

    setProcessingPayment(true);
    try {
      const res = await fetch(`${API}/api/subscriptions/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_type: planType,
          patient_id: patientId,
          patient_name: patientName || 'Patient',
          patient_phone: patientPhone,
          patient_email: patientEmail,
          coupon_code: couponValid ? couponCode.toUpperCase() : null
        })
      });
      const data = await res.json();

      if (data.free_subscription) {
        // Coupon gave 100% discount - subscription activated!
        toast.success('🎉 Subscription activated with coupon!');
        setHasSubscription(true);
        setShowPayment(false);
        checkSubscription();
      } else if (data.checkout_url) {
        // Redirect to Stripe checkout
        window.location.href = data.checkout_url;
      } else {
        toast.error(data.detail || 'Failed to create checkout');
      }
    } catch (error) {
      toast.error('Payment processing failed');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Has active subscription - show content
  if (hasSubscription) {
    return (
      <>
        {/* Subscription Status Bar */}
        <div className={`mb-4 p-3 rounded-xl ${colors.light} ${colors.border} border flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <Unlock className={`w-5 h-5 ${colors.text}`} />
            <span className="font-medium">Premium Active</span>
            <Badge className="bg-green-500 text-white">
              {subscriptionInfo?.days_remaining} days left
            </Badge>
          </div>
          <div className="text-sm text-gray-500">
            Expires: {new Date(subscriptionInfo?.end_date).toLocaleDateString()}
          </div>
        </div>
        {children}
      </>
    );
  }

  // No subscription - show paywall
  return (
    <div className="space-y-6">
      {/* Locked Content Preview */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/80 to-white z-10 flex items-end justify-center pb-8">
          <Button 
            onClick={() => setShowPayment(true)}
            className={`bg-gradient-to-r ${colors.primary} text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all`}
          >
            <Lock className="w-5 h-5 mr-2" />
            Unlock Premium Features
          </Button>
        </div>
        <div className="blur-sm pointer-events-none opacity-50">
          {children}
        </div>
      </div>

      {/* Subscription Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-300">
            <CardHeader className={`bg-gradient-to-r ${colors.primary} text-white rounded-t-2xl`}>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Sparkles className="w-6 h-6" />
                    {planDetails?.name || `${planType} Premium`}
                  </CardTitle>
                  <p className="text-white/80 text-sm mt-1">{planDetails?.description}</p>
                </div>
                <button 
                  onClick={() => setShowPayment(false)}
                  className="text-white/80 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
            </CardHeader>
            
            <CardContent className="p-6 space-y-5">
              {/* Price */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-4xl font-bold">₹{planDetails?.price || 3600}</span>
                  <span className="text-gray-500">/year</span>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2">
                {(planDetails?.features || [
                  'Personalized care plans',
                  'Expert consultations',
                  'Health tracking & analytics',
                  'Medicine reminders',
                  'Monthly health reports'
                ]).map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <Check className={`w-4 h-4 ${colors.text}`} />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              {/* Coupon Code Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Gift className="w-4 h-4" />
                  Have a coupon code?
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase());
                      setCouponValid(null);
                    }}
                    className={`flex-1 uppercase ${
                      couponValid === true ? 'border-green-500 bg-green-50' :
                      couponValid === false ? 'border-red-500 bg-red-50' : ''
                    }`}
                  />
                  <Button
                    variant="outline"
                    onClick={validateCoupon}
                    disabled={validatingCoupon || !couponCode.trim()}
                  >
                    {validatingCoupon ? '...' : 'Apply'}
                  </Button>
                </div>
                {couponValid === true && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <Check className="w-4 h-4" /> Coupon applied - 100% discount!
                  </p>
                )}
              </div>

              {/* Subscribe Button */}
              <Button
                onClick={handleSubscribe}
                disabled={processingPayment}
                className={`w-full bg-gradient-to-r ${colors.primary} text-white py-3 rounded-xl hover:shadow-lg transition-all`}
              >
                {processingPayment ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </span>
                ) : couponValid ? (
                  <span className="flex items-center gap-2">
                    <Gift className="w-5 h-5" />
                    Activate Free Subscription
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Subscribe Now - ₹{planDetails?.price || 3600}
                  </span>
                )}
              </Button>

              {/* Info */}
              <p className="text-xs text-gray-500 text-center">
                Secure payment via Stripe. Cancel anytime.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SubscriptionGate;

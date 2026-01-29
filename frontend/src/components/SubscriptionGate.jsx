import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Lock, Unlock, Gift, CreditCard, Check, Star, Sparkles, Calendar, Clock, Users, Share2, Zap, Crown, X } from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const SubscriptionGate = ({ 
  planType,
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
  
  // New states for enhanced features
  const [selectedTier, setSelectedTier] = useState('annual');
  const [referralCode, setReferralCode] = useState('');
  const [trialStatus, setTrialStatus] = useState(null);
  const [showReferralInput, setShowReferralInput] = useState(false);

  const planColors = {
    glydex: {
      primary: 'from-purple-600 to-indigo-600',
      light: 'bg-purple-50',
      text: 'text-purple-600',
      border: 'border-purple-200',
      accent: 'purple'
    },
    evara: {
      primary: 'from-pink-500 to-rose-500',
      light: 'bg-pink-50',
      text: 'text-pink-600',
      border: 'border-pink-200',
      accent: 'pink'
    }
  };

  const colors = planColors[planType] || planColors.glydex;

  useEffect(() => {
    checkSubscription();
    fetchPlanDetails();
    checkTrialStatus();
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
      console.error('Failed to check subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkTrialStatus = async () => {
    if (!patientId) return;
    
    try {
      const res = await fetch(`${API}/api/subscriptions/free-trial/status/${planType}/${patientId}`);
      const data = await res.json();
      setTrialStatus(data);
    } catch (error) {
      console.error('Failed to check trial status:', error);
    }
  };

  const startFreeTrial = async () => {
    if (!patientId || !patientEmail) {
      toast.error('Please login to start your free trial');
      return;
    }

    setProcessingPayment(true);
    try {
      const deviceId = localStorage.getItem('device_id') || 
        (() => {
          const newId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
          localStorage.setItem('device_id', newId);
          return newId;
        })();

      const res = await fetch(`${API}/api/subscriptions/free-trial/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId,
          patient_name: patientName || 'User',
          patient_email: patientEmail,
          plan_type: planType,
          device_id: deviceId
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success(`🎉 ${data.message}`);
        setHasSubscription(true);
        setShowPayment(false);
        checkSubscription();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Failed to start trial');
    } finally {
      setProcessingPayment(false);
    }
  };

  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }

    setValidatingCoupon(true);
    try {
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
      const res = await fetch(`${API}/api/subscriptions/checkout/tiered`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_type: planType,
          tier: selectedTier,
          patient_id: patientId,
          patient_name: patientName || 'Patient',
          patient_phone: patientPhone,
          patient_email: patientEmail,
          coupon_code: couponValid ? couponCode.toUpperCase() : null,
          referral_code: referralCode || null
        })
      });
      const data = await res.json();

      if (data.free_subscription) {
        toast.success('🎉 Subscription activated with coupon!');
        setHasSubscription(true);
        setShowPayment(false);
        checkSubscription();
      } else if (data.checkout_url) {
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

  const getTierPrice = (tier) => {
    if (!planDetails?.tiers) return 0;
    return planDetails.tiers[tier]?.price || 0;
  };

  const getTierDays = (tier) => {
    if (!planDetails?.tiers) return 0;
    return planDetails.tiers[tier]?.duration_days || 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (hasSubscription) {
    return (
      <>
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

  return (
    <div className="space-y-6">
      {/* Locked Content Preview */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/80 to-white z-10 flex items-end justify-center pb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            {trialStatus?.can_start_trial && (
              <Button 
                onClick={startFreeTrial}
                disabled={processingPayment}
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                <Zap className="w-5 h-5 mr-2" />
                Start 7-Day Free Trial
              </Button>
            )}
            <Button 
              onClick={() => setShowPayment(true)}
              className={`bg-gradient-to-r ${colors.primary} text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all`}
            >
              <Crown className="w-5 h-5 mr-2" />
              Get Premium
            </Button>
          </div>
        </div>
        <div className="blur-sm pointer-events-none opacity-50">
          {children}
        </div>
      </div>

      {/* Enhanced Subscription Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-lg bg-white rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-300 my-4">
            <CardHeader className={`bg-gradient-to-r ${colors.primary} text-white rounded-t-2xl relative`}>
              <button 
                onClick={() => setShowPayment(false)}
                className="absolute right-4 top-4 text-white/80 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="text-center pt-2">
                <CardTitle className="text-2xl flex items-center justify-center gap-2">
                  <Sparkles className="w-7 h-7" />
                  {planDetails?.name || `${planType} Premium`}
                </CardTitle>
                <p className="text-white/80 text-sm mt-2">{planDetails?.description}</p>
              </div>
            </CardHeader>
            
            <CardContent className="p-5 space-y-5">
              {/* Tiered Pricing */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Choose Your Plan
                </h4>
                
                <div className="grid grid-cols-2 gap-2">
                  {planDetails?.tiers && Object.entries(planDetails.tiers).map(([key, tier]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedTier(key)}
                      className={`relative p-3 rounded-xl border-2 text-left transition-all ${
                        selectedTier === key 
                          ? `${colors.border} ${colors.light} ring-2 ring-${colors.accent}-400` 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {tier.popular && (
                        <Badge className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px]">
                          Popular
                        </Badge>
                      )}
                      {tier.best_value && (
                        <Badge className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px]">
                          Best Value
                        </Badge>
                      )}
                      <div className="font-bold text-lg">₹{tier.price}</div>
                      <div className="text-xs text-gray-500">{tier.name}</div>
                      {tier.includes_free && (
                        <div className="text-[10px] text-green-600 mt-1">
                          +{tier.includes_free/30}mo free access
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Free Trial Banner */}
              {trialStatus?.can_start_trial && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-green-800">Try 7 Days Free!</p>
                      <p className="text-xs text-green-600">No payment required. Cancel anytime.</p>
                    </div>
                    <Button 
                      size="sm"
                      onClick={startFreeTrial}
                      disabled={processingPayment}
                      className="bg-green-500 hover:bg-green-600 text-white"
                    >
                      Start Trial
                    </Button>
                  </div>
                </div>
              )}

              {/* Features */}
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-800 text-sm">What's Included:</h4>
                <div className="grid grid-cols-2 gap-1">
                  {(planDetails?.features || []).slice(0, 6).map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Check className={`w-3 h-3 ${colors.text} flex-shrink-0`} />
                      <span className="truncate">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coupon & Referral */}
              <div className="space-y-3 pt-2 border-t">
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
                      className={`flex-1 ${couponValid === true ? 'border-green-500' : couponValid === false ? 'border-red-500' : ''}`}
                    />
                    <Button 
                      onClick={validateCoupon}
                      disabled={validatingCoupon || !couponCode}
                      variant="outline"
                      size="sm"
                    >
                      {validatingCoupon ? '...' : 'Apply'}
                    </Button>
                  </div>
                  {couponValid === true && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Coupon applied!
                    </p>
                  )}
                </div>

                {/* Referral Code */}
                <div className="space-y-2">
                  <button 
                    onClick={() => setShowReferralInput(!showReferralInput)}
                    className="text-sm text-gray-500 flex items-center gap-1 hover:text-gray-700"
                  >
                    <Share2 className="w-3 h-3" />
                    Have a referral code? (Get 20% off)
                  </button>
                  {showReferralInput && (
                    <Input
                      placeholder="Enter referral code"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      className="text-sm"
                    />
                  )}
                </div>
              </div>

              {/* Subscribe Button */}
              <Button
                onClick={handleSubscribe}
                disabled={processingPayment}
                className={`w-full bg-gradient-to-r ${colors.primary} text-white py-3 rounded-xl shadow-lg hover:shadow-xl transition-all text-lg`}
              >
                {processingPayment ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Pay ₹{getTierPrice(selectedTier)} for {getTierDays(selectedTier)} days
                  </span>
                )}
              </Button>

              {/* Trust Badges */}
              <div className="flex items-center justify-center gap-4 text-xs text-gray-400 pt-2">
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Secure Payment
                </span>
                <span className="flex items-center gap-1">
                  <Check className="w-3 h-3" /> Cancel Anytime
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SubscriptionGate;

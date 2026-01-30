import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Lock, Unlock, Gift, CreditCard, Check, Star, Sparkles, Calendar, Clock, Users, Share2, Zap, Crown, X, Mail, User, Phone } from 'lucide-react';
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
  
  // Staff bypass state
  const [isStaffUser, setIsStaffUser] = useState(false);
  const [staffInfo, setStaffInfo] = useState(null);
  
  // Enhanced states
  const [selectedTier, setSelectedTier] = useState('annual');
  const [referralCode, setReferralCode] = useState('');
  const [trialStatus, setTrialStatus] = useState(null);
  const [showReferralInput, setShowReferralInput] = useState(false);
  
  // NEW: Buy without login - Email only for checkout
  const [checkoutEmail, setCheckoutEmail] = useState(patientEmail || '');
  const [showMembershipForm, setShowMembershipForm] = useState(false);
  const [membershipFormData, setMembershipFormData] = useState({
    name: '',
    phone: '',
    age: '',
    gender: '',
    address: ''
  });

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
    } finally {
      setLoading(false);
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
          email: checkoutEmail || null,
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

  // NEW: Purchase without requiring login - just email
  const handlePurchase = async () => {
    // Validate email only
    if (!checkoutEmail || !checkoutEmail.includes('@')) {
      toast.error('Please enter a valid email address');
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

      // Generate a temporary patient ID for checkout
      const tempPatientId = patientId || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const res = await fetch(`${API}/api/subscriptions/checkout/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_type: planType,
          tier: selectedTier,
          email: checkoutEmail.toLowerCase(),
          device_id: deviceId,
          coupon_code: couponValid ? couponCode.toUpperCase() : null,
          referral_code: referralCode || null,
          temp_patient_id: tempPatientId
        })
      });
      const data = await res.json();

      if (data.free_subscription) {
        toast.success('🎉 Subscription activated with coupon!');
        // Show membership form after successful free activation
        setShowPayment(false);
        setShowMembershipForm(true);
      } else if (data.checkout_url) {
        // Store email for post-payment form
        localStorage.setItem('pending_membership_email', checkoutEmail);
        localStorage.setItem('pending_membership_plan', planType);
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

  // Submit membership form after payment
  const submitMembershipForm = async () => {
    if (!membershipFormData.name || !membershipFormData.phone) {
      toast.error('Please fill in your name and phone number');
      return;
    }

    try {
      const res = await fetch(`${API}/api/subscriptions/complete-membership`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: checkoutEmail,
          plan_type: planType,
          ...membershipFormData
        })
      });
      const data = await res.json();

      if (data.success) {
        toast.success('🎉 Membership activated! Welcome aboard!');
        setShowMembershipForm(false);
        // Refresh to show subscription
        window.location.reload();
      } else {
        toast.error(data.message || 'Failed to complete membership');
      }
    } catch (error) {
      toast.error('Failed to submit membership form');
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

  // Membership Form Modal (shown after payment)
  if (showMembershipForm) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white rounded-2xl shadow-2xl">
          <CardHeader className={`bg-gradient-to-r ${colors.primary} text-white rounded-t-2xl`}>
            <CardTitle className="text-xl flex items-center gap-2">
              <Check className="w-6 h-6" />
              Complete Your Membership
            </CardTitle>
            <p className="text-white/80 text-sm">Just a few details to activate your account</p>
          </CardHeader>
          
          <CardContent className="p-6 space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <Check className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-green-700 font-medium">Payment Successful!</p>
              <p className="text-green-600 text-sm">Fill this form to activate your membership</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Full Name *</label>
                <Input
                  placeholder="Enter your full name"
                  value={membershipFormData.name}
                  onChange={(e) => setMembershipFormData({...membershipFormData, name: e.target.value})}
                  className="mt-1"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Phone Number *</label>
                <Input
                  placeholder="10-digit mobile number"
                  value={membershipFormData.phone}
                  onChange={(e) => setMembershipFormData({...membershipFormData, phone: e.target.value})}
                  className="mt-1"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Age</label>
                  <Input
                    placeholder="Age"
                    type="number"
                    value={membershipFormData.age}
                    onChange={(e) => setMembershipFormData({...membershipFormData, age: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Gender</label>
                  <select
                    value={membershipFormData.gender}
                    onChange={(e) => setMembershipFormData({...membershipFormData, gender: e.target.value})}
                    className="mt-1 w-full h-10 rounded-md border border-gray-200 px-3"
                  >
                    <option value="">Select</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700">Address (Optional)</label>
                <Input
                  placeholder="Your address"
                  value={membershipFormData.address}
                  onChange={(e) => setMembershipFormData({...membershipFormData, address: e.target.value})}
                  className="mt-1"
                />
              </div>
            </div>

            <Button
              onClick={submitMembershipForm}
              className={`w-full bg-gradient-to-r ${colors.primary} text-white py-3 rounded-xl`}
            >
              <Check className="w-5 h-5 mr-2" />
              Activate Membership
            </Button>
          </CardContent>
        </Card>
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
          <Button 
            onClick={() => setShowPayment(true)}
            className={`bg-gradient-to-r ${colors.primary} text-white px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all`}
          >
            <Crown className="w-5 h-5 mr-2" />
            Get Premium - No Login Required
          </Button>
        </div>
        <div className="blur-sm pointer-events-none opacity-50">
          {children}
        </div>
      </div>

      {/* Enhanced Purchase Modal - NO LOGIN REQUIRED */}
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
                <Badge className="mt-2 bg-white/20 text-white">No Login Required</Badge>
              </div>
            </CardHeader>
            
            <CardContent className="p-5 space-y-5">
              {/* Email Input - Primary CTA */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Your Email Address
                </label>
                <Input
                  type="email"
                  placeholder="Enter your email to continue"
                  value={checkoutEmail}
                  onChange={(e) => setCheckoutEmail(e.target.value)}
                  className="text-lg py-3"
                />
                <p className="text-xs text-gray-500">We'll send your membership details here</p>
              </div>

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
                          ? `${colors.border} ${colors.light} ring-2 ring-offset-1` 
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
                          +{Math.round(tier.includes_free/30)}mo free access
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

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

              {/* Purchase Button */}
              <Button
                onClick={handlePurchase}
                disabled={processingPayment || !checkoutEmail}
                className={`w-full bg-gradient-to-r ${colors.primary} text-white py-4 rounded-xl shadow-lg hover:shadow-xl transition-all text-lg`}
              >
                {processingPayment ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Buy Now - ₹{getTierPrice(selectedTier)}
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

              <p className="text-center text-xs text-gray-400">
                Fill your details after payment to activate membership
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SubscriptionGate;

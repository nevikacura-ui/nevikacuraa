import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  Crown, Check, Users, Calendar, Gift, Shield, Heart, 
  Stethoscope, Pill, TestTube, ArrowRight, ChevronLeft,
  Star, Zap, Home, Phone, Clock, X, Mail, User, Sparkles, CreditCard
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const MembershipPlans = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState(null);
  const [familyPlans, setFamilyPlans] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState('quarterly');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutEmail, setCheckoutEmail] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [activeTab, setActiveTab] = useState('individual'); // 'individual' or 'family'

  // Check for success/cancel from Stripe redirect
  useEffect(() => {
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    
    if (success === 'true') {
      toast.success('🎉 Payment successful! Complete your profile to activate membership.');
      // Could show a form to complete profile here
    } else if (canceled === 'true') {
      toast.info('Payment was canceled. Feel free to try again.');
    }
  }, [searchParams]);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch(`${API}/api/subscriptions/membership-plans`);
      const data = await res.json();
      setPlans(data.plans);
      setFamilyPlans(data.family_plans);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
      toast.error('Failed to load membership plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (planId, isFamily = false) => {
    setSelectedPlan({ id: planId, isFamily });
    setShowCheckoutModal(true);
  };

  const handlePurchase = async () => {
    if (!checkoutEmail || !checkoutEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (!selectedPlan) {
      toast.error('Please select a plan');
      return;
    }

    setProcessingPayment(true);
    try {
      const res = await fetch(`${API}/api/subscriptions/membership/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_type: selectedPlan.id,
          billing_cycle: selectedBillingCycle,
          email: checkoutEmail.toLowerCase(),
          coupon_code: couponCode || null
        })
      });
      const data = await res.json();

      if (data.free_membership) {
        toast.success('🎉 Membership activated with coupon!');
        setShowCheckoutModal(false);
        // Redirect to profile completion
        navigate('/profile?membership=new');
      } else if (data.checkout_url) {
        localStorage.setItem('pending_membership_email', checkoutEmail);
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

  const getPlanIcon = (planId) => {
    switch (planId) {
      case 'basic': return Shield;
      case 'standard': return Heart;
      case 'premium': return Crown;
      case 'diagnostic_only': return TestTube;
      case 'diagnostic_pharmacy': return Pill;
      case 'complete_family': return Users;
      case 'portal_family': return Sparkles;
      default: return Star;
    }
  };

  const getPlanColor = (planId) => {
    switch (planId) {
      case 'basic': return 'from-slate-500 to-slate-600';
      case 'standard': return 'from-blue-500 to-indigo-600';
      case 'premium': return 'from-amber-500 to-orange-600';
      case 'diagnostic_only': return 'from-teal-500 to-cyan-600';
      case 'diagnostic_pharmacy': return 'from-purple-500 to-violet-600';
      case 'complete_family': return 'from-pink-500 to-rose-600';
      case 'portal_family': return 'from-emerald-500 to-green-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white" data-testid="membership-plans-page">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="font-medium">Back</span>
          </button>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Crown className="w-6 h-6 text-amber-500" />
            Membership Plans
          </h1>
          <div className="w-20"></div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 text-white py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="bg-white/20 text-white mb-4">All-in-One Healthcare</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Comprehensive Membership Plans
          </h2>
          <p className="text-lg text-white/90 max-w-2xl mx-auto">
            Get unlimited consultations, pharmacy discounts, diagnostic benefits, and access to all health portals - all in one membership.
          </p>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex justify-center mb-8">
          <div className="bg-slate-100 rounded-xl p-1 flex gap-1">
            <button
              onClick={() => setActiveTab('individual')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'individual'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
              data-testid="tab-individual"
            >
              <User className="w-4 h-4 inline mr-2" />
              Individual Plans
            </button>
            <button
              onClick={() => setActiveTab('family')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'family'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
              data-testid="tab-family"
            >
              <Users className="w-4 h-4 inline mr-2" />
              Family Plans
            </button>
          </div>
        </div>

        {/* Individual Plans */}
        {activeTab === 'individual' && plans && (
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {Object.entries(plans).map(([planId, plan]) => {
              const Icon = getPlanIcon(planId);
              const colorClass = getPlanColor(planId);
              const isPopular = plan.quarterly?.popular || plan.yearly?.best_value;
              
              return (
                <Card 
                  key={planId} 
                  className={`relative overflow-hidden transition-all hover:shadow-xl ${
                    isPopular ? 'ring-2 ring-amber-500 ring-offset-2' : ''
                  }`}
                  data-testid={`plan-card-${planId}`}
                >
                  {isPopular && (
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-amber-500 text-white">
                        <Star className="w-3 h-3 mr-1" />
                        {plan.yearly?.best_value ? 'Best Value' : 'Popular'}
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className={`bg-gradient-to-r ${colorClass} text-white pb-8`}>
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription className="text-white/80">
                      {plan.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pt-6 pb-8 space-y-6">
                    {/* Pricing */}
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-slate-800">
                          ₹{plan.quarterly?.price || plan.monthly?.price}
                        </span>
                        <span className="text-slate-500">/quarter</span>
                      </div>
                      {plan.quarterly?.savings && (
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                          Save ₹{plan.quarterly.savings}
                        </Badge>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="space-y-3">
                      {plan.features?.slice(0, 5).map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                          <Check className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <Button
                      onClick={() => handleSelectPlan(planId, false)}
                      className={`w-full bg-gradient-to-r ${colorClass} text-white py-6 rounded-xl shadow-lg hover:shadow-xl transition-all`}
                      data-testid={`select-plan-${planId}`}
                    >
                      Get Started
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Family Plans */}
        {activeTab === 'family' && familyPlans && (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {Object.entries(familyPlans).map(([planId, plan]) => {
              const Icon = getPlanIcon(planId);
              const colorClass = getPlanColor(planId);
              const isPopular = plan.quarterly?.popular || plan.yearly?.best_value;
              
              return (
                <Card 
                  key={planId} 
                  className={`relative overflow-hidden transition-all hover:shadow-xl ${
                    isPopular ? 'ring-2 ring-pink-500 ring-offset-2' : ''
                  }`}
                  data-testid={`family-plan-card-${planId}`}
                >
                  {isPopular && (
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-pink-500 text-white text-xs">
                        {plan.yearly?.best_value ? 'Best Value' : 'Popular'}
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className={`bg-gradient-to-r ${colorClass} text-white pb-6`}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <Badge className="bg-white/20 text-white">
                        <Users className="w-3 h-3 mr-1" />
                        {plan.members || 4} Members
                      </Badge>
                    </div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription className="text-white/80 text-sm">
                      {plan.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pt-4 pb-6 space-y-4">
                    {/* Pricing */}
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-slate-800">
                          ₹{plan.quarterly?.price || plan.monthly?.price}
                        </span>
                        <span className="text-sm text-slate-500">/quarter</span>
                      </div>
                      {plan.quarterly?.savings && (
                        <p className="text-xs text-green-600">Save ₹{plan.quarterly.savings}</p>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="space-y-2">
                      {plan.features?.slice(0, 4).map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                          <Check className="w-4 h-4 text-teal-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <Button
                      onClick={() => handleSelectPlan(planId, true)}
                      className={`w-full bg-gradient-to-r ${colorClass} text-white rounded-xl`}
                      data-testid={`select-family-plan-${planId}`}
                    >
                      Select Plan
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Benefits Section */}
        <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-3xl p-8 mb-12">
          <h3 className="text-2xl font-bold text-slate-800 mb-6 text-center">
            Why Choose Nevika Cura Membership?
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Stethoscope, title: 'Expert Doctors', desc: 'Access to 100+ specialists' },
              { icon: Pill, title: 'Medicine Discounts', desc: 'Up to 20% off on pharmacy' },
              { icon: TestTube, title: 'Lab Discounts', desc: 'Up to 30% off on tests' },
              { icon: Home, title: 'Home Services', desc: 'Doctor visits & sample collection' }
            ].map((benefit, idx) => (
              <div key={idx} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-white shadow-md flex items-center justify-center mx-auto mb-3">
                  <benefit.icon className="w-7 h-7 text-teal-600" />
                </div>
                <h4 className="font-semibold text-slate-800">{benefit.title}</h4>
                <p className="text-sm text-slate-600">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mb-12">
          <h3 className="text-2xl font-bold text-slate-800 mb-6 text-center">
            Frequently Asked Questions
          </h3>
          <div className="space-y-4">
            {[
              { q: 'Can I cancel my membership anytime?', a: 'Yes, you can cancel anytime. Your benefits will continue until the end of the billing period.' },
              { q: 'How do I add family members?', a: 'After purchasing a family plan, you can add members from your profile page.' },
              { q: 'Are the discounts applicable on all medicines?', a: 'Yes, discounts apply to all medicines ordered through Orange Pharmacy.' },
              { q: 'Can I upgrade my plan later?', a: 'Yes, you can upgrade anytime. The price difference will be adjusted prorated.' }
            ].map((faq, idx) => (
              <div key={idx} className="bg-white rounded-xl p-4 border border-slate-200">
                <h4 className="font-semibold text-slate-800 mb-2">{faq.q}</h4>
                <p className="text-sm text-slate-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckoutModal && selectedPlan && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white rounded-2xl shadow-2xl animate-in fade-in zoom-in">
            <CardHeader className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-t-2xl relative">
              <button 
                onClick={() => setShowCheckoutModal(false)}
                className="absolute right-4 top-4 text-white/80 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-6 h-6" />
                Complete Your Purchase
              </CardTitle>
              <CardDescription className="text-white/80">
                {selectedPlan.isFamily ? 'Family Plan' : 'Individual Plan'} - No login required
              </CardDescription>
            </CardHeader>
            
            <CardContent className="p-6 space-y-5">
              {/* Selected Plan Summary */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-slate-800">
                      {selectedPlan.isFamily 
                        ? familyPlans?.[selectedPlan.id]?.name 
                        : plans?.[selectedPlan.id]?.name}
                    </h4>
                    <p className="text-sm text-slate-500">
                      {selectedPlan.isFamily 
                        ? familyPlans?.[selectedPlan.id]?.description 
                        : plans?.[selectedPlan.id]?.description}
                    </p>
                  </div>
                  <Badge className="bg-teal-100 text-teal-700">
                    {selectedBillingCycle}
                  </Badge>
                </div>
              </div>

              {/* Billing Cycle Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Billing Cycle</label>
                <div className="grid grid-cols-3 gap-2">
                  {['monthly', 'quarterly', 'yearly'].map((cycle) => {
                    const planData = selectedPlan.isFamily 
                      ? familyPlans?.[selectedPlan.id] 
                      : plans?.[selectedPlan.id];
                    const cycleData = planData?.[cycle];
                    
                    if (!cycleData) return null;
                    
                    return (
                      <button
                        key={cycle}
                        onClick={() => setSelectedBillingCycle(cycle)}
                        className={`p-3 rounded-xl border-2 text-center transition-all ${
                          selectedBillingCycle === cycle
                            ? 'border-teal-500 bg-teal-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="font-bold text-lg">₹{cycleData.price}</div>
                        <div className="text-xs text-slate-500 capitalize">{cycle}</div>
                        {cycleData.savings && (
                          <div className="text-[10px] text-green-600">
                            Save ₹{cycleData.savings}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Email Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={checkoutEmail}
                  onChange={(e) => setCheckoutEmail(e.target.value)}
                  className="text-lg"
                />
                <p className="text-xs text-slate-500">Membership details will be sent here</p>
              </div>

              {/* Coupon Code */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Gift className="w-4 h-4" />
                  Coupon Code (Optional)
                </label>
                <Input
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                />
              </div>

              {/* Purchase Button */}
              <Button
                onClick={handlePurchase}
                disabled={processingPayment || !checkoutEmail}
                className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 text-white py-6 rounded-xl shadow-lg"
                data-testid="checkout-button"
              >
                {processingPayment ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Proceed to Payment
                  </span>
                )}
              </Button>

              {/* Trust badges */}
              <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Secure Payment
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

export default MembershipPlans;

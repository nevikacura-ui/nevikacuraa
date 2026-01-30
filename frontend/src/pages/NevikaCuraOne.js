import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Crown, Star, Sparkles, Check, ArrowLeft, Loader2,
  Stethoscope, TestTube, Pill, Heart, Home, Calendar,
  ChevronRight, Shield, Gift
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';

const API = process.env.REACT_APP_BACKEND_URL || '';

/**
 * Nevika Cura ONE - Premium Membership Page
 * "One Membership. Complete Care."
 */
const NevikaCuraOne = () => {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState('half-yearly');
  const [email, setEmail] = useState('');
  const [processing, setProcessing] = useState(false);

  const benefits = [
    { icon: Star, text: 'Access to All 12 Health Portals', color: 'text-amber-500', bg: 'bg-amber-50' },
    { icon: Pill, text: '25% Discount on Pharmacy', color: 'text-orange-500', bg: 'bg-orange-50' },
    { icon: TestTube, text: '30% Discount on Lab Tests', color: 'text-cyan-500', bg: 'bg-cyan-50' },
    { icon: Calendar, text: 'Priority Booking at Clinics', color: 'text-purple-500', bg: 'bg-purple-50' },
    { icon: Home, text: 'Free Home Sample Collection', color: 'text-green-500', bg: 'bg-green-50' },
  ];

  const pricing = [
    { id: 'monthly', duration: 'Monthly', price: 999, perMonth: 999 },
    { id: 'half-yearly', duration: 'Half-Yearly', price: 5499, perMonth: 917, savings: 495, popular: true },
    { id: 'annual', duration: 'Annual', price: 9999, perMonth: 833, savings: 1989, bestValue: true },
  ];

  const portals = [
    { name: 'Evara', desc: 'PCOS Care', color: 'bg-rose-100 text-rose-700' },
    { name: 'Glydex', desc: 'Diabetes', color: 'bg-emerald-100 text-emerald-700' },
    { name: 'Corvia', desc: 'Heart Health', color: 'bg-red-100 text-red-700' },
    { name: 'Serena', desc: 'Mental Wellness', color: 'bg-indigo-100 text-indigo-700' },
    { name: 'Thrive360', desc: 'Lifestyle', color: 'bg-purple-100 text-purple-700' },
    { name: 'Alyne', desc: 'Kids Health', color: 'bg-blue-100 text-blue-700' },
    { name: 'Aanya', desc: 'Newborn', color: 'bg-pink-100 text-pink-700' },
    { name: 'Senova', desc: 'Fertility', color: 'bg-rose-100 text-rose-700' },
    { name: 'Reneu', desc: 'Senior Care', color: 'bg-teal-100 text-teal-700' },
    { name: 'DiaGyn', desc: 'Clinic', color: 'bg-cyan-100 text-cyan-700' },
    { name: 'Proton', desc: 'Lab Tests', color: 'bg-sky-100 text-sky-700' },
    { name: 'Orange', desc: 'Pharmacy', color: 'bg-orange-100 text-orange-700' },
  ];

  const handlePayment = async () => {
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email address');
      return;
    }

    setProcessing(true);
    try {
      const billingCycle = selectedPlan === 'monthly' ? 'monthly' 
        : selectedPlan === 'half-yearly' ? 'quarterly' 
        : 'yearly';

      const res = await fetch(`${API}/api/subscriptions/membership/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_type: 'premium',
          billing_cycle: billingCycle,
          email: email.toLowerCase()
        })
      });
      const data = await res.json();

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        alert(data.detail || 'Failed to create checkout');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const selectedPricing = pricing.find(p => p.id === selectedPlan);

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
        <div className="flex items-center gap-3 p-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Nevika Cura ONE</h1>
              <p className="text-xs text-white/80">One Membership. Complete Care.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        
        {/* Hero Section */}
        <div className="text-center">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Premium Membership
          </h2>
          <p className="text-slate-600">Get complete healthcare access with one simple plan</p>
        </div>

        {/* Benefits */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Member Benefits
            </h3>
            <div className="space-y-3">
              {benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${benefit.bg} flex items-center justify-center`}>
                    <benefit.icon className={`w-5 h-5 ${benefit.color}`} />
                  </div>
                  <span className="text-slate-700">{benefit.text}</span>
                  <Check className="w-5 h-5 text-green-500 ml-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Portals Grid */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-purple-500" />
              Access All 12 Portals
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {portals.map((portal, idx) => (
                <div 
                  key={idx} 
                  className={`p-2 rounded-xl text-center ${portal.color}`}
                >
                  <p className="font-semibold text-sm">{portal.name}</p>
                  <p className="text-[10px] opacity-80">{portal.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Crown className="w-5 h-5 text-orange-500" />
              Choose Your Plan
            </h3>
            <div className="space-y-3">
              {pricing.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                    selectedPlan === plan.id
                      ? 'border-amber-500 bg-gradient-to-r from-amber-50 to-orange-50 shadow-md'
                      : 'border-slate-200 hover:border-amber-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{plan.duration}</span>
                        {plan.popular && (
                          <span className="px-2 py-0.5 bg-purple-500 text-white text-[10px] font-bold rounded-full">
                            POPULAR
                          </span>
                        )}
                        {plan.bestValue && (
                          <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold rounded-full">
                            BEST VALUE
                          </span>
                        )}
                      </div>
                      {plan.savings && (
                        <p className="text-xs text-green-600 mt-1">Save ₹{plan.savings.toLocaleString()}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-800">₹{plan.price.toLocaleString()}</p>
                      <p className="text-xs text-slate-500">₹{plan.perMonth}/month</p>
                    </div>
                  </div>
                  
                  {/* Selection indicator */}
                  <div className={`mt-3 flex items-center justify-center gap-2 py-2 rounded-xl transition-all ${
                    selectedPlan === plan.id 
                      ? 'bg-amber-500 text-white' 
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {selectedPlan === plan.id ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span className="text-sm font-medium">Selected</span>
                      </>
                    ) : (
                      <span className="text-sm">Select this plan</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Email & Payment */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="p-5 space-y-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-500" />
              Complete Your Purchase
            </h3>
            
            <div>
              <label className="text-sm text-slate-600 mb-1 block">Email Address</label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white border-slate-200 focus:border-amber-500 focus:ring-amber-500"
              />
              <p className="text-xs text-slate-500 mt-1">Receipt will be sent to this email</p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-amber-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-600">Plan</span>
                <span className="font-semibold text-slate-800">{selectedPricing?.duration}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-600">Amount</span>
                <span className="font-semibold text-slate-800">₹{selectedPricing?.price.toLocaleString()}</span>
              </div>
              {selectedPricing?.savings && (
                <div className="flex justify-between items-center text-green-600">
                  <span>You save</span>
                  <span className="font-semibold">₹{selectedPricing.savings.toLocaleString()}</span>
                </div>
              )}
            </div>

            <Button
              onClick={handlePayment}
              disabled={processing || !email}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white py-6 rounded-2xl text-lg font-bold shadow-lg disabled:opacity-50"
            >
              {processing ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</>
              ) : (
                <><Crown className="w-5 h-5 mr-2" /> Pay ₹{selectedPricing?.price.toLocaleString()}</>
              )}
            </Button>

            <p className="text-xs text-center text-slate-500">
              Secure payment powered by Stripe. Cancel anytime.
            </p>
          </CardContent>
        </Card>

        {/* Trust Badges */}
        <div className="flex justify-center gap-6 py-4">
          <div className="text-center">
            <Shield className="w-8 h-8 text-green-500 mx-auto mb-1" />
            <p className="text-xs text-slate-600">Secure Payment</p>
          </div>
          <div className="text-center">
            <Gift className="w-8 h-8 text-purple-500 mx-auto mb-1" />
            <p className="text-xs text-slate-600">Instant Access</p>
          </div>
          <div className="text-center">
            <Heart className="w-8 h-8 text-rose-500 mx-auto mb-1" />
            <p className="text-xs text-slate-600">24/7 Support</p>
          </div>
        </div>

      </div>

      <BottomNav />
    </div>
  );
};

export default NevikaCuraOne;

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Crown, Check, Star, Sparkles, ChevronRight, X, 
  Stethoscope, TestTube, Pill, Heart, Home, Calendar
} from 'lucide-react';

/**
 * Nevika Cura ONE - Premium Membership Banner
 * "One Membership. Complete Care."
 * 
 * Benefits:
 * - Access to all 12 portals
 * - 25% off on Pharmacy
 * - 30% off on Lab Tests
 * - Priority booking at both clinics
 * - Free home collection
 * 
 * Pricing:
 * - Monthly: ₹999
 * - Half-yearly: ₹5,499
 * - Annual: ₹9,999
 */
const NevikaCuraOneBanner = ({ variant = 'hero' }) => {
  const navigate = useNavigate();
  const [showDetails, setShowDetails] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState('half-yearly');
  const [checkoutEmail, setCheckoutEmail] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showEmailInput, setShowEmailInput] = useState(false);

  const API = process.env.REACT_APP_BACKEND_URL || '';

  const benefits = [
    { icon: Star, text: 'All 12 Portals Access', color: 'text-amber-500' },
    { icon: Pill, text: '25% off on Pharmacy', color: 'text-orange-500' },
    { icon: TestTube, text: '30% off on Lab Tests', color: 'text-cyan-500' },
    { icon: Calendar, text: 'Priority Booking', color: 'text-purple-500' },
    { icon: Home, text: 'Free Home Collection', color: 'text-green-500' },
  ];

  const pricing = [
    { duration: 'Monthly', price: 999, perMonth: 999, popular: false },
    { duration: 'Half-Yearly', price: 5499, perMonth: 917, popular: true, savings: '₹495' },
    { duration: 'Annual', price: 9999, perMonth: 833, popular: false, savings: '₹1,989', bestValue: true },
  ];

  const portals = [
    'Evara', 'Glydex', 'Corvia', 'Serena', 'Thrive360', 'Alyne',
    'Aanya', 'Senova', 'Reneu', 'DiaGyn', 'Proton', 'Orange Pharmacy'
  ];

  // Hero Banner (Option A) - Large prominent banner at top
  if (variant === 'hero') {
    return (
      <>
        <Card 
          className="relative overflow-hidden border-0 shadow-xl cursor-pointer group"
          onClick={() => setShowDetails(true)}
          data-testid="nevika-cura-one-hero"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500"></div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIwOS0xLjc5MS00LTQtNHMtNCAxLjc5MS00IDQgMS43OTEgNCA0IDQgNC0xLjc5MSA0LTR6bTAtMThjMC0yLjIwOS0xLjc5MS00LTQtNHMtNCAxLjc5MS00IDQgMS43OTEgNCA0IDQgNC0xLjc5MSA0LTR6bTE4IDE4YzAtMi4yMDktMS43OTEtNC00LTRzLTQgMS43OTEtNCA0IDEuNzkxIDQgNCA0IDQtMS43OTEgNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
          
          <CardContent className="relative p-5 md:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
                      Nevika Cura ONE
                    </h2>
                    <p className="text-white/80 text-xs md:text-sm">One Membership. Complete Care.</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-3">
                  {benefits.slice(0, 3).map((benefit, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-white/20 backdrop-blur rounded-full text-white text-xs">
                      <benefit.icon className="w-3 h-3" />
                      {benefit.text}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="text-right ml-4">
                <div className="bg-white/20 backdrop-blur rounded-2xl p-3 text-center">
                  <p className="text-white/70 text-xs">Starting at</p>
                  <p className="text-2xl md:text-3xl font-bold text-white">₹999</p>
                  <p className="text-white/70 text-xs">/month</p>
                </div>
                <Button 
                  className="mt-2 bg-white text-orange-600 hover:bg-orange-50 rounded-full text-sm font-semibold shadow-lg group-hover:scale-105 transition-transform"
                  onClick={(e) => { e.stopPropagation(); setShowDetails(true); }}
                >
                  View Plans <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details Modal */}
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                  <Crown className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Nevika Cura ONE</h2>
                  <p className="text-sm text-slate-500 font-normal">One Membership. Complete Care.</p>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5 mt-4">
              {/* Benefits */}
              <div>
                <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Member Benefits
                </h3>
                <div className="space-y-2">
                  {benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50">
                      <div className={`w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm`}>
                        <benefit.icon className={`w-4 h-4 ${benefit.color}`} />
                      </div>
                      <span className="text-sm text-slate-700">{benefit.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Portals Access */}
              <div>
                <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Star className="w-4 h-4 text-purple-500" />
                  Access All 12 Portals
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {portals.map((portal, idx) => (
                    <span key={idx} className="px-2 py-1 bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 text-xs rounded-full border border-purple-100">
                      {portal}
                    </span>
                  ))}
                </div>
              </div>

              {/* Pricing */}
              <div>
                <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-orange-500" />
                  Choose Your Plan
                </h3>
                <div className="space-y-2">
                  {pricing.map((plan, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Store selected plan and show email input
                        setSelectedDuration(plan.duration.toLowerCase());
                      }}
                      className={`w-full p-4 rounded-xl border-2 text-left transition-all hover:shadow-md ${
                        selectedDuration === plan.duration.toLowerCase()
                          ? 'border-amber-500 bg-gradient-to-r from-amber-50 to-orange-50 ring-2 ring-amber-300'
                          : plan.bestValue 
                            ? 'border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50' 
                            : plan.popular 
                              ? 'border-purple-300 bg-purple-50' 
                              : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800">{plan.duration}</span>
                            {plan.popular && (
                              <span className="px-2 py-0.5 bg-purple-500 text-white text-[10px] font-medium rounded-full">POPULAR</span>
                            )}
                            {plan.bestValue && (
                              <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-medium rounded-full">BEST VALUE</span>
                            )}
                          </div>
                          {plan.savings && (
                            <p className="text-xs text-green-600 mt-0.5">Save {plan.savings}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-slate-800">₹{plan.price.toLocaleString()}</p>
                          <p className="text-xs text-slate-500">₹{plan.perMonth}/month</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Email Input Section */}
              {selectedDuration && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-sm font-medium text-slate-700 mb-2">Enter your email to continue</p>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="your@email.com"
                      value={checkoutEmail}
                      onChange={(e) => setCheckoutEmail(e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* CTA */}
              <Button 
                onClick={async () => {
                  if (!checkoutEmail || !checkoutEmail.includes('@')) {
                    alert('Please enter a valid email address');
                    return;
                  }
                  
                  setProcessingPayment(true);
                  try {
                    const billingCycle = selectedDuration === 'monthly' ? 'monthly' 
                      : selectedDuration === 'half-yearly' ? 'quarterly' 
                      : 'yearly';
                    
                    const res = await fetch(`${API}/api/subscriptions/membership/purchase`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        plan_type: 'premium',
                        billing_cycle: billingCycle,
                        email: checkoutEmail.toLowerCase()
                      })
                    });
                    const data = await res.json();
                    
                    if (data.checkout_url) {
                      window.location.href = data.checkout_url;
                    } else if (data.free_membership) {
                      alert('Membership activated!');
                      setShowDetails(false);
                    } else {
                      alert(data.detail || 'Failed to create checkout');
                    }
                  } catch (error) {
                    console.error('Payment error:', error);
                    alert('Payment processing failed. Please try again.');
                  } finally {
                    setProcessingPayment(false);
                  }
                }}
                disabled={processingPayment || !selectedDuration || !checkoutEmail}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white py-6 rounded-xl text-lg font-semibold shadow-lg disabled:opacity-50"
              >
                {processingPayment ? (
                  <>Processing...</>
                ) : (
                  <><Crown className="w-5 h-5 mr-2" />
                  Get Nevika Cura ONE</>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Compact Card (Option D) - For Quick Actions grid
  return (
    <button
      onClick={() => setShowDetails(true)}
      className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-100 via-orange-50 to-rose-50 border border-amber-200/50 p-3 flex flex-col items-center justify-center min-h-[100px] transition-all duration-300 hover:scale-105 hover:shadow-lg group"
      data-testid="quick-action-nevika-one"
    >
      {/* Premium Badge */}
      <div className="absolute top-1 right-1">
        <span className="px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[8px] font-bold rounded-full">
          NEW
        </span>
      </div>
      
      {/* Icon */}
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-2 shadow-md group-hover:scale-110 transition-transform">
        <Crown className="w-5 h-5 text-white" />
      </div>
      
      {/* Text */}
      <span className="text-[10px] font-medium text-slate-600 leading-tight">Nevika Cura</span>
      <span className="text-xs font-bold text-slate-800">ONE</span>
      
      {/* Details Modal - Reuse from above */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                <Crown className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>Nevika Cura ONE</h2>
                <p className="text-sm text-slate-500 font-normal">One Membership. Complete Care.</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 mt-4">
            {/* Benefits */}
            <div>
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Member Benefits
              </h3>
              <div className="space-y-2">
                {benefits.map((benefit, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50">
                    <div className={`w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm`}>
                      <benefit.icon className={`w-4 h-4 ${benefit.color}`} />
                    </div>
                    <span className="text-sm text-slate-700">{benefit.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Portals Access */}
            <div>
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-purple-500" />
                Access All 12 Portals
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {portals.map((portal, idx) => (
                  <span key={idx} className="px-2 py-1 bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 text-xs rounded-full border border-purple-100">
                    {portal}
                  </span>
                ))}
              </div>
            </div>

            {/* Pricing */}
            <div>
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Crown className="w-4 h-4 text-orange-500" />
                Choose Your Plan
              </h3>
              <div className="space-y-2">
                {pricing.map((plan, idx) => (
                  <div
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDuration(plan.duration.toLowerCase());
                    }}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all hover:shadow-md cursor-pointer ${
                      selectedDuration === plan.duration.toLowerCase()
                        ? 'border-amber-500 bg-gradient-to-r from-amber-50 to-orange-50 ring-2 ring-amber-300'
                        : plan.bestValue 
                          ? 'border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50' 
                          : plan.popular 
                            ? 'border-purple-300 bg-purple-50' 
                            : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">{plan.duration}</span>
                          {plan.popular && (
                            <span className="px-2 py-0.5 bg-purple-500 text-white text-[10px] font-medium rounded-full">POPULAR</span>
                          )}
                          {plan.bestValue && (
                            <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-medium rounded-full">BEST VALUE</span>
                          )}
                        </div>
                        {plan.savings && (
                          <p className="text-xs text-green-600 mt-0.5">Save {plan.savings}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-slate-800">₹{plan.price.toLocaleString()}</p>
                        <p className="text-xs text-slate-500">₹{plan.perMonth}/month</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Email Input Section */}
            {selectedDuration && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-sm font-medium text-slate-700 mb-2">Enter your email to continue</p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={checkoutEmail}
                    onChange={(e) => setCheckoutEmail(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              </div>
            )}

            {/* CTA */}
            <Button 
              onClick={async (e) => {
                e.stopPropagation();
                if (!checkoutEmail || !checkoutEmail.includes('@')) {
                  alert('Please enter a valid email address');
                  return;
                }
                
                setProcessingPayment(true);
                try {
                  const billingCycle = selectedDuration === 'monthly' ? 'monthly' 
                    : selectedDuration === 'half-yearly' ? 'quarterly' 
                    : 'yearly';
                  
                  const res = await fetch(`${API}/api/subscriptions/membership/purchase`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      plan_type: 'premium',
                      billing_cycle: billingCycle,
                      email: checkoutEmail.toLowerCase()
                    })
                  });
                  const data = await res.json();
                  
                  if (data.checkout_url) {
                    window.location.href = data.checkout_url;
                  } else if (data.free_membership) {
                    alert('Membership activated!');
                    setShowDetails(false);
                  } else {
                    alert(data.detail || 'Failed to create checkout');
                  }
                } catch (error) {
                  console.error('Payment error:', error);
                  alert('Payment processing failed. Please try again.');
                } finally {
                  setProcessingPayment(false);
                }
              }}
              disabled={processingPayment || !selectedDuration || !checkoutEmail}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white py-6 rounded-xl text-lg font-semibold shadow-lg disabled:opacity-50"
            >
              {processingPayment ? (
                <>Processing...</>
              ) : (
                <><Crown className="w-5 h-5 mr-2" /> Get Nevika Cura ONE</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </button>
  );
};

export default NevikaCuraOneBanner;

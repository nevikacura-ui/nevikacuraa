import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Crown, Check, Loader2, Ticket } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const PLANS = [
  { id: 'monthly', label: 'Monthly', price: 99, duration: '1 Month', per: '/mo', save: null },
  { id: 'quarterly', label: 'Quarterly', price: 249, duration: '3 Months', per: '/qtr', save: '16%' },
  { id: 'yearly', label: 'Yearly', price: 799, duration: '12 Months', per: '/yr', save: '33%' },
];

const PortalCheckout = ({ open, onOpenChange, portalName, accentGradient }) => {
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [name, setName] = useState('');
  const [email, setEmail] = useState(localStorage.getItem('userEmail') || '');
  const [phone, setPhone] = useState(localStorage.getItem('userPhone') || '');
  const [processing, setProcessing] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponResult, setCouponResult] = useState(null);
  const [showCoupon, setShowCoupon] = useState(false);

  const plan = PLANS.find(p => p.id === selectedPlan);
  const planType = portalName?.toLowerCase() === 'glydex' ? 'glydex' : portalName?.toLowerCase() === 'evara' ? 'evara' : 'glydex';

  const validateCoupon = async () => {
    if (!couponCode.trim()) { toast.error('Enter a coupon code'); return; }
    setValidatingCoupon(true);
    try {
      const res = await fetch(`${API}/api/subscriptions/validate-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coupon_code: couponCode.trim().toUpperCase(), plan_type: planType, email, device_id: navigator.userAgent.slice(0, 50) }),
      });
      const data = await res.json();
      if (data.valid) {
        setCouponResult(data);
        toast.success(`Coupon applied! ${data.discount_percent}% off${data.duration_days ? ` — ${data.duration_days / 30} months free` : ''}`);
      } else {
        setCouponResult(null);
        toast.error(data.message || 'Invalid coupon');
      }
    } catch { toast.error('Failed to validate coupon'); setCouponResult(null); }
    setValidatingCoupon(false);
  };

  const redeemCoupon = async () => {
    if (!email.includes('@')) { toast.error('Please enter a valid email'); return; }
    if (!name.trim()) { toast.error('Please enter your name'); return; }
    setProcessing(true);
    try {
      const patientId = localStorage.getItem('patientId') || `PAT_${Date.now()}`;
      const res = await fetch(`${API}/api/subscriptions/redeem-coupon`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coupon_code: couponCode.trim().toUpperCase(),
          plan_type: planType,
          patient_id: patientId,
          patient_name: name.trim(),
          patient_email: email.toLowerCase().trim(),
          patient_phone: phone || '',
          device_id: navigator.userAgent.slice(0, 50),
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Subscription activated! Enjoy 6 months free.');
        onOpenChange(false);
        window.location.reload();
      } else {
        toast.error(data.message || 'Redemption failed');
      }
    } catch { toast.error('Redemption failed'); }
    setProcessing(false);
  };

  const handleCheckout = async () => {
    if (!name.trim()) { toast.error('Please enter your name'); return; }
    if (!email.includes('@')) { toast.error('Please enter a valid email'); return; }

    setProcessing(true);
    try {
      const res = await fetch(`${API}/api/payments/cashfree/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: `MEM_${selectedPlan.toUpperCase()}_${Date.now()}`,
          customer_name: name.trim(),
          customer_email: email.toLowerCase().trim(),
          customer_phone: phone || '9999999999',
          amount: plan.price,
          product_type: 'membership',
          product_id: `NEVIKA_${portalName.toUpperCase()}_${selectedPlan.toUpperCase()}`,
          membership_plan: selectedPlan,
          return_url: `${window.location.origin}/one?order_id=`,
        }),
      });
      const data = await res.json();
      if (data.success && data.payment_session_id) {
        toast.success('Redirecting to payment...');
        if (window.Cashfree) {
          const cashfree = window.Cashfree({ mode: 'production' });
          cashfree.checkout({ paymentSessionId: data.payment_session_id, redirectTarget: '_self' });
        }
      } else {
        toast.error(data.detail || 'Something went wrong');
      }
    } catch {
      toast.error('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 rounded-2xl border-0 overflow-hidden" data-testid="portal-checkout-modal">
        <div className={`bg-gradient-to-r ${accentGradient} p-5 text-white`}>
          <DialogHeader>
            <DialogTitle className="text-xl text-white flex items-center gap-2">
              <Crown className="w-6 h-6" /> Subscribe to {portalName}
            </DialogTitle>
          </DialogHeader>
          <p className="text-white/80 text-sm mt-2">Unlock all premium features</p>
        </div>

        <div className="p-5 space-y-4">
          {/* Plan Selection */}
          <div className="grid grid-cols-3 gap-2">
            {PLANS.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPlan(p.id)}
                data-testid={`plan-${p.id}`}
                className={`relative p-3 rounded-xl text-center transition-all border-2 ${
                  selectedPlan === p.id
                    ? 'border-blue-500 bg-blue-50 shadow-md scale-105'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                {p.save && (
                  <Badge className="absolute -top-2 right-1 bg-emerald-500 text-white text-[9px] px-1.5 border-0">
                    Save {p.save}
                  </Badge>
                )}
                <p className="text-xs text-gray-500 font-medium">{p.label}</p>
                <p className="text-lg font-bold text-gray-800 mt-1">₹{p.price}</p>
                <p className="text-[10px] text-gray-400">{p.duration}</p>
                {selectedPlan === p.id && <Check className="w-4 h-4 text-blue-500 mx-auto mt-1" />}
              </button>
            ))}
          </div>

          {/* User Details */}
          <div className="space-y-3">
            <Input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="checkout-name"
            />
            <Input
              placeholder="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              data-testid="checkout-email"
            />
            <Input
              placeholder="Phone number (optional)"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              data-testid="checkout-phone"
            />
          </div>

          {/* Coupon Code Section */}
          <div className="border border-dashed border-gray-300 rounded-xl p-3">
            {!showCoupon ? (
              <button onClick={() => setShowCoupon(true)} className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors" data-testid="show-coupon-btn">
                <Ticket className="w-4 h-4" /> Have a coupon code?
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-600 flex items-center gap-1"><Ticket className="w-3 h-3" /> Redeem Coupon</p>
                <div className="flex gap-2">
                  <Input placeholder="Enter code" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} className="text-sm font-mono tracking-wider" data-testid="coupon-input" />
                  <Button onClick={validateCoupon} disabled={validatingCoupon} variant="outline" className="px-4 text-sm shrink-0" data-testid="apply-coupon-btn">
                    {validatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                  </Button>
                </div>
                {couponResult && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs text-emerald-700 font-medium">{couponResult.discount_percent}% off — {couponResult.duration_days ? `${couponResult.duration_days / 30} months free!` : 'Discount applied!'}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pay / Redeem Button */}
          {couponResult?.discount_percent === 100 ? (
            <Button
              onClick={redeemCoupon}
              disabled={processing}
              className={`w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold shadow-lg hover:shadow-xl`}
              data-testid="redeem-coupon-btn"
            >
              {processing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Activating...</>
              ) : (
                <><Crown className="w-4 h-4 mr-2" /> Activate Free Subscription</>
              )}
            </Button>
          ) : (
          <Button
            onClick={handleCheckout}
            disabled={processing}
            className={`w-full h-12 rounded-xl bg-gradient-to-r ${accentGradient} text-white font-semibold shadow-lg hover:shadow-xl`}
            data-testid="checkout-pay-btn"
          >
            {processing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
            ) : (
              <>Pay ₹{couponResult ? Math.round(plan?.price * (1 - couponResult.discount_percent / 100)) : plan?.price} — {plan?.label}</>
            )}
          </Button>
          )}

          <p className="text-center text-[10px] text-gray-400">Secured by Cashfree Payments</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PortalCheckout;

import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, CreditCard, Smartphone, Banknote, ChevronRight, Tag, X, Check } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || '';
const PRODUCTION_DOMAIN = process.env.REACT_APP_PRODUCTION_DOMAIN || 'https://nevikacura.com';

/**
 * Reusable Cashfree Payment Component
 * Used for Pharmacy, Lab Tests, and Appointments
 */
const CashfreeCheckout = ({
  open,
  onOpenChange,
  orderDetails,  // { type: 'pharmacy'|'lab_test'|'appointment', amount, productId, customerName, customerEmail, customerPhone }
  onPaymentSuccess,
  onPaymentCancel,
  allowCOD = true,  // Allow Cash on Delivery option
  allowCoupon = true,  // Allow discount coupon code
  returnPath = '/'  // Path to return after payment
}) => {
  const [processing, setProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(allowCOD ? 'cod' : 'online');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);

  const finalAmount = Math.max(0, orderDetails.amount - discountAmount);

  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }
    
    setValidatingCoupon(true);
    try {
      const res = await fetch(`${API}/api/coupons/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: couponCode.trim().toUpperCase(),
          amount: orderDetails.amount,
          type: orderDetails.type
        })
      });
      
      const data = await res.json();
      
      if (data.valid) {
        setAppliedCoupon({
          code: couponCode.trim().toUpperCase(),
          discount: data.discount,
          type: data.discount_type
        });
        setDiscountAmount(data.discount);
        toast.success(`Coupon applied! You save ₹${data.discount}`);
      } else {
        toast.error(data.message || 'Invalid coupon code');
      }
    } catch (error) {
      console.error('Coupon validation error:', error);
      toast.error('Failed to validate coupon');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponCode('');
  };

  const handleCashfreePayment = async () => {
    setProcessing(true);
    try {
      const res = await fetch(`${API}/api/payments/cashfree/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: `USER_${Date.now()}`,
          customer_name: orderDetails.customerName,
          customer_email: orderDetails.customerEmail || 'guest@nevikacura.com',
          customer_phone: orderDetails.customerPhone.replace(/\D/g, ''),
          amount: finalAmount,
          original_amount: orderDetails.amount,
          discount_amount: discountAmount,
          coupon_code: appliedCoupon?.code || null,
          product_type: orderDetails.type,
          product_id: orderDetails.productId || `${orderDetails.type.toUpperCase()}_${Date.now()}`,
          return_url: `${PRODUCTION_DOMAIN}${returnPath}?payment=success&order_id=`
        })
      });

      const data = await res.json();

      if (data.success && data.payment_session_id) {
        await loadCashfreeCheckout(data.payment_session_id, data.order_id);
      } else {
        toast.error(data.detail || data.message || 'Failed to create payment');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const loadCashfreeCheckout = useCallback(async (sessionId, orderId) => {
    try {
      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.async = true;

      script.onload = () => {
        const cashfree = window.Cashfree({
          mode: 'production'
        });

        cashfree.checkout({
          paymentSessionId: sessionId,
          redirectTarget: '_self'
        }).catch((error) => {
          console.error('Checkout error:', error);
          toast.error('Could not open payment page');
        });
      };

      script.onerror = () => {
        toast.error('Failed to load payment gateway');
      };

      document.body.appendChild(script);
    } catch (error) {
      console.error('Cashfree load error:', error);
      toast.error('Payment initialization failed');
    }
  }, []);

  const handleConfirm = () => {
    if (selectedMethod === 'online') {
      handleCashfreePayment();
    } else {
      // COD - just confirm the order
      onPaymentSuccess?.({ method: 'cod', orderId: null });
      onOpenChange(false);
    }
  };

  const paymentMethods = [
    ...(allowCOD ? [{
      id: 'cod',
      title: 'Cash on Delivery',
      subtitle: 'Pay when you receive',
      icon: Banknote,
      color: 'green'
    }] : []),
    {
      id: 'online',
      title: 'Pay Online',
      subtitle: 'UPI, Cards, NetBanking',
      icon: Smartphone,
      color: 'purple'
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-500" />
            Select Payment Method
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Order Summary */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-600">Order Type</span>
              <span className="font-medium capitalize">{orderDetails.type.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between items-center text-lg font-bold">
              <span className="text-slate-800">Total Amount</span>
              <span className="text-green-600">₹{orderDetails.amount?.toLocaleString()}</span>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                  selectedMethod === method.id
                    ? method.color === 'green' 
                      ? 'border-green-500 bg-green-50'
                      : 'border-purple-500 bg-purple-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    method.color === 'green' ? 'bg-green-500' : 'bg-purple-500'
                  }`}>
                    <method.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-slate-800">{method.title}</p>
                    <p className="text-sm text-slate-500">{method.subtitle}</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedMethod === method.id
                    ? method.color === 'green'
                      ? 'border-green-500 bg-green-500'
                      : 'border-purple-500 bg-purple-500'
                    : 'border-slate-300'
                }`}>
                  {selectedMethod === method.id && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Confirm Button */}
          <Button
            onClick={handleConfirm}
            disabled={processing}
            className={`w-full py-6 rounded-xl text-lg font-bold ${
              selectedMethod === 'online'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
                : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'
            }`}
          >
            {processing ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</>
            ) : selectedMethod === 'online' ? (
              <>Pay ₹{orderDetails.amount?.toLocaleString()} <ChevronRight className="w-5 h-5 ml-2" /></>
            ) : (
              <>Confirm Order (COD) <ChevronRight className="w-5 h-5 ml-2" /></>
            )}
          </Button>

          {selectedMethod === 'online' && (
            <p className="text-xs text-center text-slate-500">
              Secure payment powered by Cashfree
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CashfreeCheckout;

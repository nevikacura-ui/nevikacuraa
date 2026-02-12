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
  // Default to COD for prescription orders (amount = 0) or when COD is allowed
  const defaultMethod = orderDetails.amount <= 0 || allowCOD ? 'cod' : 'online';
  const [selectedMethod, setSelectedMethod] = useState(defaultMethod);
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
    // Prevent payment for zero amounts (prescription orders need pharmacist confirmation first)
    if (finalAmount <= 0) {
      toast.error('Order amount must be confirmed first. Please select Cash on Delivery or wait for pharmacist to confirm the bill.');
      return;
    }
    
    setProcessing(true);
    try {
      // Clean and validate phone number
      const cleanPhone = orderDetails.customerPhone?.replace(/\D/g, '').slice(-10);
      if (!cleanPhone || cleanPhone.length !== 10) {
        toast.error('Please enter a valid 10-digit phone number');
        setProcessing(false);
        return;
      }
      
      const res = await fetch(`${API}/api/payments/cashfree/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: `USER_${Date.now()}`,
          customer_name: orderDetails.customerName || 'Guest User',
          customer_email: orderDetails.customerEmail || 'guest@nevikacura.com',
          customer_phone: cleanPhone,
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
        // Better error messages based on response
        const errorMsg = data.detail?.[0]?.msg || data.detail || data.message || 'Failed to create payment order';
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed. Please check your connection and try again.');
    } finally {
      setProcessing(false);
    }
  };

  const loadCashfreeCheckout = useCallback(async (sessionId, orderId) => {
    try {
      // Check if script already exists
      const existingScript = document.querySelector('script[src*="cashfree"]');
      
      const initCheckout = () => {
        if (!window.Cashfree) {
          toast.error('Payment gateway not loaded');
          return;
        }
        
        try {
          const cashfree = window.Cashfree({
            mode: 'production'
          });

          cashfree.checkout({
            paymentSessionId: sessionId,
            redirectTarget: '_self'
          }).catch((error) => {
            console.error('Checkout error:', error);
            toast.error(error?.message || 'Could not open payment page');
          });
        } catch (err) {
          console.error('Cashfree init error:', err);
          toast.error('Payment gateway error');
        }
      };
      
      if (existingScript && window.Cashfree) {
        // Script already loaded, just init
        initCheckout();
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.async = true;

      script.onload = initCheckout;

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

  // Disable online payment if amount is 0 (prescription orders need pharmacist confirmation)
  const isOnlineDisabled = finalAmount <= 0;

  const paymentMethods = [
    ...(allowCOD ? [{
      id: 'cod',
      title: 'Cash on Delivery',
      subtitle: finalAmount <= 0 ? 'Pharmacist will confirm amount' : 'Pay when you receive',
      icon: Banknote,
      color: 'green',
      recommended: finalAmount <= 0
    }] : []),
    {
      id: 'online',
      title: 'Pay Online',
      subtitle: isOnlineDisabled ? 'Amount must be confirmed first' : 'UPI, Cards, NetBanking',
      icon: Smartphone,
      color: 'purple',
      disabled: isOnlineDisabled
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
            {orderDetails.amount > 0 ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-medium">₹{orderDetails.amount?.toLocaleString()}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between items-center text-green-600">
                    <span>Discount ({appliedCoupon?.code})</span>
                    <span>-₹{discountAmount?.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-lg font-bold mt-2 pt-2 border-t">
                  <span className="text-slate-800">Total Amount</span>
                  <span className="text-green-600">₹{finalAmount?.toLocaleString()}</span>
                </div>
              </>
            ) : (
              <div className="text-center py-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-amber-700 font-medium">
                  {orderDetails.type === 'pharmacy' ? 'Amount to be confirmed by pharmacist' : 'Amount to be confirmed by lab'}
                </p>
                <p className="text-sm text-amber-600 mt-1">You'll receive a call with the final bill</p>
              </div>
            )}
          </div>

          {/* Coupon Code Section */}
          {allowCoupon && (
            <div className="border border-slate-200 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium text-slate-700">Have a coupon?</span>
              </div>
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-2">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="font-medium text-green-700">{appliedCoupon.code}</span>
                    <span className="text-sm text-green-600">(-₹{discountAmount})</span>
                  </div>
                  <button onClick={removeCoupon} className="text-slate-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Enter coupon code"
                    className="flex-1 uppercase"
                    data-testid="coupon-input"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={validateCoupon}
                    disabled={validatingCoupon || !couponCode.trim()}
                    data-testid="apply-coupon-btn"
                  >
                    {validatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Payment Methods */}
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => !method.disabled && setSelectedMethod(method.id)}
                disabled={method.disabled}
                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                  method.disabled 
                    ? 'border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed'
                    : selectedMethod === method.id
                      ? method.color === 'green' 
                        ? 'border-green-500 bg-green-50'
                        : 'border-purple-500 bg-purple-50'
                      : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    method.disabled ? 'bg-slate-400' :
                    method.color === 'green' ? 'bg-green-500' : 'bg-purple-500'
                  }`}>
                    <method.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <p className={`font-semibold ${method.disabled ? 'text-slate-500' : 'text-slate-800'}`}>{method.title}</p>
                      {method.recommended && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Recommended</span>
                      )}
                    </div>
                    <p className={`text-sm ${method.disabled ? 'text-slate-400' : 'text-slate-500'}`}>{method.subtitle}</p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  method.disabled ? 'border-slate-300' :
                  selectedMethod === method.id
                    ? method.color === 'green'
                      ? 'border-green-500 bg-green-500'
                      : 'border-purple-500 bg-purple-500'
                    : 'border-slate-300'
                }`}>
                  {selectedMethod === method.id && !method.disabled && (
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
            ) : selectedMethod === 'online' && orderDetails.amount > 0 ? (
              <>Pay ₹{orderDetails.amount?.toLocaleString()} <ChevronRight className="w-5 h-5 ml-2" /></>
            ) : (
              <>Confirm Order <ChevronRight className="w-5 h-5 ml-2" /></>
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

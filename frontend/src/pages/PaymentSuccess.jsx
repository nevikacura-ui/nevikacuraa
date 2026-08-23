import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, ArrowRight, Phone, Home, RefreshCw, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { bookingConfirmed, errorPattern } from '@/utils/haptics';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, failed, error
  const [orderData, setOrderData] = useState(null);
  const [pollCount, setPollCount] = useState(0);
  const hasVerified = useRef(false);

  const orderId = searchParams.get('order_id');
  const sessionId = searchParams.get('session_id');
  const provider = searchParams.get('provider') || 'cashfree';
  const type = searchParams.get('type') || 'lab_test';

  useEffect(() => {
    if (!orderId && !sessionId) {
      setStatus('error');
      return;
    }
    if (hasVerified.current) return;
    hasVerified.current = true;
    
    if (provider === 'stripe' && sessionId) {
      verifyStripePayment();
    } else {
      verifyPayment();
    }
  }, [orderId, sessionId]);

  // Stripe payment verification with polling
  const verifyStripePayment = async (retry = 0) => {
    try {
      setStatus('verifying');
      const res = await fetch(`${API}/payments/stripe/status/${sessionId}`);
      if (!res.ok) throw new Error(`Stripe verify returned ${res.status}`);
      
      const data = await res.json();
      
      if (data.payment_status === 'paid') {
        setOrderData({ order_id: sessionId, amount: data.amount_total, currency: data.currency, ...data });
        setStatus('success');
        bookingConfirmed();
        // Track purchased items for Buy it Again
        try {
          const cart = JSON.parse(localStorage.getItem('pharmacyCart') || '[]');
          if (cart.length > 0) {
            const { trackPurchasedItems } = await import('@/components/BuyItAgain');
            trackPurchasedItems(cart);
          }
        } catch {}
        toast.success('Payment verified successfully!');
        return;
      }
      
      if (data.status === 'expired') {
        setStatus('failed');
        setOrderData(data);
        return;
      }
      
      // Poll up to 5 times
      if (retry < 5) {
        setPollCount(retry + 1);
        setTimeout(() => verifyStripePayment(retry + 1), 2000);
      } else {
        setOrderData(data);
        setStatus('processing');
      }
    } catch (err) {
      if (retry < 3) {
        setTimeout(() => verifyStripePayment(retry + 1), 2000);
      } else {
        setStatus('error');
      }
    }
  };

  const verifyPayment = async (retry = 0) => {
    try {
      setStatus('verifying');
      const res = await fetch(`${API}/payments/cashfree/verify/${orderId}`);
      
      if (!res.ok) {
        throw new Error(`Verify returned ${res.status}`);
      }
      
      const data = await res.json();

      if (data.success && data.order_status === 'PAID') {
        setOrderData(data);
        setStatus('success');
        bookingConfirmed();
        toast.success('Payment verified successfully!');
        return;
      }

      // Payment not yet confirmed — poll up to 5 times with 3s delay
      if (retry < 5) {
        setPollCount(retry + 1);
        setTimeout(() => verifyPayment(retry + 1), 3000);
      } else {
        // After 5 retries, check if it was a failure or just slow
        if (data.order_status === 'FAILED' || data.order_status === 'CANCELLED') {
          setStatus('failed');
          setOrderData(data);
        } else {
          // Still pending — show success anyway since payment was initiated
          // The webhook will handle the final confirmation
          setOrderData(data);
          setStatus('processing');
        }
      }
    } catch (err) {
      if (retry < 3) {
        setTimeout(() => verifyPayment(retry + 1), 2000);
      } else {
        setStatus('error');
      }
    }
  };

  const getServiceName = () => {
    switch (type) {
      case 'mango': case 'lab_test': return 'Mango Health Labs';
      case 'pharmacy': return 'Orange Pharmacy';
      case 'appointment': case 'consultation': return 'DiaGyn Healthcare';
      case 'membership': return 'Nevika Cura ONE';
      default: return 'Nevika Cura';
    }
  };

  const getNavigatePath = () => {
    switch (type) {
      case 'mango': case 'lab_test': return '/mango';
      case 'pharmacy': return '/orange';
      case 'consultation': return '/diagyn';
      default: return '/';
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4" data-testid="payment-success-page">
      <div className="max-w-md w-full">
        {/* Verifying */}
        {status === 'verifying' && (
          <div className="text-center space-y-6 animate-fadeIn" data-testid="payment-verifying">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-green-400 animate-spin"></div>
              <Loader2 className="absolute inset-0 m-auto w-8 h-8 text-green-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Verifying Payment</h2>
              <p className="text-white/50 text-sm mt-2">
                {pollCount > 0
                  ? `Confirming with payment gateway... (${pollCount}/5)`
                  : 'Please wait while we confirm your payment...'}
              </p>
            </div>
            <p className="text-white/30 text-xs">Do not close this page</p>
          </div>
        )}

        {/* Success — Prescription Pad Style */}
        {status === 'success' && (
          <div className="animate-fadeIn" data-testid="payment-success">
            {/* Prescription Pad */}
            <div className="relative rounded-3xl overflow-hidden" style={{
              background: 'linear-gradient(180deg, #FFF8F0 0%, #FFF5E8 100%)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.5)',
              border: '1px solid rgba(255,248,240,0.3)',
            }}>
              {/* Pad header with Rx stamp */}
              <div className="relative px-5 pt-5 pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[10px] text-stone-400 font-mono tracking-widest uppercase">Rx</p>
                    <h2 className="text-lg font-bold text-stone-800 leading-tight">{getServiceName()}</h2>
                    <p className="text-[10px] text-stone-400 mt-0.5">Order Confirmation</p>
                  </div>
                  {/* Green checkmark stamp */}
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-[3px] border-green-600 flex items-center justify-center"
                      style={{ transform: 'rotate(-12deg)', opacity: 0.85 }}>
                      <div className="text-center">
                        <CheckCircle2 className="w-6 h-6 text-green-600 mx-auto" />
                        <p className="text-[7px] font-black text-green-700 tracking-wider mt-0.5">CONFIRMED</p>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Thin line under header */}
                <div className="mt-3 border-b border-dashed border-stone-300" />
              </div>

              {/* Order details — prescription style */}
              <div className="px-5 py-3 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">Order #</span>
                  <span className="text-stone-800 font-mono text-xs font-semibold">{orderId}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">Status</span>
                  <span className="text-green-600 font-bold">Paid & Confirmed</span>
                </div>
                {orderData?.product_type && (
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-500">Service</span>
                    <span className="text-stone-800 font-medium">{getServiceName()}</span>
                  </div>
                )}
                {orderData?.membership && (
                  <div className="mt-2 pt-2 border-t border-stone-200 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-500">Plan</span>
                      <span className="text-stone-800">{orderData.membership.plan_name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-500">Code</span>
                      <span className="text-green-700 font-mono">{orderData.membership.membership_code}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-stone-500">Valid Until</span>
                      <span className="text-stone-800">{orderData.membership.valid_until ? new Date(orderData.membership.valid_until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Tear-off perforation line */}
              <div className="mt-2 mx-2" style={{
                borderTop: '2px dashed rgba(180,160,140,0.4)',
              }} />

              {/* Bottom section — doctor signature feel */}
              <div className="px-5 py-3 flex items-center justify-between">
                <div className="text-[9px] text-stone-400 italic">
                  <p>Thank you for choosing {getServiceName()}</p>
                  <p className="mt-0.5">Ref: {new Date().toLocaleDateString('en-IN')}</p>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-stone-500 font-semibold tracking-wide">NEVIKA CURA</div>
                  <div className="w-14 h-[1px] bg-stone-300 mt-1 ml-auto" />
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-3 pt-5">
              <Button
                onClick={() => {
                  const confirmPath = type === 'pharmacy'
                    ? `/booking-confirmation?type=orange&bookingId=${orderId}`
                    : type === 'mango' || type === 'lab_test'
                      ? `/booking-confirmation?type=mango&bookingId=${orderId}`
                      : getNavigatePath();
                  navigate(confirmPath);
                }}
                className="w-full py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold"
                data-testid="payment-success-continue"
              >
                View Booking Pass <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                className="w-full py-3 rounded-xl border-white/10 text-white/60 hover:text-white hover:bg-white/5"
                data-testid="payment-success-home"
              >
                <Home className="w-4 h-4 mr-2" /> Go Home
              </Button>
              <Button
                onClick={() => navigate('/my-orders')}
                variant="outline"
                className="w-full py-3 rounded-xl border-white/10 text-white/60 hover:text-white hover:bg-white/5"
                data-testid="payment-success-my-orders"
              >
                <Package className="w-4 h-4 mr-2" /> View My Orders
              </Button>
            </div>
          </div>
        )}

        {/* Processing (payment initiated but not yet confirmed by gateway) */}
        {status === 'processing' && (
          <div className="text-center space-y-6 animate-fadeIn" data-testid="payment-processing">
            <div className="w-20 h-20 mx-auto rounded-full bg-yellow-500/20 flex items-center justify-center">
              <RefreshCw className="w-10 h-10 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Payment Processing</h2>
              <p className="text-white/50 text-sm mt-2">
                Your payment is being processed. You'll receive a confirmation shortly.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-left space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Order ID</span>
                <span className="text-white font-mono text-xs">{orderId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/50">Status</span>
                <span className="text-yellow-400 font-semibold">Processing</span>
              </div>
              <p className="text-white/40 text-xs pt-2">
                If your payment was debited, your order will be auto-confirmed within a few minutes.
                You'll receive a notification on WhatsApp.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Button
                onClick={() => { hasVerified.current = false; verifyPayment(); }}
                className="w-full py-3 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                data-testid="payment-retry-verify"
              >
                <RefreshCw className="w-4 h-4 mr-2" /> Check Again
              </Button>
              <Button
                onClick={() => navigate(getNavigatePath())}
                variant="outline"
                className="w-full py-3 rounded-xl border-white/10 text-white/60 hover:text-white hover:bg-white/5"
              >
                Continue Browsing
              </Button>
              <a
                href={`https://wa.me/919403890429?text=Hi, I made a payment for order ${orderId} but haven't received confirmation yet.`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-green-400 text-sm hover:underline pt-2"
              >
                <Phone className="w-3.5 h-3.5" /> Contact Support on WhatsApp
              </a>
            </div>
          </div>
        )}

        {/* Failed */}
        {status === 'failed' && (
          <div className="text-center space-y-6 animate-fadeIn" data-testid="payment-failed">
            <div className="w-20 h-20 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Payment Failed</h2>
              <p className="text-white/50 text-sm mt-2">
                Your payment could not be completed. No amount has been charged.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Button
                onClick={() => navigate(getNavigatePath())}
                className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold"
              >
                Try Again
              </Button>
              <a
                href={`https://wa.me/919403890429?text=Hi, my payment failed for order ${orderId}. Please help.`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-green-400 text-sm hover:underline pt-2"
              >
                <Phone className="w-3.5 h-3.5" /> Contact Support
              </a>
            </div>
          </div>
        )}

        {/* Error (no order_id) */}
        {status === 'error' && (
          <div className="text-center space-y-6 animate-fadeIn" data-testid="payment-error">
            <div className="w-20 h-20 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Something went wrong</h2>
              <p className="text-white/50 text-sm mt-2">
                We couldn't verify your payment. If money was deducted, please contact support.
              </p>
            </div>
            <Button
              onClick={() => navigate('/')}
              className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white"
            >
              Go Home
            </Button>
            <a
              href="https://wa.me/919403890429?text=Hi, I have a payment issue on Nevika Cura. Please help."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-green-400 text-sm hover:underline"
            >
              <Phone className="w-3.5 h-3.5" /> Contact Support
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

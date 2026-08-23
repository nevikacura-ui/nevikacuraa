import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, CreditCard, CheckCircle2, XCircle, Shield, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

const Checkout = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading, redirecting, error, manual
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const formRef = useRef(null);
  const hasSubmitted = useRef(false);

  const sessionId = searchParams.get('session');
  const orderId = searchParams.get('order');
  const amount = searchParams.get('amount');

  useEffect(() => {
    if (!sessionId || !orderId) {
      setStatus('error');
      setErrorMessage('Invalid payment link. Please contact support.');
      return;
    }

    // Auto-submit the form to Cashfree's hosted checkout
    if (!hasSubmitted.current && formRef.current) {
      hasSubmitted.current = true;
      setStatus('redirecting');
      
      // Small delay to show the loading state
      setTimeout(() => {
        formRef.current.submit();
      }, 1000);
    }
  }, [sessionId, orderId]);

  const copyToClipboard = () => {
    const paymentUrl = window.location.href;
    navigator.clipboard.writeText(paymentUrl);
    setCopied(true);
    toast.success('Payment link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const retryPayment = () => {
    if (formRef.current) {
      setStatus('redirecting');
      formRef.current.submit();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center p-4">
      {/* Hidden form for POST redirect to Cashfree */}
      {sessionId && (
        <form
          ref={formRef}
          action="https://api.cashfree.com/pg/view/sessions/checkout"
          method="POST"
          style={{ display: 'none' }}
        >
          <input type="hidden" name="payment_session_id" value={sessionId} />
        </form>
      )}

      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold">Secure Payment</h1>
          <p className="text-orange-100 text-sm mt-1">Nevika Cura Healthcare</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Amount Display */}
          {amount && (
            <div className="text-center mb-6">
              <p className="text-gray-500 text-sm">Amount to Pay</p>
              <p className="text-4xl font-bold text-orange-600">₹{parseFloat(amount).toFixed(2)}</p>
              <p className="text-xs text-gray-400 mt-1">Order: {orderId}</p>
            </div>
          )}

          {/* Status Display */}
          <div className="text-center py-6">
            {(status === 'loading' || status === 'redirecting') && (
              <div className="space-y-4">
                <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto" />
                <p className="text-gray-600">
                  {status === 'loading' ? 'Loading payment gateway...' : 'Redirecting to secure payment...'}
                </p>
                <p className="text-gray-400 text-sm">Please wait, do not close this page</p>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <XCircle className="w-10 h-10 text-red-600" />
                </div>
                <p className="text-red-600 font-semibold text-lg">Payment Error</p>
                <p className="text-gray-500 text-sm">{errorMessage}</p>
                
                {/* Contact Support */}
                <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3 mt-4">
                  <p className="text-sm font-medium text-gray-700">Need help? Contact us:</p>
                  <div className="space-y-2">
                    <a href="tel:9403890429" className="flex items-center gap-2 text-orange-600 text-sm hover:underline">
                      <span>📞</span> Call: 9403890429
                    </a>
                    <a href={`https://wa.me/919403890429?text=Hi, I need help with payment for order ${orderId || 'N/A'}. Amount: ₹${amount || 'N/A'}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-green-600 text-sm hover:underline">
                      <span>💬</span> WhatsApp: 9403890429
                    </a>
                  </div>
                </div>
              </div>
            )}

            {status === 'manual' && (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                  <CreditCard className="w-10 h-10 text-amber-600" />
                </div>
                <p className="text-amber-700 font-semibold text-lg">Redirect Failed</p>
                <p className="text-gray-500 text-sm mb-4">
                  Unable to redirect to payment page. Please try again or contact support.
                </p>
                
                <button
                  onClick={retryPayment}
                  className="w-full px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors"
                >
                  Try Again
                </button>
                
                {/* Contact Support */}
                <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3 mt-4">
                  <p className="text-sm font-medium text-gray-700">Contact us to complete payment:</p>
                  <div className="space-y-2">
                    <a href="tel:9403890429" className="flex items-center gap-2 text-orange-600 text-sm hover:underline">
                      <span>📞</span> Call: 9403890429
                    </a>
                    <a href={`https://wa.me/919403890429?text=Hi, I need help with payment for order ${orderId}. Amount: ₹${amount}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-green-600 text-sm hover:underline">
                      <span>💬</span> WhatsApp: 9403890429
                    </a>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Order ID: {orderId}</p>
                </div>

                {/* Copy Link Button */}
                <button
                  onClick={copyToClipboard}
                  className="w-full mt-3 px-4 py-2 border border-gray-200 rounded-lg flex items-center justify-center gap-2 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Payment Link'}
                </button>
              </div>
            )}
          </div>

          {/* Security Badge */}
          <div className="flex items-center justify-center gap-2 text-gray-400 text-xs border-t pt-4">
            <Shield className="w-4 h-4" />
            <span>256-bit SSL Encrypted | Powered by Cashfree</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;

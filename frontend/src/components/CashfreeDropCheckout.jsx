import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, CreditCard, Smartphone, Building2, CheckCircle2, X } from 'lucide-react';
import { load } from 'cashfree-pg-sdk-javascript';

const API = process.env.REACT_APP_BACKEND_URL;

// Cashfree Drop Checkout Component
const CashfreeDropCheckout = ({ 
  isOpen, 
  onClose, 
  paymentSessionId, 
  orderId, 
  amount, 
  patientName,
  onPaymentSuccess,
  onPaymentFailure 
}) => {
  const [cashfree, setCashfree] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('card'); // card, upi, netbanking
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // null, success, failed

  // Initialize Cashfree SDK
  useEffect(() => {
    const initCashfree = async () => {
      try {
        // Load Cashfree SDK - use 'sandbox' for testing, 'production' for live
        const cf = await load({ mode: 'production' });
        setCashfree(cf);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load Cashfree SDK:', error);
        toast.error('Failed to initialize payment gateway');
        setLoading(false);
      }
    };

    if (isOpen && paymentSessionId) {
      initCashfree();
    }
  }, [isOpen, paymentSessionId]);

  // Handle payment
  const handlePayment = useCallback(async () => {
    if (!cashfree || !paymentSessionId) {
      toast.error('Payment not initialized');
      return;
    }

    setProcessing(true);

    try {
      const checkoutOptions = {
        paymentSessionId: paymentSessionId,
        redirectTarget: '_modal', // Opens in modal instead of redirect
      };

      // Trigger Cashfree checkout
      const result = await cashfree.checkout(checkoutOptions);

      if (result.error) {
        console.error('Payment error:', result.error);
        setPaymentStatus('failed');
        toast.error(result.error.message || 'Payment failed');
        onPaymentFailure?.(result.error);
      } else if (result.redirect) {
        // Payment requires redirect - this shouldn't happen with _modal
        console.log('Redirect required:', result.redirect);
      } else if (result.paymentDetails) {
        // Payment successful
        console.log('Payment success:', result.paymentDetails);
        setPaymentStatus('success');
        toast.success('Payment successful!');
        onPaymentSuccess?.(result.paymentDetails);
      }
    } catch (error) {
      console.error('Payment exception:', error);
      setPaymentStatus('failed');
      toast.error('Payment processing failed');
      onPaymentFailure?.(error);
    } finally {
      setProcessing(false);
    }
  }, [cashfree, paymentSessionId, onPaymentSuccess, onPaymentFailure]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPaymentStatus(null);
      setProcessing(false);
      setPaymentMethod('card');
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-violet-400" />
            Complete Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Amount Display */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-violet-600/20 to-purple-600/20 border border-violet-500/30">
            <p className="text-sm text-slate-400">Amount to Pay</p>
            <p className="text-3xl font-bold text-white">₹{amount}</p>
            <p className="text-xs text-slate-500 mt-1">{patientName}</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
              <span className="ml-3 text-slate-400">Initializing payment...</span>
            </div>
          ) : paymentStatus === 'success' ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              <p className="text-xl font-bold text-green-400">Payment Successful!</p>
              <p className="text-sm text-slate-400 mt-2">Order ID: {orderId}</p>
              <Button 
                onClick={onClose}
                className="mt-4 bg-green-600 hover:bg-green-700"
              >
                Done
              </Button>
            </div>
          ) : paymentStatus === 'failed' ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-red-400" />
              </div>
              <p className="text-xl font-bold text-red-400">Payment Failed</p>
              <p className="text-sm text-slate-400 mt-2">Please try again</p>
              <Button 
                onClick={() => setPaymentStatus(null)}
                className="mt-4 bg-slate-700 hover:bg-slate-600"
              >
                Retry Payment
              </Button>
            </div>
          ) : (
            <>
              {/* Payment Method Selection */}
              <div>
                <p className="text-sm font-medium text-slate-400 mb-2">Select Payment Method</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'card', label: 'Card', icon: CreditCard },
                    { id: 'upi', label: 'UPI', icon: Smartphone },
                    { id: 'netbanking', label: 'NetBanking', icon: Building2 },
                  ].map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        paymentMethod === method.id
                          ? 'border-violet-500 bg-violet-500/20'
                          : 'border-slate-700 hover:border-violet-500/50'
                      }`}
                    >
                      <method.icon className={`w-5 h-5 mx-auto mb-1 ${
                        paymentMethod === method.id ? 'text-violet-400' : 'text-slate-500'
                      }`} />
                      <p className={`text-xs font-medium ${
                        paymentMethod === method.id ? 'text-violet-400' : 'text-slate-500'
                      }`}>{method.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pay Button */}
              <Button
                onClick={handlePayment}
                disabled={processing}
                className="w-full h-14 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold text-lg rounded-xl"
                data-testid="cashfree-pay-btn"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>Pay ₹{amount}</>
                )}
              </Button>

              {/* Security Note */}
              <p className="text-xs text-center text-slate-500">
                🔒 Secured by Cashfree Payments
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CashfreeDropCheckout;

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import { CheckCircle2, XCircle, Loader2, ArrowLeft, Receipt, Phone } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const PaymentReturn = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading, success, failed, error
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkPaymentStatus = async () => {
      const orderId = searchParams.get('order_id');
      
      if (!orderId) {
        // Try to get from localStorage
        const pendingPayment = localStorage.getItem('pendingPayment');
        if (pendingPayment) {
          const parsed = JSON.parse(pendingPayment);
          await verifyPayment(parsed.order_id);
        } else {
          setStatus('error');
          setError('No payment order found');
        }
        return;
      }

      await verifyPayment(orderId);
    };

    checkPaymentStatus();
  }, [searchParams]);

  const verifyPayment = async (orderId) => {
    try {
      const res = await axios.get(`${API}/api/cashfree/order/${orderId}/status`);
      
      if (res.data.order_status === 'PAID') {
        setStatus('success');
        setPaymentDetails(res.data);
        localStorage.removeItem('pendingPayment');
        
        // Trigger completion on backend
        await axios.post(`${API}/api/diagyn-staff/payment/complete`, {
          order_id: orderId
        });
        
        toast.success('Payment successful!');
      } else if (res.data.order_status === 'FAILED' || res.data.order_status === 'CANCELLED') {
        setStatus('failed');
        setPaymentDetails(res.data);
        toast.error('Payment was not completed');
      } else {
        // Still pending - check again in 3 seconds
        setTimeout(() => verifyPayment(orderId), 3000);
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      setStatus('error');
      setError(error.response?.data?.detail || 'Failed to verify payment');
    }
  };

  const handleGoBack = () => {
    navigate('/doctor-portal');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" 
         style={{ background: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)' }}>
      <div className="max-w-md w-full">
        {/* Status Card */}
        <div className="rounded-3xl p-8 text-center"
             style={{ 
               background: 'rgba(30, 41, 59, 0.8)',
               backdropFilter: 'blur(20px)',
               border: '1px solid rgba(255, 255, 255, 0.1)'
             }}>
          
          {status === 'loading' && (
            <>
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                   style={{ background: 'rgba(139, 92, 246, 0.2)' }}>
                <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Verifying Payment</h1>
              <p className="text-slate-400">Please wait while we confirm your payment...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                   style={{ background: 'rgba(34, 197, 94, 0.2)' }}>
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Payment Successful!</h1>
              <p className="text-slate-400 mb-6">The consultation has been completed.</p>
              
              {paymentDetails && (
                <div className="rounded-2xl p-4 mb-6" style={{ background: 'rgba(255, 255, 255, 0.05)' }}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-400">Amount Paid</span>
                    <span className="text-2xl font-bold text-green-400">₹{paymentDetails.amount}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Order ID</span>
                    <span className="text-slate-400 font-mono">{paymentDetails.order_id}</span>
                  </div>
                  {paymentDetails.payment_method && (
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span className="text-slate-500">Method</span>
                      <span className="text-slate-400">{paymentDetails.payment_method}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <Button onClick={handleGoBack} 
                        className="flex-1 h-12 bg-violet-600 hover:bg-violet-700 rounded-xl">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to Portal
                </Button>
              </div>
            </>
          )}

          {status === 'failed' && (
            <>
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                   style={{ background: 'rgba(239, 68, 68, 0.2)' }}>
                <XCircle className="w-10 h-10 text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Payment Failed</h1>
              <p className="text-slate-400 mb-6">
                The payment was not completed. Please try again or use a different payment method.
              </p>
              
              <Button onClick={handleGoBack} 
                      className="w-full h-12 bg-slate-700 hover:bg-slate-600 rounded-xl">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Portal
              </Button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                   style={{ background: 'rgba(251, 191, 36, 0.2)' }}>
                <XCircle className="w-10 h-10 text-amber-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
              <p className="text-slate-400 mb-6">{error || 'Unable to verify payment status.'}</p>
              
              <Button onClick={handleGoBack} 
                      className="w-full h-12 bg-slate-700 hover:bg-slate-600 rounded-xl">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Portal
              </Button>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-6">
          DiaGyn Healthcare • Secure Payments by Cashfree
        </p>
      </div>
    </div>
  );
};

export default PaymentReturn;

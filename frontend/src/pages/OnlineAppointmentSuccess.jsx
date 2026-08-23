import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle, Video, Calendar, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import BookingConfirmation from '@/components/BookingConfirmation';

const API = process.env.REACT_APP_BACKEND_URL;

const OnlineAppointmentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, creating, success, error
  const [errorMessage, setErrorMessage] = useState('');
  const [bookingDetails, setBookingDetails] = useState(null);

  const orderId = searchParams.get('order_id');
  const sessionId = searchParams.get('session_id');
  const provider = searchParams.get('provider'); // 'stripe' or 'cashfree'

  useEffect(() => {
    const processAppointment = async () => {
      // Get stored appointment data
      const storedData = sessionStorage.getItem('pendingOnlineAppointment');
      
      if (!storedData) {
        setStatus('error');
        setErrorMessage('Appointment data not found. Please try booking again.');
        return;
      }

      const appointmentData = JSON.parse(storedData);
      const isStripe = appointmentData.payment_provider === 'stripe' || provider === 'stripe';

      // Step 1: Verify payment based on provider
      setStatus('verifying');
      try {
        if (isStripe) {
          // Verify Stripe payment
          const stripeSessionId = sessionId || appointmentData.session_id;
          const verifyResponse = await axios.get(`${API}/api/payments/stripe/status/${stripeSessionId}`);
          
          if (verifyResponse.data?.payment_status !== 'paid') {
            // Poll for payment status (Stripe may take a moment)
            let attempts = 0;
            const maxAttempts = 5;
            while (attempts < maxAttempts) {
              await new Promise(r => setTimeout(r, 2000));
              const pollResponse = await axios.get(`${API}/api/payments/stripe/status/${stripeSessionId}`);
              if (pollResponse.data?.payment_status === 'paid') {
                break;
              }
              attempts++;
            }
            
            // Final check
            const finalCheck = await axios.get(`${API}/api/payments/stripe/status/${stripeSessionId}`);
            if (finalCheck.data?.payment_status !== 'paid') {
              setStatus('error');
              setErrorMessage('Payment not confirmed. If amount was deducted, please contact support.');
              return;
            }
          }
        } else {
          // Verify Cashfree payment
          const verifyResponse = await axios.get(`${API}/api/payments/cashfree/verify/${orderId || appointmentData.order_id}`);
          
          if (!verifyResponse.data?.success) {
            setStatus('error');
            setErrorMessage('Payment verification failed. If amount was deducted, please contact support.');
            return;
          }
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        // Continue to create appointment - webhook might have already processed it
      }

      // Step 2: Create the appointment
      setStatus('creating');
      try {
        const bookingPayload = {
          doctor: appointmentData.doctor,
          clinic: appointmentData.clinic,
          date: appointmentData.date,
          time: appointmentData.time,
          patient_name: appointmentData.patient_name,
          patient_phone: appointmentData.patient_phone,
          patient_email: appointmentData.patient_email,
          verification_token: appointmentData.verification_token,
          email_reminder: !!appointmentData.patient_email,
          payment_method: 'cashfree',
          cashfree_order_id: orderId || appointmentData.order_id,
          consultation_fee: appointmentData.consultation_fee,
          booking_type: 'online_consultation'
        };

        const response = await axios.post(`${API}/api/appointments`, bookingPayload, {
          timeout: 30000
        });

        if (response.data?.booking_id || response.data?.id) {
          // Clear stored data
          sessionStorage.removeItem('pendingOnlineAppointment');
          
          // Format date for display
          const dateObj = new Date(appointmentData.date);
          
          setBookingDetails({
            orderId: response.data?.booking_id || response.data?.id,
            doctor: appointmentData.doctor,
            clinic: appointmentData.clinic,
            date: format(dateObj, 'EEEE, MMMM d, yyyy'),
            time: appointmentData.time,
            appointmentCode: response.data?.appointment_code,
            consultationFee: appointmentData.consultation_fee,
            isOnline: true
          });
          setStatus('success');
          toast.success('Online consultation booked successfully!');
        } else {
          throw new Error('Invalid response from server');
        }
      } catch (error) {
        console.error('Appointment creation error:', error);
        
        // Check if appointment was already created (duplicate prevention)
        if (error.response?.status === 409) {
          setStatus('error');
          setErrorMessage('This appointment has already been booked. Please check your bookings.');
        } else {
          setStatus('error');
          setErrorMessage(
            error.response?.data?.detail || 
            'Failed to create appointment. Please contact support with your payment reference.'
          );
        }
      }
    };

    processAppointment();
  }, [orderId]);

  // Show booking confirmation on success
  if (status === 'success' && bookingDetails) {
    return (
      <BookingConfirmation
        type="diagyn"
        paymentMethod="cashfree"
        orderDetails={{
          orderId: bookingDetails.orderId,
          trackingPath: '/my-appointments',
          doctor: bookingDetails.doctor,
          clinic: bookingDetails.clinic,
          date: bookingDetails.date,
          time: bookingDetails.time,
          appointmentCode: bookingDetails.appointmentCode,
          amount: bookingDetails.consultationFee,
          isOnlineConsultation: true
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center rounded-3xl bg-slate-800/50 border-slate-700 backdrop-blur-xl">
        {status === 'verifying' && (
          <div className="space-y-4">
            <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto">
              <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-white">Verifying Payment</h2>
            <p className="text-slate-400">Please wait while we verify your payment...</p>
          </div>
        )}

        {status === 'creating' && (
          <div className="space-y-4">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
              <Video className="w-10 h-10 text-emerald-400 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-white">Creating Appointment</h2>
            <p className="text-slate-400">Booking your online consultation...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Booking Failed</h2>
            <p className="text-slate-400 text-sm">{errorMessage}</p>
            
            <div className="bg-slate-700/50 rounded-xl p-4 mt-4 text-left">
              <p className="text-sm font-medium text-slate-300 mb-2">Need help?</p>
              <div className="space-y-2 text-sm">
                <a 
                  href="tel:9833188288" 
                  className="flex items-center gap-2 text-teal-400 hover:underline"
                >
                  Call: 9833188288
                </a>
                <a 
                  href={`https://wa.me/919833188288?text=Hi, I need help with my online appointment booking. Order: ${orderId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-green-400 hover:underline"
                >
                  WhatsApp Support
                </a>
              </div>
            </div>

            <Button
              onClick={() => navigate('/diagyn')}
              className="w-full mt-4 bg-slate-700 hover:bg-slate-600 text-white"
            >
              Try Again
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default OnlineAppointmentSuccess;

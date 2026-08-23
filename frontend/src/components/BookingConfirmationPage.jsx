import React from 'react';
import { useSearchParams } from 'react-router-dom';
import BookingConfirmation from './BookingConfirmation';

/**
 * BookingConfirmationPage - Route wrapper for BookingConfirmation
 * Route: /booking-confirmation?type=diagyn|mango|orange
 */
const BookingConfirmationPage = () => {
  const [searchParams] = useSearchParams();
  
  // Get params from URL
  const type = searchParams.get('type') || 'diagyn';
  const paymentMethod = searchParams.get('payment') || 'free';
  const collectionMode = searchParams.get('collection') || 'home';
  
  // Build order details from URL params
  const orderDetails = {
    orderId: searchParams.get('orderId') || searchParams.get('bookingId') || searchParams.get('id') || '',
    bookingId: searchParams.get('bookingId') || searchParams.get('orderId') || searchParams.get('id') || '',
    verificationCode: searchParams.get('code') || '',
    doctor: decodeURIComponent(searchParams.get('doctor') || ''),
    clinic: decodeURIComponent(searchParams.get('clinic') || ''),
    date: searchParams.get('date') || '',
    time: searchParams.get('time') || '',
    session: searchParams.get('session') || '',
    patientName: decodeURIComponent(searchParams.get('patientName') || searchParams.get('name') || ''),
    phone: searchParams.get('phone') || '',
    amount: parseFloat(searchParams.get('amount')) || 0,
    totalAmount: parseFloat(searchParams.get('totalAmount') || searchParams.get('amount')) || 0,
    deliveryCharge: parseFloat(searchParams.get('deliveryCharge')) || 49,
    address: decodeURIComponent(searchParams.get('address') || ''),
    items: searchParams.get('items')?.split('||').filter(Boolean) || [],
    tests: searchParams.get('tests')?.split('||').filter(Boolean) || [],
    trackingPath: searchParams.get('trackPath') || '',
    reason: decodeURIComponent(searchParams.get('reason') || ''),
  };

  return (
    <BookingConfirmation
      type={type}
      paymentMethod={paymentMethod}
      collectionMode={collectionMode}
      orderDetails={orderDetails}
    />
  );
};

export default BookingConfirmationPage;

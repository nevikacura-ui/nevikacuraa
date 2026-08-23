import React from 'react';
import { useMangoStaff } from './MangoStaffContext';
import { X, Shield } from 'lucide-react';
import CodeVerificationInput from '@/components/CodeVerificationInput';

const MangoCodeVerificationModal = () => {
  const s = useMangoStaff();
  if (!s.showCodeVerification || !s.verifyingBooking) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
         onClick={() => s.setShowCodeVerification(false)}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
           onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 bg-green-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              <span className="font-bold text-green-700">Sample Collection Verification</span>
            </div>
            <button onClick={() => s.setShowCodeVerification(false)}
                    className="p-1 rounded-full hover:bg-green-100">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        
        {/* Patient Info */}
        <div className="px-5 py-3 bg-gray-50 border-b">
          <p className="font-bold text-gray-800">{s.verifyingBooking.patient_name}</p>
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
            <span>#{s.verifyingBooking.booking_id}</span>
            <span>{s.verifyingBooking.tests?.length || 0} tests</span>
            <span>₹{s.verifyingBooking.total_amount}</span>
          </div>
        </div>
        
        {/* Verification Input */}
        <div className="p-5">
          <CodeVerificationInput
            bookingId={s.verifyingBooking.booking_id || s.verifyingBooking.id}
            bookingType="mango"
            verifierId={s.staffInfo?.username}
            verifierRole="phlebotomist"
            onVerified={s.onBookingCodeVerified}
            onError={() => {}}
          />
        </div>
        
        {/* Skip Option */}
        <div className="px-5 pb-5">
          <button onClick={s.skipBookingVerification}
                  className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Skip verification (Use 0000 or patient unavailable)
          </button>
        </div>
      </div>
    </div>
  );
};

export default MangoCodeVerificationModal;

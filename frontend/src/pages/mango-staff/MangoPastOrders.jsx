import React from 'react';
import { useMangoStaff } from './MangoStaffContext';
import { CheckCircle2, TestTube } from 'lucide-react';

const TEST_STATUSES = [
  { key: 'test_booked', label: 'Test Booked', color: '#3b82f6' },
  { key: 'sample_collected', label: 'Sample Collected', color: '#f59e0b' },
  { key: 'in_process', label: 'In Process', color: '#8b5cf6' },
  { key: 'report_generated', label: 'Report Generated', color: '#22c55e' },
  { key: 'completed', label: 'Completed', color: '#10b981' },
  { key: 'cancelled', label: 'Cancelled', color: '#ef4444' }
];

const MANGO_PAST_STATUSES = ['completed', 'cancelled'];

const MangoPastOrders = () => {
  const s = useMangoStaff();
  const pastBookings = s.bookings.filter(b => MANGO_PAST_STATUSES.includes(b.status));

  return (
    <div className="px-4 pb-24">
      <div className="bg-[#141428] rounded-2xl p-4 border border-white/10 mb-4">
        <div className="flex items-center gap-2 text-gray-400">
          <CheckCircle2 className="w-5 h-5" />
          <div>
            <p className="text-sm font-bold text-white">Completed & Cancelled</p>
            <p className="text-xs text-gray-500">Past bookings archive</p>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {pastBookings.length === 0 ? (
          <div className="bg-[#141428] rounded-2xl p-8 text-center border border-white/10">
            <TestTube className="w-12 h-12 mx-auto text-gray-600 mb-3" />
            <p className="text-gray-500">No past bookings yet</p>
          </div>
        ) : (
          pastBookings.map(booking => {
            const currentStatus = TEST_STATUSES.find(st => st.key === booking.status) || TEST_STATUSES[0];
            return (
              <div key={booking.booking_id} className="bg-[#141428] rounded-2xl p-4 border border-white/10 opacity-80" data-testid={`past-booking-${booking.booking_id}`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-white">#{booking.booking_id}</p>
                    <p className="text-sm text-gray-300">{booking.patient_name}</p>
                    <p className="text-xs text-gray-500">{booking.patient_phone}</p>
                    {booking.created_at && (
                      <p className="text-[10px] text-gray-500 mt-1">
                        {new Date(booking.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}
                      </p>
                    )}
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: `${currentStatus.color}20`, color: currentStatus.color }}>
                    {currentStatus.label}
                  </span>
                </div>
                <div className="bg-[#1A1A2E] rounded-xl p-3 border border-white/10">
                  <p className="text-xs text-gray-500">Tests:</p>
                  <p className="text-sm font-medium text-white">{booking.tests?.join(', ') || 'N/A'}</p>
                  <p className="text-xs text-amber-400 font-semibold mt-1">&#8377;{booking.total_amount || 0}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MangoPastOrders;

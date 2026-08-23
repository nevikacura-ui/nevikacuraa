import React from 'react';
import { useProfile } from './ProfileContext';
import { ShoppingBag, Package, Calendar, FlaskConical, Pill, Star, ChevronRight } from 'lucide-react';
import { lightTap } from '@/utils/haptics';

const ProfileOrdersTab = () => {
  const { navigate, appointments, diagnostics, pharmacyOrders } = useProfile();

  return (
    <div className="space-y-4 pb-6">
      {/* View All Orders Button */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-4 mx-0 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm">View All Orders</p>
              <p className="text-xs text-white/70">Track all your orders in one place</p>
            </div>
          </div>
          <button onClick={() => { lightTap(); navigate('/my-orders'); }} className="px-4 py-2 bg-white/20 rounded-xl text-white text-xs font-bold">
            View <ChevronRight className="w-3 h-3 inline" />
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#1A1A1A] rounded-2xl p-3 text-center border border-white/10">
          <Calendar className="w-6 h-6 mx-auto mb-1 text-teal-400" />
          <p className="text-xl font-bold text-white">{appointments.length}</p>
          <p className="text-[10px] text-gray-500">Appointments</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-2xl p-3 text-center border border-white/10">
          <FlaskConical className="w-6 h-6 mx-auto mb-1 text-amber-400" />
          <p className="text-xl font-bold text-white">{diagnostics.length}</p>
          <p className="text-[10px] text-gray-500">Lab Tests</p>
        </div>
        <div className="bg-[#1A1A1A] rounded-2xl p-3 text-center border border-white/10">
          <Pill className="w-6 h-6 mx-auto mb-1 text-orange-400" />
          <p className="text-xl font-bold text-white">{pharmacyOrders.length}</p>
          <p className="text-[10px] text-gray-500">Pharmacy</p>
        </div>
      </div>

      {/* Recent Appointments */}
      <div className="bg-[#1A1A1A] rounded-2xl overflow-hidden border border-white/10">
        <div className="px-4 py-3 border-b border-white/10">
          <p className="font-semibold text-white">Recent Appointments</p>
        </div>
        {appointments.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No appointments yet</p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {appointments.slice(0, 5).map((apt, idx) => (
              <div key={idx} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-teal-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-white">{apt.doctor_name || 'Doctor Visit'}</p>
                    <p className="text-xs text-gray-500">{new Date(apt.date || apt.appointment_date).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-lg text-[10px] font-semibold ${
                  apt.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                  apt.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {apt.status || 'Upcoming'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Pharmacy Orders */}
      <div className="bg-[#1A1A1A] rounded-2xl overflow-hidden border border-white/10">
        <div className="px-4 py-3 border-b border-white/10">
          <p className="font-semibold text-white">Recent Pharmacy Orders</p>
        </div>
        {pharmacyOrders.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No orders yet</p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {pharmacyOrders.slice(0, 5).map((order, idx) => (
              <div key={idx} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                    <Pill className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-white">Order #{order.order_id || order.id}</p>
                    <p className="text-xs text-gray-500">₹{order.total || order.grand_total || 0}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-lg text-[10px] font-semibold ${
                  order.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                  order.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                  'bg-amber-500/20 text-amber-400'
                }`}>
                  {order.status || 'Processing'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rate & Review Prompt */}
      {appointments.length > 0 && (
        <div className="bg-gradient-to-br from-teal-500/20 to-emerald-500/20 rounded-2xl p-4 border border-teal-500/30">
          <div className="flex items-center gap-3">
            <Star className="w-8 h-8 text-teal-400" />
            <div className="flex-1">
              <p className="font-bold text-white text-sm">How was your experience?</p>
              <p className="text-xs text-gray-400">Rate your recent visit to help us improve</p>
            </div>
            <button className="px-3 py-1.5 bg-teal-500 rounded-lg text-white text-xs font-semibold">Rate</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileOrdersTab;

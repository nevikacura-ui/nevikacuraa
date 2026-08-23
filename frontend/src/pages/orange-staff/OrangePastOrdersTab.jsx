import React from 'react';
import { useOrangeStaff } from './OrangeStaffContext';
import { CheckCircle2, ClipboardList, Loader2, X, IndianRupee, ShoppingBag, Package, Truck, ShieldCheck } from 'lucide-react';

const ORDER_STATUSES = [
  { key: 'order_placed', label: 'Order Placed', color: '#3b82f6', bg: '#eff6ff', icon: ShoppingBag },
  { key: 'prescription_validated', label: 'Rx Validated', color: '#8b5cf6', bg: '#f5f3ff', icon: ShieldCheck },
  { key: 'in_process', label: 'In Process', color: '#f59e0b', bg: '#fffbeb', icon: Package },
  { key: 'shipped', label: 'Shipped / Out for Delivery', color: '#06b6d4', bg: '#ecfeff', icon: Truck },
  { key: 'delivered', label: 'Delivered', color: '#22c55e', bg: '#f0fdf4', icon: CheckCircle2 },
  { key: 'cancelled', label: 'Cancelled', color: '#ef4444', bg: '#fef2f2', icon: X }
];
const STATUS_KEY_MAP = { 'booked': 'order_placed', 'pharmacist_call': 'prescription_validated', 'packing': 'in_process', 'out_for_delivery': 'shipped', 'completed': 'delivered' };
const normalizeStatus = (s) => STATUS_KEY_MAP[s] || s;
const PAST_STATUSES = ['delivered', 'cancelled'];

const OrangePastOrdersTab = () => {
  const s = useOrangeStaff();
  const pastOrders = s.orders.filter(o => PAST_STATUSES.includes(normalizeStatus(o.status)));

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-gray-500 flex-shrink-0" />
        <div>
          <p className="text-sm font-bold text-gray-700">Completed & Cancelled Orders</p>
          <p className="text-xs text-gray-500 mt-0.5">Orders that have been delivered or cancelled</p>
        </div>
      </div>
      {s.loadingOrders ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : pastOrders.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm">No past orders yet</p></div>
      ) : (
        <div className="space-y-3">
          {pastOrders.map(order => {
            const normalized = normalizeStatus(order.status);
            const status = ORDER_STATUSES.find(st => st.key === normalized) || ORDER_STATUSES[0];
            const StatusIcon = status.icon;
            return (
              <div key={order.id} className="rounded-2xl p-4 shadow-sm opacity-80" style={{ background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(12px)', border: '1px solid rgba(0,0,0,0.06)' }} data-testid={`past-order-${order.id}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-bold text-gray-700">{order.patient_name || order.customer_name || 'Customer'}</p>
                    <p className="text-xs text-gray-400">{order.order_id || order.id} &middot; {order.created_at?.split('T')[0]}</p>
                  </div>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: status.bg, color: status.color }}>
                    <StatusIcon className="w-3.5 h-3.5" />{status.label}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  {(order.items || []).slice(0, 3).map((item, i) => (
                    <span key={i}>{item.name || item.medicine_name} x{item.quantity}{i < Math.min(order.items.length, 3) - 1 ? ', ' : ''}</span>
                  ))}
                  {(order.items || []).length > 3 && <span className="text-gray-300"> +{order.items.length - 3} more</span>}
                </div>
                <p className="text-sm font-bold text-gray-600"><IndianRupee className="w-3 h-3 inline" />{(order.total || order.grand_total || 0).toFixed(2)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrangePastOrdersTab;

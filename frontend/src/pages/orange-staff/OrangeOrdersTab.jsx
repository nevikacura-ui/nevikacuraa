import React from 'react';
import { useOrangeStaff } from './OrangeStaffContext';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, ChevronRight, Loader2, X, ClipboardList, ShoppingBag, Package, Truck,
  IndianRupee, FileCheck, Send, FileUp, Mail, ShieldCheck, Navigation
} from 'lucide-react';

const ORDER_STATUSES = [
  { key: 'order_placed', label: 'Order Placed', color: '#3b82f6', bg: '#eff6ff', icon: ShoppingBag },
  { key: 'prescription_validated', label: 'Rx Validated', color: '#8b5cf6', bg: '#f5f3ff', icon: ShieldCheck },
  { key: 'in_process', label: 'In Process', color: '#f59e0b', bg: '#fffbeb', icon: Package },
  { key: 'shipped', label: 'Shipped / Out for Delivery', color: '#06b6d4', bg: '#ecfeff', icon: Truck },
  { key: 'delivered', label: 'Delivered', color: '#22c55e', bg: '#f0fdf4', icon: CheckCircle2 },
  { key: 'cancelled', label: 'Cancelled', color: '#ef4444', bg: '#fef2f2', icon: X }
];
const STATUS_FLOW = ['order_placed', 'prescription_validated', 'in_process', 'shipped', 'delivered'];
const ACTIVE_STATUSES = ['order_placed', 'prescription_validated', 'in_process', 'shipped'];
const STATUS_KEY_MAP = { 'booked': 'order_placed', 'pharmacist_call': 'prescription_validated', 'packing': 'in_process', 'out_for_delivery': 'shipped', 'completed': 'delivered' };
const normalizeStatus = (s) => STATUS_KEY_MAP[s] || s;

const OrangeOrdersTab = () => {
  const s = useOrangeStaff();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[{ key: 'all', label: 'All Active' }, ...ORDER_STATUSES.slice(0, 4)].map(st => (
          <button key={st.key} onClick={() => s.setOrderStatusFilter(st.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              s.orderStatusFilter === st.key ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}>{st.label}</button>
        ))}
      </div>
      {s.loadingOrders ? (
        <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: 'rgba(0,0,0,0.04)' }} />)}</div>
      ) : s.orders.filter(o => ACTIVE_STATUSES.includes(normalizeStatus(o.status))).length === 0 ? (
        <div className="text-center py-16 text-gray-400"><ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm">No active orders</p><p className="text-xs mt-1 text-gray-300">Completed orders appear in Past Orders tab</p></div>
      ) : (
        <div className="space-y-3">
          {s.orders.filter(o => {
            const ns = normalizeStatus(o.status);
            if (!ACTIVE_STATUSES.includes(ns)) return false;
            if (s.orderStatusFilter === 'all') return true;
            return ns === s.orderStatusFilter;
          }).map(order => {
            const normalized = normalizeStatus(order.status);
            const status = ORDER_STATUSES.find(st => st.key === normalized) || ORDER_STATUSES[0];
            const nextIdx = STATUS_FLOW.indexOf(normalized);
            const nextStatus = nextIdx >= 0 && nextIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[nextIdx + 1] : null;
            const StatusIcon = status.icon;
            const hasInvoice = order.invoice_uploaded;
            const hasEmail = !!(order.customer_email || order.patient_email);
            const needsInvoiceForNext = nextStatus === 'shipped' && !hasInvoice;
            return (
              <div key={order.id} className="rounded-2xl p-4 shadow-sm" style={{ background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.7)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }} data-testid={`order-${order.id}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{order.patient_name || order.customer_name || 'Customer'}</p>
                    <p className="text-xs text-gray-500">{order.order_id || order.id} &middot; {order.created_at?.split('T')[0]}</p>
                    {!hasEmail && normalized !== 'delivered' && normalized !== 'cancelled' && (
                      <div className="flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 w-fit" data-testid={`email-missing-${order.id}`}>
                        <Mail className="w-3 h-3 text-amber-600" />
                        <span className="text-[10px] font-semibold text-amber-700">Email needed for invoice</span>
                      </div>
                    )}
                  </div>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold" style={{ background: status.bg, color: status.color }}>
                    <StatusIcon className="w-3.5 h-3.5" />{status.label}
                  </span>
                </div>
                {order.prescription_url && (
                  <a href={order.prescription_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 mb-2">
                    <FileCheck className="w-3.5 h-3.5" /> View Prescription
                  </a>
                )}
                <div className="text-xs text-gray-600 mb-3">
                  {(order.items || []).slice(0, 3).map((item, i) => (
                    <span key={i}>{item.name || item.medicine_name} x{item.quantity}{i < Math.min(order.items.length, 3) - 1 ? ', ' : ''}</span>
                  ))}
                  {(order.items || []).length > 3 && <span className="text-gray-400"> +{order.items.length - 3} more</span>}
                </div>
                {/* Invoice section */}
                {normalized !== 'cancelled' && (
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {hasInvoice ? (
                      <>
                        <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200" data-testid={`invoice-uploaded-${order.id}`}>
                          <FileCheck className="w-3 h-3" /> Invoice Uploaded
                        </span>
                        {!order.invoice_sent && (
                          <button onClick={() => s.sendInvoiceToCustomer(order.order_id || order.id)}
                            disabled={s.sendingInvoice === (order.order_id || order.id)}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                            data-testid={`send-invoice-${order.id}`}>
                            {s.sendingInvoice === (order.order_id || order.id) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                            Send to Customer
                          </button>
                        )}
                        {order.invoice_sent && (
                          <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Sent
                          </span>
                        )}
                      </>
                    ) : (
                      <button onClick={() => s.triggerInvoiceUpload(order.order_id || order.id)}
                        disabled={s.uploadingInvoice === (order.order_id || order.id)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-colors ${
                          needsInvoiceForNext ? 'bg-red-50 text-red-700 border-red-300 animate-pulse' : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
                        }`}
                        data-testid={`upload-invoice-${order.id}`}>
                        {s.uploadingInvoice === (order.order_id || order.id) ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileUp className="w-3 h-3" />}
                        {needsInvoiceForNext ? 'Upload Invoice (Required!)' : 'Upload Invoice'}
                      </button>
                    )}
                  </div>
                )}
                {/* Send Delivery Tracking Link - shown for shipped orders */}
                {normalized === 'shipped' && (
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => {
                        const orderId = order.order_id || order.id;
                        const domain = window.location.origin;
                        const link = `${domain}/deliver/${orderId}`;
                        const msg = encodeURIComponent(`Orange Pharmacy Delivery\nOrder #${orderId}\nCustomer: ${order.patient_name || order.customer_name || 'Customer'}\nAddress: ${order.delivery_address || order.address?.line1 || ''}\n\nOpen this link to start tracking & confirm delivery:\n${link}`);
                        window.open(`https://wa.me/?text=${msg}`, '_blank');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
                      data-testid={`send-tracking-link-${order.id}`}>
                      <Navigation className="w-3.5 h-3.5" /> Send Delivery Link
                    </button>
                    <button
                      onClick={() => {
                        const orderId = order.order_id || order.id;
                        const link = `${window.location.origin}/deliver/${orderId}`;
                        navigator.clipboard?.writeText(link);
                      }}
                      className="px-2 py-1.5 rounded-lg text-[10px] font-medium bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100"
                      data-testid={`copy-tracking-link-${order.id}`}>
                      Copy Link
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-gray-900"><IndianRupee className="w-3 h-3 inline" />{(order.total || order.grand_total || 0).toFixed(2)}</p>
                  <div className="flex gap-2">
                    {nextStatus && (
                      <Button onClick={() => s.updateOrderStatus(order.order_id || order.id, nextStatus)}
                        className={`h-8 rounded-lg text-white text-xs gap-1 ${needsInvoiceForNext ? 'bg-gray-400 hover:bg-gray-500' : 'bg-orange-500 hover:bg-orange-600'}`}
                        data-testid={`advance-${order.id}`}>
                        <ChevronRight className="w-3 h-3" /> {ORDER_STATUSES.find(st => st.key === nextStatus)?.label}
                      </Button>
                    )}
                    {normalized !== 'cancelled' && normalized !== 'delivered' && (
                      <Button onClick={() => s.updateOrderStatus(order.order_id || order.id, 'cancelled')} variant="outline" className="h-8 rounded-lg text-xs text-red-500 border-red-200 hover:bg-red-50">Cancel</Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrangeOrdersTab;

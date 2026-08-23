import React, { useState, useEffect } from 'react';
import { RotateCcw, Clock, ChevronRight, Pill } from 'lucide-react';

/* Smart Reorder Widget — "Your refill is due soon. One-tap reorder." */
const SmartReorderWidget = ({ lastOrders = [], onReorder, API }) => {
  const [orders, setOrders] = useState(lastOrders);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lastOrders.length === 0 && API) {
      fetch(`${API}/api/pharmacy/my-recent-orders?limit=3`)
        .then(r => r.json())
        .then(d => { if (d.orders) setOrders(d.orders); })
        .catch(() => {});
    }
  }, [API, lastOrders]);

  if (orders.length === 0) return null;

  const getDaysAgo = (date) => {
    const d = new Date(date);
    const now = new Date();
    return Math.floor((now - d) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="mx-4 my-3" data-testid="smart-reorder-widget">
      <div className="rounded-2xl overflow-hidden" style={{
        background: 'linear-gradient(135deg, rgba(249,115,22,0.06), rgba(234,88,12,0.04))',
        border: '1px solid rgba(249,115,22,0.15)',
      }}>
        <div className="px-3.5 pt-3 pb-2 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}>
            <RotateCcw className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-stone-800">Quick Reorder</p>
            <p className="text-[10px] text-stone-400">Your recent medicines — one tap to reorder</p>
          </div>
        </div>

        <div className="px-3 pb-3 space-y-1.5">
          {orders.slice(0, 3).map((order, i) => {
            const days = getDaysAgo(order.created_at || order.date);
            const itemCount = order.items?.length || 0;
            const firstItem = order.items?.[0]?.name || order.items?.[0]?.medicine_name || 'Order';
            
            return (
              <button
                key={order.order_id || order._id || i}
                onClick={() => onReorder?.(order)}
                disabled={loading}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/60 hover:bg-white active:scale-[0.98] transition-all text-left"
                data-testid={`reorder-btn-${i}`}
              >
                <Pill className="w-4 h-4 text-orange-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-stone-700 truncate">
                    {firstItem}{itemCount > 1 ? ` +${itemCount - 1} more` : ''}
                  </p>
                  <p className="text-[9px] text-stone-400 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" /> {days} days ago
                  </p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-orange-300 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SmartReorderWidget;

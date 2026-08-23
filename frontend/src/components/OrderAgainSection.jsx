import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import axios from 'axios';
import { RotateCcw, ShoppingBag, Clock, ChevronRight, Loader2, Package } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const OrderAgainSection = () => {
  const navigate = useNavigate();
  const { addToPharmacyCart } = useCart();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(null);

  useEffect(() => {
    const phone = localStorage.getItem('guestMobile');
    if (!phone) { setLoading(false); return; }

    axios.get(`${API}/orders/history?phone=${phone}&limit=3`)
      .then(res => {
        const validOrders = (res.data.orders || []).filter(o => 
          (o.medicines?.length > 0 || o.items?.length > 0)
        ).slice(0, 3);
        setOrders(validOrders);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleReorder = (order) => {
    const items = order.medicines || order.items || [];
    if (!items.length) return;

    setReordering(order.id || order.order_id);
    items.forEach(item => {
      addToPharmacyCart({
        id: item.id || item.name,
        name: item.name,
        price: item.price || item.sale_price || item.mrp || 0,
        mrp: item.mrp || item.price || 0,
        quantity: item.quantity || 1,
        manufacturer: item.manufacturer,
        form: item.form,
        store: item.store || 'pharmacy',
      });
    });

    toast.success(`${items.length} items added to cart`);
    setTimeout(() => {
      setReordering(null);
      navigate('/cart');
    }, 400);
  };

  if (loading) return null;
  if (!orders.length) return null;

  return (
    <div className="mb-6" data-testid="order-again-section">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #F97316, #EA580C)' }}>
            <RotateCcw className="w-3.5 h-3.5 text-white" />
          </div>
          <h2 className="text-base font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Order Again
          </h2>
        </div>
        <button
          onClick={() => navigate('/pharmacy')}
          className="text-[10px] text-orange-400/70 hover:text-orange-300 transition-colors font-medium flex items-center gap-0.5"
          data-testid="view-all-orders"
        >
          View all <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {orders.map((order) => {
          const items = order.medicines || order.items || [];
          const orderId = order.id || order.order_id || order.booking_id;
          const isReordering = reordering === orderId;
          const orderDate = order.created_at
            ? new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
            : '';

          return (
            <div
              key={orderId}
              className="flex-shrink-0 w-[260px] rounded-2xl p-3.5 relative overflow-hidden group"
              style={{
                background: 'linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(234,88,12,0.04) 100%)',
                border: '1px solid rgba(249,115,22,0.15)',
              }}
              data-testid={`order-again-card-${orderId}`}
            >
              {/* Top row: date + amount */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-orange-400/60" />
                  <span className="text-[10px] text-white/40 font-medium">{orderDate}</span>
                </div>
                <span className="text-sm font-bold text-orange-400">
                  {'\u20B9'}{Math.round(order.total_amount || order.total || order.amount || 0)}
                </span>
              </div>

              {/* Items list */}
              <div className="space-y-1 mb-3">
                {items.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(249,115,22,0.1)' }}>
                      <Package className="w-2.5 h-2.5 text-orange-400/70" />
                    </div>
                    <span className="text-xs text-white/60 truncate flex-1">
                      {item.name}
                    </span>
                    <span className="text-[10px] text-white/30 flex-shrink-0">x{item.quantity || 1}</span>
                  </div>
                ))}
                {items.length > 3 && (
                  <span className="text-[10px] text-orange-400/50 pl-7">+{items.length - 3} more</span>
                )}
              </div>

              {/* Reorder button */}
              <button
                onClick={() => handleReorder(order)}
                disabled={isReordering}
                className="w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.97]"
                style={{
                  background: isReordering
                    ? 'rgba(249,115,22,0.15)'
                    : 'linear-gradient(135deg, #F97316, #EA580C)',
                  color: isReordering ? '#F97316' : '#fff',
                  boxShadow: isReordering ? 'none' : '0 2px 8px rgba(249,115,22,0.3)',
                }}
                data-testid={`reorder-btn-${orderId}`}
              >
                {isReordering ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <ShoppingBag className="w-3.5 h-3.5" />
                    Reorder
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderAgainSection;

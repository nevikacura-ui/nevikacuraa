import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  RotateCcw, ShoppingCart, Package, Clock, ChevronRight, 
  Loader2, FileText, Calendar, X, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

/**
 * Quick Reorder Component
 * Shows order history and allows one-tap reorder
 */
export const QuickReorder = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { addToPharmacyCart } = useCart();
  const [orders, setOrders] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(null);
  const [activeTab, setActiveTab] = useState('orders');

  // Fetch order history
  useEffect(() => {
    if (!isOpen) return;
    
    const fetchHistory = async () => {
      try {
        const phone = localStorage.getItem('guestMobile');
        if (!phone) {
          setLoading(false);
          return;
        }

        const response = await axios.get(`${API}/orders/history?phone=${phone}&limit=10`);
        setOrders(response.data.orders || []);
        setPrescriptions(response.data.prescriptions || []);
      } catch (error) {
        console.log('Failed to fetch order history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [isOpen]);

  // Handle reorder
  const handleReorder = async (order) => {
    const items = order.items || order.medicines || [];
    if (items.length === 0) {
      toast.error('No items in this order');
      return;
    }

    setReordering(order.order_id || order.booking_id);
    try {
      // Add all items from order to cart
      for (const item of items) {
        addToPharmacyCart({
          id: item.id || item.name,
          name: item.name,
          price: item.price || 0,
          quantity: item.quantity || 1,
          manufacturer: item.manufacturer,
          form: item.form,
        });
      }

      toast.success(`${items.length} items added to cart!`);
      onClose();
      
      // Navigate to checkout
      setTimeout(() => {
        navigate('/pharmacy/checkout');
      }, 300);
    } catch (error) {
      toast.error('Failed to reorder. Please try again.');
    } finally {
      setReordering(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg bg-[#0f0f0f] rounded-t-3xl max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="sticky top-0 bg-[#0f0f0f] border-b border-white/10 p-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Quick Reorder</h2>
                <p className="text-xs text-zinc-500">Reorder from your history</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'orders'
                  ? 'bg-orange-500 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <Package className="w-4 h-4 inline mr-2" />
              Orders ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab('prescriptions')}
              className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'prescriptions'
                  ? 'bg-orange-500 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Prescriptions ({prescriptions.length})
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto p-4 space-y-3" style={{ maxHeight: 'calc(80vh - 150px)' }}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-3" />
              <p className="text-zinc-500 text-sm">Loading your history...</p>
            </div>
          ) : activeTab === 'orders' ? (
            orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Package className="w-12 h-12 text-zinc-600 mb-3" />
                <p className="text-zinc-400 text-sm">No previous orders found</p>
                <Button
                  onClick={() => { onClose(); navigate('/pharmacy'); }}
                  className="mt-4 bg-orange-500 hover:bg-orange-600"
                >
                  Start Shopping
                </Button>
              </div>
            ) : (
              orders.map((order) => (
                <OrderCard
                  key={order.order_id}
                  order={order}
                  onReorder={() => handleReorder(order)}
                  isReordering={reordering === order.order_id}
                />
              ))
            )
          ) : (
            prescriptions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <FileText className="w-12 h-12 text-zinc-600 mb-3" />
                <p className="text-zinc-400 text-sm">No prescriptions found</p>
              </div>
            ) : (
              prescriptions.map((prescription, idx) => (
                <PrescriptionCard
                  key={prescription.appointment_id || idx}
                  prescription={prescription}
                />
              ))
            )
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Order Card Component
 */
const OrderCard = ({ order, onReorder, isReordering }) => {
  const items = order.items || order.medicines || [];
  const itemCount = items.length;
  const orderDate = order.created_at 
    ? new Date(order.created_at).toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short',
        year: 'numeric'
      })
    : 'Unknown date';

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 hover:border-orange-500/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-zinc-500">#{(order.order_id || order.booking_id)?.toString().slice(-8)}</span>
            {order.status === 'delivered' && (
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Delivered
              </span>
            )}
          </div>
          <p className="text-white font-medium">{itemCount} items</p>
          <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
            <Calendar className="w-3 h-3" />
            {orderDate}
          </p>
        </div>
        <div className="text-right">
          <p className="text-orange-400 font-bold text-lg">₹{order.total_amount || order.total || order.amount || '—'}</p>
        </div>
      </div>
      
      {/* Items Preview */}
      <div className="flex flex-wrap gap-1 mb-3">
        {items.slice(0, 3).map((item, idx) => (
          <span 
            key={idx} 
            className="px-2 py-1 bg-zinc-800/50 rounded-lg text-xs text-zinc-400"
          >
            {item.name?.substring(0, 18)}{item.name?.length > 18 ? '...' : ''}
          </span>
        ))}
        {itemCount > 3 && (
          <span className="px-2 py-1 bg-zinc-800/50 rounded-lg text-xs text-orange-400">
            +{itemCount - 3} more
          </span>
        )}
      </div>
      
      {/* Reorder Button */}
      <Button
        onClick={onReorder}
        disabled={isReordering || itemCount === 0}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white disabled:bg-zinc-700 disabled:text-zinc-500"
        data-testid={`reorder-btn-${order.order_id || order.booking_id}`}
      >
        {isReordering ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : itemCount === 0 ? (
          'No items to reorder'
        ) : (
          <>
            <ShoppingCart className="w-4 h-4 mr-2" />
            Reorder All Items
          </>
        )}
      </Button>
    </div>
  );
};

/**
 * Prescription Card Component
 */
const PrescriptionCard = ({ prescription }) => {
  const prescriptionDate = prescription.created_at 
    ? new Date(prescription.created_at).toLocaleDateString('en-IN', { 
        day: 'numeric', 
        month: 'short',
        year: 'numeric'
      })
    : 'Unknown date';

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-teal-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <FileText className="w-6 h-6 text-teal-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium">{prescription.doctor_name || 'Doctor'}</p>
          <p className="text-xs text-zinc-500 flex items-center gap-1 mt-1">
            <Calendar className="w-3 h-3" />
            {prescriptionDate}
          </p>
          {prescription.notes && (
            <p className="text-xs text-zinc-400 mt-2 line-clamp-2">{prescription.notes}</p>
          )}
        </div>
        {prescription.pdf_url && (
          <a
            href={prescription.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 bg-teal-500/20 text-teal-400 text-xs rounded-lg hover:bg-teal-500/30 transition-colors"
          >
            View PDF
          </a>
        )}
      </div>
    </div>
  );
};

/**
 * Quick Reorder Button (Floating)
 * Use this in the pharmacy page header or as a FAB
 */
export const QuickReorderButton = ({ onClick, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-medium shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all hover:scale-105 active:scale-95 ${className}`}
      data-testid="quick-reorder-btn"
    >
      <RotateCcw className="w-4 h-4" />
      Refill
    </button>
  );
};

export default QuickReorder;

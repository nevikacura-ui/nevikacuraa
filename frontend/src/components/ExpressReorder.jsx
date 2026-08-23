import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  RotateCcw, ShoppingCart, Package, Clock, ChevronRight, 
  Loader2, CheckCircle2, AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

/**
 * Express Reorder Component
 * One-tap to reorder previous orders
 */
export const ExpressReorder = ({ className = '' }) => {
  const navigate = useNavigate();
  const { addToPharmacyCart } = useCart();
  const [lastOrder, setLastOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);

  // Fetch last order
  useEffect(() => {
    const fetchLastOrder = async () => {
      try {
        const phone = localStorage.getItem('guestMobile');
        if (!phone) {
          setLoading(false);
          return;
        }

        const response = await axios.get(`${API}/orders/last?phone=${phone}`);
        if (response.data && response.data.items?.length > 0) {
          setLastOrder(response.data);
        }
      } catch (error) {
        console.log('No previous orders found');
      } finally {
        setLoading(false);
      }
    };

    fetchLastOrder();
  }, []);

  // Handle reorder
  const handleReorder = async () => {
    if (!lastOrder?.items) return;

    setReordering(true);
    try {
      // Add all items from last order to cart
      for (const item of lastOrder.items) {
        addToPharmacyCart({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity || 1,
          manufacturer: item.manufacturer,
          form: item.form,
        });
      }

      toast.success(`${lastOrder.items.length} items added to cart!`);
      
      // Navigate to checkout
      setTimeout(() => {
        navigate('/pharmacy/checkout');
      }, 500);
    } catch (error) {
      toast.error('Failed to reorder. Please try again.');
    } finally {
      setReordering(false);
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse bg-zinc-800 rounded-2xl h-24 ${className}`} />
    );
  }

  if (!lastOrder) {
    return null;
  }

  const itemCount = lastOrder.items?.length || 0;
  const orderDate = lastOrder.created_at 
    ? new Date(lastOrder.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : 'Recent';

  return (
    <div className={`bg-gradient-to-r from-orange-900/30 to-amber-900/20 border border-orange-500/30 rounded-2xl p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
            <RotateCcw className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Reorder Last Order</h3>
            <p className="text-zinc-400 text-sm">
              {itemCount} items • {orderDate}
            </p>
          </div>
        </div>
        
        <Button
          onClick={handleReorder}
          disabled={reordering}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl"
          data-testid="express-reorder-btn"
        >
          {reordering ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <ShoppingCart className="w-4 h-4 mr-2" />
              Reorder
            </>
          )}
        </Button>
      </div>
      
      {/* Quick preview of items */}
      <div className="mt-3 flex flex-wrap gap-2">
        {lastOrder.items?.slice(0, 3).map((item, idx) => (
          <span 
            key={idx} 
            className="px-2 py-1 bg-zinc-800/50 rounded-lg text-xs text-zinc-300"
          >
            {item.name?.substring(0, 20)}...
          </span>
        ))}
        {itemCount > 3 && (
          <span className="px-2 py-1 bg-zinc-800/50 rounded-lg text-xs text-orange-400">
            +{itemCount - 3} more
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Reorder from Order History
 */
export const ReorderButton = ({ order, size = 'sm' }) => {
  const navigate = useNavigate();
  const { addToPharmacyCart } = useCart();
  const [loading, setLoading] = useState(false);

  const handleReorder = async () => {
    if (!order?.items) return;

    setLoading(true);
    try {
      for (const item of order.items) {
        addToPharmacyCart({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity || 1,
          manufacturer: item.manufacturer,
          form: item.form,
        });
      }

      toast.success(`${order.items.length} items added to cart!`);
      navigate('/pharmacy/checkout');
    } catch (error) {
      toast.error('Failed to reorder');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleReorder}
      disabled={loading}
      variant="outline"
      size={size}
      className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
      data-testid={`reorder-btn-${order?.order_id}`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          <RotateCcw className="w-4 h-4 mr-1" />
          Reorder
        </>
      )}
    </Button>
  );
};

export default ExpressReorder;

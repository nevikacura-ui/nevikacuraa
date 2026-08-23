import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  FlaskConical, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Truck,
  ChevronRight,
  ArrowLeft,
  ShoppingBag,
  Calendar,
  Phone,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { OrderCardSkeleton, StatsSkeleton } from '@/components/ui/skeleton-loaders';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const MyOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pharmacy: 0, diagnostic: 0, total: 0 });
  const [reordering, setReordering] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');

  // Get user phone from localStorage
  const getUserPhone = () => {
    try {
      const patientInfo = localStorage.getItem('patientInfo');
      if (patientInfo) { const p = JSON.parse(patientInfo); if (p.phone) return p.phone; }
    } catch {}
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) { const u = JSON.parse(userStr); if (u.phone) return u.phone; }
    } catch {}
    return localStorage.getItem('guestMobile') || localStorage.getItem('userPhone') || '';
  };

  const getUserEmail = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) { const u = JSON.parse(userStr); if (u.email) return u.email; }
    } catch {}
    return localStorage.getItem('patientEmail') || '';
  };

  const handleReorder = async (orderId) => {
    setReordering(orderId);
    try {
      const res = await fetch(`${API_URL}/api/pharmacy/v2/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId })
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.success(data.message || 'Reorder placed!');
        if (data.unavailable_medicines?.length > 0) {
          toast.info(`${data.unavailable_medicines.length} items were unavailable`);
        }
      } else {
        toast.error(data.detail || 'Reorder failed');
      }
    } catch {
      toast.error('Failed to reorder');
    }
    setReordering(null);
  };

  const fetchOrders = async () => {
    const phone = getUserPhone();
    const email = getUserEmail();
    if (!phone && !email) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (phone) params.append('phone', phone);
      if (email) params.append('email', email);
      
      const response = await fetch(`${API_URL}/api/orders/my-orders?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setOrders(data.orders || []);
        setStats({
          pharmacy: data.pharmacy_count || 0,
          diagnostic: data.diagnostic_count || 0,
          total: data.total_orders || 0
        });
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const getStatusColor = (status) => {
    const statusLower = (status || '').toLowerCase();
    if (statusLower.includes('deliver') || statusLower.includes('complet')) {
      return 'bg-green-100 text-green-700 border-green-200';
    }
    if (statusLower.includes('cancel')) {
      return 'bg-red-100 text-red-700 border-red-200';
    }
    if (statusLower.includes('process') || statusLower.includes('confirm')) {
      return 'bg-blue-100 text-blue-700 border-blue-200';
    }
    if (statusLower.includes('ship') || statusLower.includes('transit')) {
      return 'bg-purple-100 text-purple-700 border-purple-200';
    }
    return 'bg-yellow-100 text-yellow-700 border-yellow-200'; // pending
  };

  const getStatusIcon = (status) => {
    const statusLower = (status || '').toLowerCase();
    if (statusLower.includes('deliver') || statusLower.includes('complet')) {
      return <CheckCircle className="w-4 h-4" />;
    }
    if (statusLower.includes('cancel')) {
      return <XCircle className="w-4 h-4" />;
    }
    if (statusLower.includes('ship') || statusLower.includes('transit')) {
      return <Truck className="w-4 h-4" />;
    }
    return <Clock className="w-4 h-4" />;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            data-testid="back-button"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold">My Orders</h1>
            <p className="text-sm opacity-90">Track your medicine & lab orders</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4" data-testid="filter-tabs">
          {[
            { key: 'all', label: 'All', count: stats.total },
            { key: 'pharmacy', label: 'Medicine', count: stats.pharmacy },
            { key: 'diagnostic', label: 'Lab Tests', count: stats.diagnostic },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeFilter === tab.key 
                  ? 'bg-orange-500 text-white shadow-sm' 
                  : 'bg-white text-gray-600 border border-gray-200'
              }`}
              data-testid={`filter-${tab.key}`}
            >
              {tab.label} {tab.count > 0 && `(${tab.count})`}
            </button>
          ))}
        </div>

        {/* Track Order Quick Action */}
        <button 
          onClick={() => navigate('/order-tracking')}
          className="w-full mb-4 flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm border border-orange-100 active:scale-[0.98] transition-all"
          data-testid="track-order-btn"
        >
          <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center">
            <Truck className="w-5 h-5 text-orange-500" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-gray-800">Track Live Order</p>
            <p className="text-xs text-gray-400">Real-time delivery status</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300" />
        </button>

        {/* Orders List */}
        <div className="space-y-4" data-testid="orders-list">
          {loading ? (
            <>
              <OrderCardSkeleton />
              <OrderCardSkeleton />
              <OrderCardSkeleton />
            </>
          ) : orders.filter(o => activeFilter === 'all' || o.order_type === activeFilter).length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <ShoppingBag className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No Orders Yet</h3>
              <p className="text-gray-500 text-sm mb-4">Your orders will appear here after you place them.</p>
              <button 
                onClick={() => navigate('/orange')}
                className="px-6 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold"
                data-testid="shop-now-btn"
              >
                Shop Now
              </button>
            </div>
          ) : (
            orders.filter(o => activeFilter === 'all' || o.order_type === activeFilter).map((order, index) => (
                <div 
                  key={order.id || index}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                  data-testid={`order-card-${index}`}
                >
                  {/* Order Header */}
                  <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        order.order_type === 'pharmacy' ? 'bg-orange-100' : 'bg-blue-100'
                      }`}>
                        {order.order_type === 'pharmacy' ? (
                          <Package className="w-5 h-5 text-orange-600" />
                        ) : (
                          <FlaskConical className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{order.order_type_label}</p>
                        <p className="text-xs text-gray-500">#{(order.id || '').slice(0, 8).toUpperCase()}</p>
                      </div>
                    </div>
                    <div className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 border ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      {order.status || 'Pending'}
                    </div>
                  </div>
                  
                  {/* Order Items */}
                  <div className="p-4">
                    {order.medicines && order.medicines.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm text-gray-600">
                          {order.medicines.slice(0, 3).map(m => m.name || m).join(', ')}
                          {order.medicines.length > 3 && ` +${order.medicines.length - 3} more`}
                        </p>
                      </div>
                    )}
                    
                    {order.tests && order.tests.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm text-gray-600">
                          {order.tests.slice(0, 3).map(t => t.name || t).join(', ')}
                          {order.tests.length > 3 && ` +${order.tests.length - 3} more`}
                        </p>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-gray-500">
                        <Calendar className="w-4 h-4" />
                        {formatDate(order.created_at)}
                      </div>
                      {order.total_amount && (
                        <p className="font-bold text-green-600">₹{order.total_amount}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* View Details + Reorder */}
                  <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
                    <div 
                      className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 rounded-lg px-2 py-1 transition-colors"
                      onClick={() => navigate(`/order-tracking?id=${order.id}`)}
                    >
                      <span className="text-sm font-medium text-orange-600">View Details</span>
                      <ChevronRight className="w-5 h-5 text-orange-600" />
                    </div>
                    {order.order_type === 'pharmacy' && (order.status === 'completed' || order.status === 'delivered') && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleReorder(order.id); }}
                        disabled={reordering === order.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 text-teal-600 hover:bg-teal-100 text-xs font-medium transition-colors disabled:opacity-50"
                        data-testid={`reorder-btn-${index}`}
                      >
                        {reordering === order.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        Reorder
                      </button>
                    )}
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
};

export default MyOrders;

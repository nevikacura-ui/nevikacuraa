import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { 
  Package, Truck, Clock, TrendingUp, Gift,
  ArrowUpRight, ArrowDownRight, Minus, BarChart3,
  AlertCircle, Timer
} from 'lucide-react';
import { API, getAuthHeaders } from '@/pages/staff/staffUtils';

// TrendIndicator component
const TrendIndicator = ({ value, suffix = '%', inverted = false }) => {
  const isPositive = inverted ? value < 0 : value > 0;
  if (value > 0) return (
    <span className={`flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      <ArrowUpRight className="w-4 h-4" />+{value}{suffix}
    </span>
  );
  if (value < 0) return (
    <span className={`flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      <ArrowDownRight className="w-4 h-4" />{value}{suffix}
    </span>
  );
  return <span className="flex items-center text-gray-500 text-sm"><Minus className="w-4 h-4" />0{suffix}</span>;
};

const PharmacyAnalytics = ({ staffInfo }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('week');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/staff/analytics/pharmacy`, {
        params: { time_range: timeRange },
        headers: getAuthHeaders()
      });
      setAnalytics(res.data);
    } catch (error) {
      console.error('Error fetching pharmacy analytics:', error);
      // Demo data
      setAnalytics({
        total_orders: 89, order_change: 15.2,
        delivered: 72, delivery_rate: 80.9, pending: 12,
        avg_fulfillment_time: 45, fulfillment_change: -8,
        revenue: 156000, revenue_change: 22.5,
        loyalty_points_given: 4500,
        status_breakdown: { 'Order Booked': 5, 'Packing': 7, 'Out for Delivery': 5, 'Delivered': 72 },
        hourly_orders: [
          { hour: '9AM', orders: 8 }, { hour: '10AM', orders: 12 },
          { hour: '11AM', orders: 15 }, { hour: '12PM', orders: 10 },
          { hour: '1PM', orders: 6 }, { hour: '2PM', orders: 9 },
          { hour: '3PM', orders: 11 }, { hour: '4PM', orders: 13 }, { hour: '5PM', orders: 5 }
        ],
        top_medicines: [
          { name: 'Paracetamol 500mg', orders: 45 },
          { name: 'Metformin 500mg', orders: 32 },
          { name: 'Omeprazole 20mg', orders: 28 },
          { name: 'Vitamin D3', orders: 25 },
          { name: 'Calcium + D3', orders: 22 }
        ]
      });
    }
    setLoading(false);
  }, [timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>)}
        </div>
      </div>
    );
  }

  const maxOrders = Math.max(...(analytics?.hourly_orders?.map(h => h.orders) || [1]));

  return (
    <div className="space-y-6" data-testid="pharmacy-analytics">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-orange-600" />
          Pharmacy Performance
        </h3>
        <div className="flex gap-2">
          {['today', 'week', 'month'].map(range => (
            <Button key={range} size="sm" variant={timeRange === range ? 'default' : 'outline'}
              onClick={() => setTimeRange(range)} className={timeRange === range ? 'bg-orange-500' : ''}>
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
          <div className="flex items-start justify-between">
            <div><p className="text-sm text-orange-700">Total Orders</p>
              <p className="text-2xl font-bold text-orange-900">{analytics?.total_orders}</p></div>
            <Package className="w-8 h-8 text-orange-500 opacity-50" />
          </div>
          <TrendIndicator value={analytics?.order_change} />
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-start justify-between">
            <div><p className="text-sm text-green-700">Delivered</p>
              <p className="text-2xl font-bold text-green-900">{analytics?.delivered}</p></div>
            <Truck className="w-8 h-8 text-green-500 opacity-50" />
          </div>
          <p className="text-sm text-green-600">{analytics?.delivery_rate}% delivery rate</p>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <div className="flex items-start justify-between">
            <div><p className="text-sm text-blue-700">Avg Fulfillment</p>
              <p className="text-2xl font-bold text-blue-900">{analytics?.avg_fulfillment_time} min</p></div>
            <Timer className="w-8 h-8 text-blue-500 opacity-50" />
          </div>
          <TrendIndicator value={analytics?.fulfillment_change} suffix=" min" inverted />
        </Card>

        <Card className="p-4 bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
          <div className="flex items-start justify-between">
            <div><p className="text-sm text-amber-700">Loyalty Points</p>
              <p className="text-2xl font-bold text-amber-900">{analytics?.loyalty_points_given?.toLocaleString()}</p></div>
            <Gift className="w-8 h-8 text-amber-500 opacity-50" />
          </div>
          <p className="text-sm text-amber-600">Given this {timeRange}</p>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h4 className="font-medium mb-4 text-gray-700">Order Pipeline</h4>
          <div className="space-y-3">
            {Object.entries(analytics?.status_breakdown || {}).map(([status, count]) => {
              const colors = { 'Order Booked': 'bg-blue-500', 'Packing': 'bg-yellow-500', 'Out for Delivery': 'bg-purple-500', 'Delivered': 'bg-green-500' };
              const width = (count / analytics?.total_orders) * 100;
              return (
                <div key={status} className="space-y-1">
                  <div className="flex justify-between text-sm"><span className="text-gray-600">{status}</span><span className="font-medium">{count}</span></div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full ${colors[status]} rounded-full`} style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-4">
          <h4 className="font-medium mb-4 text-gray-700">Orders by Hour</h4>
          <div className="flex items-end gap-1 h-32">
            {analytics?.hourly_orders?.map((hour, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-orange-400 rounded-t hover:bg-orange-500 transition-colors cursor-pointer"
                  style={{ height: `${(hour.orders / maxOrders) * 100}px` }} title={`${hour.orders} orders`} />
                <span className="text-xs text-gray-500 -rotate-45 origin-top-left">{hour.hour}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <h4 className="font-medium mb-4 text-gray-700">Top Ordered Medicines</h4>
        <div className="grid md:grid-cols-5 gap-3">
          {analytics?.top_medicines?.map((med, i) => (
            <div key={i} className="p-3 bg-gray-50 rounded-lg text-center">
              <p className="text-xs text-gray-500 truncate" title={med.name}>{med.name}</p>
              <p className="text-lg font-bold text-orange-600">{med.orders}</p>
              <p className="text-xs text-gray-400">orders</p>
            </div>
          ))}
        </div>
      </Card>

      {analytics?.pending > 5 && (
        <Card className="p-4 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div><p className="font-medium text-amber-800">{analytics?.pending} Orders Pending</p>
              <p className="text-sm text-amber-600">Consider prioritizing older orders for delivery</p></div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default PharmacyAnalytics;

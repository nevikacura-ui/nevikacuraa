import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import {
  IndianRupee, TrendingUp, ShoppingBag, Receipt, Users,
  Package, AlertTriangle, Calendar, Loader2, ArrowUp, ArrowDown
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;
const getAuth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('staffToken')}` } });

function StatCard({ label, value, prefix, icon: Icon, color = 'orange', sub }) {
  const colors = {
    orange: 'bg-orange-50 border-orange-200 text-orange-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    red: 'bg-red-50 border-red-200 text-red-600',
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600',
    amber: 'bg-amber-50 border-amber-200 text-amber-600',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium opacity-80">{label}</p>
        {Icon && <Icon className="w-4 h-4 opacity-60" />}
      </div>
      <p className="text-xl font-bold">{prefix}{typeof value === 'number' ? value.toLocaleString('en-IN') : value}</p>
      {sub && <p className="text-[10px] mt-1 opacity-70">{sub}</p>}
    </div>
  );
}

export default function ReportsPanel() {
  const [dailyReport, setDailyReport] = useState(null);
  const [salesSummary, setSalesSummary] = useState(null);
  const [topSelling, setTopSelling] = useState(null);
  const [stockReport, setStockReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('daily');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [daily, sales, top, stock] = await Promise.all([
          axios.get(`${API}/api/pharmacy-billing/reports/daily-sales`, getAuth()),
          axios.get(`${API}/api/pharmacy-billing/reports/sales-summary?days=7`, getAuth()),
          axios.get(`${API}/api/pharmacy-billing/reports/top-selling?days=30`, getAuth()),
          axios.get(`${API}/api/pharmacy-billing/reports/stock?filter=all`, getAuth()),
        ]);
        setDailyReport(daily.data);
        setSalesSummary(sales.data);
        setTopSelling(top.data);
        setStockReport(stock.data);
      } catch { toast.error('Failed to load reports'); }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-orange-500" /></div>;

  const tabs = [
    { key: 'daily', label: 'Today' },
    { key: 'weekly', label: '7-Day Trend' },
    { key: 'top', label: 'Top Selling' },
    { key: 'stock', label: 'Stock' },
  ];

  return (
    <div className="space-y-4" data-testid="reports-panel">
      {/* Tab Nav */}
      <div className="flex gap-1.5 bg-gray-100 rounded-xl p-1">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* TODAY */}
      {activeTab === 'daily' && dailyReport && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard label="Revenue" value={dailyReport.total_revenue} prefix="Rs " icon={IndianRupee} color="green" />
            <StatCard label="Collected" value={dailyReport.total_collected} prefix="Rs " icon={TrendingUp} color="blue" />
            <StatCard label="Due" value={dailyReport.total_due} prefix="Rs " icon={AlertTriangle} color="red" />
            <StatCard label="Bills" value={dailyReport.total_bills} icon={Receipt} color="orange" />
            <StatCard label="Discount Given" value={dailyReport.total_discount} prefix="Rs " icon={ShoppingBag} color="purple" />
            <StatCard label="GST Collected" value={dailyReport.total_gst} prefix="Rs " icon={Receipt} color="amber" />
          </div>
          {/* Payment Breakdown */}
          {Object.keys(dailyReport.payment_breakdown || {}).length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm font-semibold text-gray-700 mb-3">Payment Breakdown</p>
              <div className="flex flex-wrap gap-3">
                {Object.entries(dailyReport.payment_breakdown).map(([mode, amount]) => (
                  <div key={mode} className="bg-gray-50 rounded-lg px-4 py-2 border border-gray-100">
                    <p className="text-xs text-gray-500 capitalize">{mode}</p>
                    <p className="text-sm font-bold text-gray-900"><IndianRupee className="w-3 h-3 inline" />{amount.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* WEEKLY TREND */}
      {activeTab === 'weekly' && salesSummary && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-700">7-Day Sales Trend</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-xs text-gray-500 uppercase">
                <th className="text-left px-4 py-2">Date</th>
                <th className="text-right px-4 py-2">Bills</th>
                <th className="text-right px-4 py-2">Items</th>
                <th className="text-right px-4 py-2">Revenue</th>
                <th className="text-right px-4 py-2">Collected</th>
              </tr>
            </thead>
            <tbody>
              {salesSummary.summary?.map((day, i) => (
                <tr key={day.date} className="border-b border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 font-medium text-gray-900">
                    {day.date} {i === 0 && <span className="text-[10px] text-orange-500 ml-1">TODAY</span>}
                  </td>
                  <td className="text-right px-4 text-gray-600">{day.bills}</td>
                  <td className="text-right px-4 text-gray-600">{day.items}</td>
                  <td className="text-right px-4 font-semibold text-gray-900"><IndianRupee className="w-3 h-3 inline" />{(day.revenue || 0).toFixed(0)}</td>
                  <td className="text-right px-4 text-green-600"><IndianRupee className="w-3 h-3 inline" />{(day.collected || 0).toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TOP SELLING */}
      {activeTab === 'top' && topSelling && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-700">Top Selling (Last 30 Days)</p>
          </div>
          {topSelling.top_items?.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No sales data yet</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-xs text-gray-500 uppercase">
                  <th className="text-left px-4 py-2">#</th>
                  <th className="text-left px-4 py-2">Medicine</th>
                  <th className="text-right px-4 py-2">Qty Sold</th>
                  <th className="text-right px-4 py-2">Revenue</th>
                  <th className="text-right px-4 py-2">Times Sold</th>
                </tr>
              </thead>
              <tbody>
                {topSelling.top_items?.map((item, i) => (
                  <tr key={item.name} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 font-medium text-gray-900">{item.name}</td>
                    <td className="text-right px-4 font-semibold text-gray-900">{item.total_qty}</td>
                    <td className="text-right px-4 text-green-600"><IndianRupee className="w-3 h-3 inline" />{(item.total_revenue || 0).toFixed(0)}</td>
                    <td className="text-right px-4 text-gray-600">{item.times_sold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* STOCK REPORT */}
      {activeTab === 'stock' && stockReport && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Medicines" value={stockReport.stats?.total_items || 0} icon={Package} color="blue" />
            <StatCard label="Low Stock" value={stockReport.stats?.low_stock || 0} icon={AlertTriangle} color="amber" />
            <StatCard label="Out of Stock" value={stockReport.stats?.out_of_stock || 0} icon={AlertTriangle} color="red" />
            <StatCard label="Stock Value" value={(stockReport.stats?.total_stock_value || 0).toFixed(0)} prefix="Rs " icon={IndianRupee} color="green" />
          </div>
          {stockReport.medicines?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-xs text-gray-500 uppercase">
                    <th className="text-left px-4 py-2">Medicine</th>
                    <th className="text-left px-4 py-2">Category</th>
                    <th className="text-right px-4 py-2">Stock</th>
                    <th className="text-right px-4 py-2">MRP</th>
                    <th className="text-left px-4 py-2">Expiry</th>
                  </tr>
                </thead>
                <tbody>
                  {stockReport.medicines?.slice(0, 30).map(m => (
                    <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-2 font-medium text-gray-900 text-xs">{m.name}</td>
                      <td className="px-4 text-gray-500 text-xs">{m.category || '-'}</td>
                      <td className={`text-right px-4 font-bold text-xs ${m.stock_quantity <= 0 ? 'text-red-600' : m.stock_quantity < 10 ? 'text-amber-600' : 'text-gray-900'}`}>
                        {m.stock_quantity}
                      </td>
                      <td className="text-right px-4 text-gray-600 text-xs">{m.mrp || '-'}</td>
                      <td className="px-4 text-gray-500 text-xs">{m.expiry || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Search, Phone, User, IndianRupee, ChevronRight, Loader2,
  Plus, Receipt, AlertTriangle
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;
const getAuth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('staffToken')}` } });

export default function CustomerManager() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDues, setShowDues] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [history, setHistory] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newCust, setNewCust] = useState({ name: '', phone: '', email: '', address: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 30 });
      if (search) params.set('search', search);
      if (showDues) params.set('has_dues', true);
      const res = await axios.get(`${API}/api/pharmacy-billing/customers?${params}`, getAuth());
      setCustomers(res.data.customers || []);
      setTotalPages(res.data.pages || 1);
    } catch { toast.error('Failed to load customers'); }
    setLoading(false);
  }, [search, showDues, page]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const fetchHistory = async (cust) => {
    setSelectedCustomer(cust);
    try {
      const res = await axios.get(`${API}/api/pharmacy-billing/customers/${cust.id}/history`, getAuth());
      setHistory(res.data.bills || []);
    } catch { setHistory([]); }
  };

  const addCustomer = async () => {
    if (!newCust.name || !newCust.phone) { toast.error('Name & phone required'); return; }
    try {
      await axios.post(`${API}/api/pharmacy-billing/customers`, newCust, getAuth());
      toast.success('Customer added!');
      setShowAdd(false);
      setNewCust({ name: '', phone: '', email: '', address: '' });
      fetchCustomers();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  if (selectedCustomer) {
    return (
      <div className="space-y-4" data-testid="customer-detail">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setSelectedCustomer(null)} className="h-9 rounded-xl text-sm">
            Back
          </Button>
          <h3 className="text-lg font-bold text-gray-900">{selectedCustomer.name}</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Phone</p>
            <p className="text-sm font-semibold text-gray-900">{selectedCustomer.phone}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Total Purchases</p>
            <p className="text-sm font-semibold text-gray-900"><IndianRupee className="w-3 h-3 inline" />{(selectedCustomer.total_purchases || 0).toFixed(0)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Visits</p>
            <p className="text-sm font-semibold text-gray-900">{selectedCustomer.visit_count || 0}</p>
          </div>
          <div className={`rounded-xl border p-4 ${selectedCustomer.total_due > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <p className="text-xs text-gray-500">Outstanding Due</p>
            <p className={`text-sm font-semibold ${selectedCustomer.total_due > 0 ? 'text-red-600' : 'text-green-600'}`}>
              <IndianRupee className="w-3 h-3 inline" />{(selectedCustomer.total_due || 0).toFixed(0)}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100">
            <h4 className="text-sm font-semibold text-gray-700">Purchase History</h4>
          </div>
          <div className="divide-y divide-gray-50">
            {history.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No purchase history</p>
            ) : history.map(bill => (
              <div key={bill.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">{bill.bill_number}</p>
                  <p className="text-xs text-gray-500">{bill.date} &middot; {bill.item_count || 0} items</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900"><IndianRupee className="w-3 h-3 inline" />{(bill.grand_total || 0).toFixed(2)}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    bill.status === 'paid' ? 'bg-green-100 text-green-700' :
                    bill.status === 'credit' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>{bill.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="customer-manager">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or phone..." className="pl-10 h-10 bg-white border-gray-200 rounded-xl text-sm" />
        </div>
        <Button onClick={() => setShowDues(!showDues)} variant={showDues ? 'default' : 'outline'}
          className={`h-10 rounded-xl text-sm gap-1.5 ${showDues ? 'bg-red-500 hover:bg-red-600 text-white' : 'border-gray-200'}`}>
          <AlertTriangle className="w-4 h-4" /> Dues Only
        </Button>
        <Button onClick={() => setShowAdd(!showAdd)} className="h-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm gap-1.5">
          <Plus className="w-4 h-4" /> Add Customer
        </Button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-3">New Customer</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Input value={newCust.name} onChange={e => setNewCust(p => ({ ...p, name: e.target.value }))}
              placeholder="Name *" className="h-9 text-sm rounded-lg" />
            <Input value={newCust.phone} onChange={e => setNewCust(p => ({ ...p, phone: e.target.value }))}
              placeholder="Phone *" className="h-9 text-sm rounded-lg" />
            <Input value={newCust.email} onChange={e => setNewCust(p => ({ ...p, email: e.target.value }))}
              placeholder="Email" className="h-9 text-sm rounded-lg" />
            <Button onClick={addCustomer} className="h-9 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm">Save</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-orange-500" /></div>
      ) : customers.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No customers found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50">
          {customers.map(cust => (
            <button key={cust.id} onClick={() => fetchHistory(cust)}
              className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-orange-50/50 transition-colors"
              data-testid={`customer-${cust.id}`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{cust.name}</p>
                  <p className="text-xs text-gray-500">{cust.phone} &middot; {cust.visit_count || 0} visits</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total: <IndianRupee className="w-2.5 h-2.5 inline" />{(cust.total_purchases || 0).toFixed(0)}</p>
                  {cust.total_due > 0 && (
                    <p className="text-xs text-red-600 font-medium">Due: <IndianRupee className="w-2.5 h-2.5 inline" />{cust.total_due.toFixed(0)}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            </button>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} variant="outline" className="h-8 text-xs rounded-lg">Prev</Button>
          <span className="text-sm text-gray-500 py-1">Page {page} of {totalPages}</span>
          <Button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} variant="outline" className="h-8 text-xs rounded-lg">Next</Button>
        </div>
      )}
    </div>
  );
}

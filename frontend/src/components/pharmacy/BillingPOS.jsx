import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import { useDebouncedCallback } from 'use-debounce';
import {
  Search, Plus, Minus, Trash2, IndianRupee, User, Phone,
  ShoppingCart, CreditCard, Banknote, Smartphone, Receipt, Loader2, X
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;
const getAuth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('staffToken')}` } });

const PAYMENT_MODES = [
  { key: 'cash', label: 'Cash', icon: Banknote, color: '#16a34a' },
  { key: 'upi', label: 'UPI', icon: Smartphone, color: '#7c3aed' },
  { key: 'card', label: 'Card', icon: CreditCard, color: '#2563eb' },
  { key: 'credit', label: 'Credit', icon: Receipt, color: '#dc2626' },
];

export default function BillingPOS({ onBillCreated }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [customerName, setCustomerName] = useState('Walk-in');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [customerLookup, setCustomerLookup] = useState(null);
  const searchRef = useRef(null);
  const suggestRef = useRef(null);

  const debouncedSearch = useDebouncedCallback(async (q) => {
    if (!q || q.length < 2) { setSuggestions([]); return; }
    try {
      const res = await axios.get(`${API}/api/pharmacy-billing/medicine-search?q=${encodeURIComponent(q)}`, getAuth());
      setSuggestions(res.data.medicines || []);
      setShowSuggestions(true);
    } catch { setSuggestions([]); }
  }, 250);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    debouncedSearch(e.target.value);
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target) && !searchRef.current?.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const addToCart = useCallback((med) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.medicine_id === med.id);
      if (existing) {
        return prev.map(i => i.medicine_id === med.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, {
        medicine_id: med.id,
        name: med.name,
        mrp: med.mrp || 0,
        discount_percent: med.discount_percent || 0,
        gst_percent: 0,
        quantity: 1,
        batch_no: med.batch_no || '',
        expiry: med.expiry || '',
        hsn_code: med.hsn_code || '',
        stock: med.stock_quantity || 0,
        unit: med.unit || 'Unit',
      }];
    });
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    searchRef.current?.focus();
  }, []);

  const updateQuantity = (medId, delta) => {
    setCartItems(prev => prev.map(i => {
      if (i.medicine_id === medId) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const updateItemField = (medId, field, value) => {
    setCartItems(prev => prev.map(i => i.medicine_id === medId ? { ...i, [field]: value } : i));
  };

  const removeItem = (medId) => {
    setCartItems(prev => prev.filter(i => i.medicine_id !== medId));
  };

  // Customer phone lookup
  const lookupCustomer = useDebouncedCallback(async (phone) => {
    if (!phone || phone.length < 10) { setCustomerLookup(null); return; }
    try {
      const res = await axios.get(`${API}/api/pharmacy-billing/customers/lookup/${phone}`, getAuth());
      if (res.data.found) {
        setCustomerLookup(res.data.customer);
        setCustomerName(res.data.customer.name);
      } else {
        setCustomerLookup(null);
      }
    } catch { setCustomerLookup(null); }
  }, 400);

  const handlePhoneChange = (e) => {
    setCustomerPhone(e.target.value);
    lookupCustomer(e.target.value);
  };

  // Calculations
  const subtotal = cartItems.reduce((s, i) => s + (i.mrp * (1 - i.discount_percent / 100) * i.quantity), 0);
  const totalDiscount = cartItems.reduce((s, i) => s + ((i.mrp * i.discount_percent / 100) * i.quantity), 0);
  const totalGST = cartItems.reduce((s, i) => {
    const unitPrice = i.mrp * (1 - i.discount_percent / 100);
    return s + (unitPrice * i.quantity * i.gst_percent / 100);
  }, 0);
  const grandTotal = subtotal + totalGST;
  const dueAmount = Math.max(0, grandTotal - (parseFloat(paidAmount) || grandTotal));

  const handleCreateBill = async () => {
    if (!cartItems.length) { toast.error('Add items to bill'); return; }
    setSaving(true);
    try {
      const res = await axios.post(`${API}/api/pharmacy-billing/bills`, {
        customer_name: customerName,
        customer_phone: customerPhone,
        items: cartItems.map(i => ({
          medicine_id: i.medicine_id, name: i.name, quantity: i.quantity,
          mrp: i.mrp, discount_percent: i.discount_percent, gst_percent: i.gst_percent,
          batch_no: i.batch_no, expiry: i.expiry, hsn_code: i.hsn_code,
        })),
        payment_mode: paymentMode,
        paid_amount: paidAmount ? parseFloat(paidAmount) : undefined,
      }, getAuth());

      if (res.data.success) {
        toast.success(`Bill ${res.data.bill.bill_number} created!`);
        setCartItems([]);
        setCustomerName('Walk-in');
        setCustomerPhone('');
        setPaidAmount('');
        setCustomerLookup(null);
        onBillCreated?.(res.data.bill);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create bill');
    }
    setSaving(false);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full" data-testid="billing-pos">
      {/* LEFT: Item Search & Cart */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search Bar */}
        <div className="relative mb-3" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search medicine by name or scan barcode..."
            className="pl-10 h-11 bg-white border-gray-200 text-gray-900 rounded-xl shadow-sm text-sm"
            data-testid="billing-search"
            autoFocus
          />
          {showSuggestions && suggestions.length > 0 && (
            <div ref={suggestRef} className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
              {suggestions.map(med => (
                <button key={med.id} onClick={() => addToCart(med)}
                  className="w-full text-left px-4 py-2.5 hover:bg-orange-50 flex items-center justify-between border-b border-gray-50 last:border-0 transition-colors"
                  data-testid={`suggest-${med.id}`}>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{med.name}</p>
                    <p className="text-xs text-gray-500">{med.category} {med.manufacturer ? `· ${med.manufacturer}` : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">
                      <IndianRupee className="w-3 h-3 inline" />{med.mrp || 0}
                    </p>
                    <p className={`text-xs ${med.stock_quantity > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {med.stock_quantity > 0 ? `${med.stock_quantity} in stock` : 'Out of stock'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart Table */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-4 py-2.5 flex items-center border-b border-gray-200">
            <ShoppingCart className="w-4 h-4 text-orange-500 mr-2" />
            <span className="text-sm font-semibold text-gray-700">Bill Items ({cartItems.length})</span>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 380px)' }}>
            {cartItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <ShoppingCart className="w-10 h-10 mb-3 opacity-30" />
                <p className="text-sm">Search & add medicines to start billing</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr className="text-xs text-gray-500 uppercase">
                    <th className="text-left px-3 py-2">Item</th>
                    <th className="text-center px-2 py-2 w-20">MRP</th>
                    <th className="text-center px-2 py-2 w-16">Disc%</th>
                    <th className="text-center px-2 py-2 w-24">Qty</th>
                    <th className="text-right px-3 py-2 w-20">Total</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {cartItems.map(item => {
                    const unitPrice = item.mrp * (1 - item.discount_percent / 100);
                    const lineTotal = unitPrice * item.quantity;
                    return (
                      <tr key={item.medicine_id} className="border-b border-gray-50 hover:bg-orange-50/30" data-testid={`cart-item-${item.medicine_id}`}>
                        <td className="px-3 py-2">
                          <p className="font-medium text-gray-900 text-xs">{item.name}</p>
                          <p className="text-[10px] text-gray-400">{item.unit}{item.batch_no ? ` · ${item.batch_no}` : ''}</p>
                        </td>
                        <td className="text-center px-1">
                          <Input value={item.mrp} onChange={e => updateItemField(item.medicine_id, 'mrp', parseFloat(e.target.value) || 0)}
                            className="h-7 w-16 text-xs text-center bg-white border-gray-200 rounded-lg mx-auto" type="number" />
                        </td>
                        <td className="text-center px-1">
                          <Input value={item.discount_percent} onChange={e => updateItemField(item.medicine_id, 'discount_percent', parseFloat(e.target.value) || 0)}
                            className="h-7 w-14 text-xs text-center bg-white border-gray-200 rounded-lg mx-auto" type="number" />
                        </td>
                        <td className="text-center px-1">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => updateQuantity(item.medicine_id, -1)} className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                              <Minus className="w-3 h-3" />
                            </button>
                            <Input value={item.quantity} onChange={e => updateItemField(item.medicine_id, 'quantity', parseInt(e.target.value) || 1)}
                              className="h-7 w-10 text-xs text-center bg-white border-gray-200 rounded-lg font-bold" type="number" />
                            <button onClick={() => updateQuantity(item.medicine_id, 1)} className="w-6 h-6 rounded-lg bg-orange-100 hover:bg-orange-200 flex items-center justify-center">
                              <Plus className="w-3 h-3 text-orange-600" />
                            </button>
                          </div>
                        </td>
                        <td className="text-right px-3 font-bold text-gray-900 text-xs">
                          <IndianRupee className="w-3 h-3 inline" />{lineTotal.toFixed(2)}
                        </td>
                        <td className="pr-2">
                          <button onClick={() => removeItem(item.medicine_id)} className="p-1 hover:bg-red-50 rounded-lg">
                            <X className="w-3.5 h-3.5 text-red-400 hover:text-red-600" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: Customer + Payment + Total */}
      <div className="w-full lg:w-80 flex flex-col gap-3">
        {/* Customer Info */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2.5">Customer</p>
          <div className="space-y-2">
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input value={customerPhone} onChange={handlePhoneChange}
                placeholder="Phone number" className="pl-9 h-9 text-sm bg-white border-gray-200 rounded-lg" data-testid="customer-phone" />
            </div>
            {customerLookup && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 text-xs text-green-700">
                Returning customer · {customerLookup.visit_count || 0} visits
                {customerLookup.total_due > 0 && <span className="text-red-600 ml-1">· Due: {customerLookup.total_due.toFixed(0)}</span>}
              </div>
            )}
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input value={customerName} onChange={e => setCustomerName(e.target.value)}
                placeholder="Customer name" className="pl-9 h-9 text-sm bg-white border-gray-200 rounded-lg" data-testid="customer-name" />
            </div>
          </div>
        </div>

        {/* Payment Mode */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-2.5">Payment</p>
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {PAYMENT_MODES.map(m => (
              <button key={m.key} onClick={() => setPaymentMode(m.key)}
                className={`flex flex-col items-center py-2 rounded-lg border text-xs transition-all ${paymentMode === m.key
                  ? 'border-orange-400 bg-orange-50 text-orange-700 font-semibold shadow-sm'
                  : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300'}`}
                data-testid={`pay-${m.key}`}>
                <m.icon className="w-4 h-4 mb-0.5" />
                {m.label}
              </button>
            ))}
          </div>
          {paymentMode === 'credit' && (
            <Input value={paidAmount} onChange={e => setPaidAmount(e.target.value)}
              placeholder="Partial amount paid" className="h-9 text-sm bg-white border-gray-200 rounded-lg" type="number" data-testid="paid-amount" />
          )}
        </div>

        {/* Bill Summary */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span><IndianRupee className="w-3 h-3 inline" />{subtotal.toFixed(2)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-<IndianRupee className="w-3 h-3 inline" />{totalDiscount.toFixed(2)}</span>
              </div>
            )}
            {totalGST > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>GST</span>
                <span>+<IndianRupee className="w-3 h-3 inline" />{totalGST.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-2 flex justify-between text-lg font-bold text-gray-900">
              <span>Total</span>
              <span><IndianRupee className="w-4 h-4 inline" />{grandTotal.toFixed(2)}</span>
            </div>
            {dueAmount > 0 && paymentMode === 'credit' && (
              <div className="flex justify-between text-red-600 text-xs font-medium">
                <span>Due Amount</span>
                <span><IndianRupee className="w-3 h-3 inline" />{dueAmount.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Create Bill Button */}
        <Button onClick={handleCreateBill} disabled={saving || !cartItems.length}
          className="h-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-base shadow-lg shadow-orange-200 w-full"
          data-testid="create-bill-btn">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <><Receipt className="w-5 h-5 mr-2" />Create Bill &middot; <IndianRupee className="w-4 h-4 mx-0.5" />{grandTotal.toFixed(2)}</>
          )}
        </Button>
      </div>
    </div>
  );
}

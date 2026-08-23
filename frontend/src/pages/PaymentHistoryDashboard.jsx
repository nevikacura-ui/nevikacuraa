import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, CreditCard, Clock, CheckCircle2, XCircle, 
  AlertCircle, RefreshCcw, ChevronRight, Wallet, 
  TrendingUp, Calendar, Filter, Search, Download,
  Loader2, IndianRupee, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DigitalInvoice } from '@/components/DigitalInvoice';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

/**
 * Payment History Dashboard
 * Tracks all payments, split payments, and refunds
 */

// Payment status badge
const StatusBadge = ({ status }) => {
  const config = {
    paid: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-900/30', label: 'Paid' },
    pending: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-900/30', label: 'Pending' },
    failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-900/30', label: 'Failed' },
    refunded: { icon: RefreshCcw, color: 'text-blue-400', bg: 'bg-blue-900/30', label: 'Refunded' },
    partial: { icon: AlertCircle, color: 'text-orange-400', bg: 'bg-orange-900/30', label: 'Partial' },
    processing: { icon: Loader2, color: 'text-purple-400', bg: 'bg-purple-900/30', label: 'Processing' },
  };

  const { icon: Icon, color, bg, label } = config[status] || config.pending;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${bg} ${color}`}>
      <Icon className={`w-3 h-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
      {label}
    </span>
  );
};

// Payment card component
const PaymentCard = ({ payment, onRefundRequest }) => {
  const date = new Date(payment.created_at || Date.now()).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const isSplit = payment.payment_type === 'split';
  const paidAmount = payment.paid_amount || payment.amount;
  const pendingAmount = payment.pending_amount || 0;

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 hover:border-zinc-700 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-white font-semibold">#{payment.order_id}</p>
          <p className="text-zinc-500 text-sm">{date}</p>
        </div>
        <StatusBadge status={payment.status} />
      </div>

      {/* Amount */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-zinc-400 text-sm">Total Amount</p>
          <p className="text-white text-xl font-bold">₹{payment.amount?.toFixed(2)}</p>
        </div>
        
        {isSplit && (
          <div className="text-right">
            <p className="text-green-400 text-sm">Paid: ₹{paidAmount?.toFixed(2)}</p>
            <p className="text-yellow-400 text-sm">Due: ₹{pendingAmount?.toFixed(2)}</p>
          </div>
        )}
      </div>

      {/* Split Payment Progress */}
      {isSplit && (
        <div className="mb-3">
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all"
              style={{ width: `${(paidAmount / payment.amount) * 100}%` }}
            />
          </div>
          <p className="text-zinc-500 text-xs mt-1">
            {Math.round((paidAmount / payment.amount) * 100)}% paid
          </p>
        </div>
      )}

      {/* Payment Method */}
      <div className="flex items-center gap-2 mb-3 text-zinc-400 text-sm">
        <CreditCard className="w-4 h-4" />
        <span className="capitalize">{payment.method?.replace('_', ' ') || 'Pay Later'}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t border-zinc-800">
        <DigitalInvoice order={payment} />
        
        {payment.status === 'paid' && !payment.refund_requested && (
          <Button
            onClick={() => onRefundRequest(payment)}
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <RefreshCcw className="w-4 h-4 mr-1" />
            Request Refund
          </Button>
        )}

        {payment.status === 'pending' && isSplit && (
          <Button
            size="sm"
            className="bg-orange-500 hover:bg-orange-600 text-white ml-auto"
          >
            Pay ₹{pendingAmount?.toFixed(2)}
          </Button>
        )}
      </div>

      {/* Refund Status */}
      {payment.refund && (
        <div className="mt-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-xl">
          <div className="flex items-center gap-2">
            <RefreshCcw className="w-4 h-4 text-blue-400" />
            <span className="text-blue-400 font-medium text-sm">Refund {payment.refund.status}</span>
          </div>
          <p className="text-zinc-400 text-xs mt-1">
            Amount: ₹{payment.refund.amount?.toFixed(2)} • 
            {payment.refund.status === 'processing' ? ' Expected in 5-7 days' : ` Completed on ${new Date(payment.refund.completed_at).toLocaleDateString('en-IN')}`}
          </p>
        </div>
      )}
    </div>
  );
};

// Summary Card
const SummaryCard = ({ icon: Icon, label, value, trend, color }) => (
  <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
    <div className="flex items-center justify-between mb-2">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      {trend && (
        <span className={`text-xs ${trend > 0 ? 'text-green-400' : 'text-red-400'} flex items-center`}>
          {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <p className="text-zinc-400 text-sm">{label}</p>
    <p className="text-white text-xl font-bold">{value}</p>
  </div>
);

const PaymentHistoryDashboard = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, paid, pending, refunded
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch payment history
  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const phone = localStorage.getItem('guestMobile');
        if (!phone) {
          setLoading(false);
          return;
        }

        const response = await axios.get(`${API}/payments/history?phone=${phone}`);
        setPayments(response.data.payments || []);
      } catch (error) {
        console.error('Failed to fetch payments:', error);
        // Mock data for demo
        setPayments([
          {
            id: '1',
            order_id: 'ORD-2024-001',
            amount: 1250,
            paid_amount: 625,
            pending_amount: 625,
            status: 'partial',
            payment_type: 'split',
            method: 'upi',
            created_at: new Date().toISOString(),
            customer: { name: 'John Doe', phone: '9833188288', email: 'john@example.com' },
            items: [{ name: 'Metformin 500mg', price: 150, quantity: 5 }]
          },
          {
            id: '2',
            order_id: 'ORD-2024-002',
            amount: 890,
            status: 'paid',
            method: 'card',
            created_at: new Date(Date.now() - 86400000).toISOString(),
            customer: { name: 'John Doe', phone: '9833188288' },
            items: [{ name: 'Vitamin D3', price: 299, quantity: 1 }]
          },
          {
            id: '3',
            order_id: 'ORD-2024-003',
            amount: 450,
            status: 'refunded',
            method: 'upi',
            created_at: new Date(Date.now() - 172800000).toISOString(),
            refund: { status: 'completed', amount: 450, completed_at: new Date().toISOString() },
            customer: { name: 'John Doe', phone: '9833188288' },
            items: [{ name: 'Paracetamol', price: 45, quantity: 10 }]
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  // Handle refund request
  const handleRefundRequest = async (payment) => {
    try {
      await axios.post(`${API}/refund/request`, {
        order_id: payment.order_id,
        amount: payment.amount,
        reason: 'Customer requested refund'
      });
      toast.success('Refund request submitted');
      
      // Update local state
      setPayments(prev => prev.map(p => 
        p.id === payment.id 
          ? { ...p, refund_requested: true, refund: { status: 'processing', amount: p.amount } }
          : p
      ));
    } catch (error) {
      toast.error('Failed to submit refund request');
    }
  };

  // Filter payments
  const filteredPayments = payments.filter(p => {
    if (filter !== 'all' && p.status !== filter) return false;
    if (searchQuery && !p.order_id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Calculate summary
  const totalSpent = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const pendingAmount = payments.filter(p => p.status === 'pending' || p.status === 'partial').reduce((sum, p) => sum + (p.pending_amount || p.amount), 0);
  const refundedAmount = payments.filter(p => p.status === 'refunded').reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="min-h-screen bg-[#050510]">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/20 rounded-full text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Wallet className="w-6 h-6 text-white" />
          <h1 className="text-lg font-semibold text-white">Payment History</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard
            icon={IndianRupee}
            label="Total Spent"
            value={`₹${totalSpent.toFixed(0)}`}
            color="bg-green-600"
          />
          <SummaryCard
            icon={Clock}
            label="Pending"
            value={`₹${pendingAmount.toFixed(0)}`}
            color="bg-yellow-600"
          />
          <SummaryCard
            icon={RefreshCcw}
            label="Refunded"
            value={`₹${refundedAmount.toFixed(0)}`}
            color="bg-blue-600"
          />
        </div>

        {/* Search & Filter */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order ID"
              className="pl-10 bg-zinc-900 border-zinc-700 text-white"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white"
          >
            <option value="all">All</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="partial">Split</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>

        {/* Payments List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-zinc-900/50 rounded-2xl h-40 animate-pulse" />
            ))}
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="text-center py-12">
            <Wallet className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-400">No payments found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPayments.map(payment => (
              <PaymentCard
                key={payment.id}
                payment={payment}
                onRefundRequest={handleRefundRequest}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentHistoryDashboard;

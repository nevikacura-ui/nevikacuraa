import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowLeft, Receipt, Download, Search, Calendar, CreditCard, 
  CheckCircle2, Clock, XCircle, IndianRupee, Filter, ChevronDown,
  FileText, Printer, Mail, Phone, Building2, User, Loader2
} from 'lucide-react';
import { format } from 'date-fns';

const API = process.env.REACT_APP_BACKEND_URL;

const PaymentHistory = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [patientPhone, setPatientPhone] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

  // Fetch transactions for patient
  const fetchTransactions = async (phone) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/api/payments/transactions`, {
        params: { patient_phone: phone, limit: 100 }
      });
      setTransactions(response.data?.transactions || []);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      toast.error('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  };

  // Verify patient phone (simple OTP-less verification for demo)
  const handleVerify = async () => {
    if (!patientPhone || patientPhone.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    setVerifyLoading(true);
    try {
      // Check if patient exists
      const response = await axios.get(`${API}/api/patients/by-phone/${patientPhone}`);
      if (response.data) {
        setIsVerified(true);
        fetchTransactions(patientPhone);
        toast.success('Phone verified! Loading your payment history...');
      }
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error('No patient found with this phone number');
      } else {
        // Still show transactions if API fails
        setIsVerified(true);
        fetchTransactions(patientPhone);
      }
    } finally {
      setVerifyLoading(false);
    }
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(txn => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          txn.session_id?.toLowerCase().includes(query) ||
          txn.description?.toLowerCase().includes(query) ||
          txn.reference_id?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      
      // Type filter
      if (filterType !== 'all' && txn.payment_type !== filterType) return false;
      
      // Status filter
      if (filterStatus !== 'all' && txn.payment_status !== filterStatus) return false;
      
      return true;
    });
  }, [transactions, searchQuery, filterType, filterStatus]);

  // Calculate stats
  const stats = useMemo(() => {
    const paid = transactions.filter(t => t.payment_status === 'paid');
    const total = paid.reduce((sum, t) => sum + (t.amount || 0), 0);
    return {
      totalPaid: total,
      totalTransactions: transactions.length,
      paidCount: paid.length,
      pendingCount: transactions.filter(t => t.payment_status === 'pending').length
    };
  }, [transactions]);

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      paid: { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2, label: 'Paid' },
      pending: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock, label: 'Pending' },
      failed: { color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle, label: 'Failed' },
      refunded: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Receipt, label: 'Refunded' }
    };
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} border text-xs flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  // Get type badge
  const getTypeBadge = (type) => {
    const typeConfig = {
      appointment: { color: 'bg-teal-50 text-teal-700', icon: Calendar, label: 'Appointment' },
      pharmacy: { color: 'bg-orange-50 text-orange-700', icon: Receipt, label: 'Pharmacy' },
      lab_test: { color: 'bg-blue-50 text-blue-700', icon: FileText, label: 'Lab Test' }
    };
    const config = typeConfig[type] || { color: 'bg-slate-50 text-slate-700', icon: CreditCard, label: type };
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} text-xs flex items-center gap-1`} variant="outline">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  // Open receipt
  const openReceipt = (txn) => {
    setSelectedTransaction(txn);
    setShowReceiptModal(true);
  };

  // Download receipt as PDF
  const downloadReceiptPDF = async (txn) => {
    try {
      const response = await axios.get(
        `${API}/api/payments/receipt/${txn.session_id}/pdf`,
        { responseType: 'blob' }
      );
      
      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt_${txn.session_id?.slice(0, 8) || Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('PDF Receipt downloaded!');
    } catch (error) {
      console.error('Failed to download PDF:', error);
      toast.error('Failed to download PDF receipt');
      // Fallback to text download
      downloadReceiptText(txn);
    }
  };

  // Download receipt as text (fallback)
  const downloadReceiptText = (txn) => {
    const receiptText = `
NEVIKA CURA HEALTHCARE
Payment Receipt
=====================================

Receipt No: ${txn.session_id?.slice(0, 12) || 'N/A'}
Date: ${txn.created_at ? format(new Date(txn.created_at), 'dd MMM yyyy, hh:mm a') : 'N/A'}

Patient: ${txn.patient_name || 'N/A'}
Phone: ${txn.patient_phone || 'N/A'}

Service: ${txn.payment_type?.replace('_', ' ').toUpperCase() || 'N/A'}
Description: ${txn.description || 'N/A'}
Reference: ${txn.reference_id || 'N/A'}

Amount Paid: ₹${txn.amount || 0}
Payment Status: ${txn.payment_status?.toUpperCase() || 'N/A'}

=====================================
Thank you for choosing Nevika Cura!
Contact: +91 9403890429
    `.trim();

    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt_${txn.session_id?.slice(0, 8) || Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Receipt downloaded!');
  };

  // Verification screen
  if (!isVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 p-4">
        <div className="max-w-md mx-auto pt-20">
          <Card className="p-8 rounded-3xl shadow-xl">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Receipt className="w-10 h-10 text-teal-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-800">Payment History</h1>
              <p className="text-slate-500 mt-2">Enter your phone number to view your payment history</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-600 font-medium">Phone Number</label>
                <div className="relative mt-1">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Enter 10-digit mobile number"
                    className="pl-10"
                    data-testid="payment-history-phone"
                  />
                </div>
              </div>

              <Button
                onClick={handleVerify}
                disabled={verifyLoading || patientPhone.length !== 10}
                className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white py-5 rounded-full"
                data-testid="payment-history-verify-btn"
              >
                {verifyLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'View Payment History'
                )}
              </Button>

              <Button
                variant="ghost"
                onClick={() => navigate('/')}
                className="w-full text-slate-500"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50" data-testid="payment-history-page">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/')}
              className="rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Payment History</h1>
              <p className="text-sm text-slate-500">{patientPhone}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsVerified(false);
              setPatientPhone('');
              setTransactions([]);
            }}
          >
            Change Number
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-teal-500 to-cyan-500 text-white rounded-2xl">
            <p className="text-sm opacity-80">Total Spent</p>
            <p className="text-2xl font-bold flex items-center">
              <IndianRupee className="w-5 h-5" />
              {stats.totalPaid.toLocaleString()}
            </p>
          </Card>
          <Card className="p-4 bg-white rounded-2xl border-slate-200">
            <p className="text-sm text-slate-500">Transactions</p>
            <p className="text-2xl font-bold text-slate-800">{stats.totalTransactions}</p>
          </Card>
          <Card className="p-4 bg-green-50 rounded-2xl border-green-200">
            <p className="text-sm text-green-600">Paid</p>
            <p className="text-2xl font-bold text-green-700">{stats.paidCount}</p>
          </Card>
          <Card className="p-4 bg-yellow-50 rounded-2xl border-yellow-200">
            <p className="text-sm text-yellow-600">Pending</p>
            <p className="text-2xl font-bold text-yellow-700">{stats.pendingCount}</p>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID or description..."
              className="pl-10 rounded-xl"
              data-testid="payment-history-search"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-xl bg-white text-sm"
            data-testid="payment-history-type-filter"
          >
            <option value="all">All Types</option>
            <option value="appointment">Appointments</option>
            <option value="pharmacy">Pharmacy</option>
            <option value="lab_test">Lab Tests</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-xl bg-white text-sm"
            data-testid="payment-history-status-filter"
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Transactions List */}
        <Card className="rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            </div>
          ) : filteredTransactions.length > 0 ? (
            <div className="divide-y">
              {filteredTransactions.map((txn, idx) => (
                <div 
                  key={txn.session_id || idx} 
                  className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => openReceipt(txn)}
                  data-testid={`payment-row-${idx}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        txn.payment_status === 'paid' ? 'bg-green-100' : 'bg-yellow-100'
                      }`}>
                        {txn.payment_status === 'paid' ? (
                          <CheckCircle2 className="w-6 h-6 text-green-600" />
                        ) : (
                          <Clock className="w-6 h-6 text-yellow-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{txn.description || 'Payment'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {getTypeBadge(txn.payment_type)}
                          <span className="text-xs text-slate-400">
                            {txn.created_at ? format(new Date(txn.created_at), 'dd MMM yyyy') : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-800 flex items-center justify-end">
                        <IndianRupee className="w-4 h-4" />
                        {txn.amount || 0}
                      </p>
                      <div className="mt-1">
                        {getStatusBadge(txn.payment_status)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400">
              <Receipt className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">No transactions found</p>
              <p className="text-sm mt-1">
                {searchQuery || filterType !== 'all' || filterStatus !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Your payment history will appear here'}
              </p>
            </div>
          )}
        </Card>
      </main>

      {/* Receipt Modal */}
      <Dialog open={showReceiptModal} onOpenChange={setShowReceiptModal}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-teal-600" />
              Payment Receipt
            </DialogTitle>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-4">
              {/* Status Banner */}
              <div className={`p-4 rounded-xl text-center ${
                selectedTransaction.payment_status === 'paid' 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-yellow-50 border border-yellow-200'
              }`}>
                {selectedTransaction.payment_status === 'paid' ? (
                  <>
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-600" />
                    <p className="font-bold text-green-800">Payment Successful</p>
                  </>
                ) : (
                  <>
                    <Clock className="w-10 h-10 mx-auto mb-2 text-yellow-600" />
                    <p className="font-bold text-yellow-800">Payment Pending</p>
                  </>
                )}
              </div>

              {/* Receipt Details */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
                  <span className="text-slate-500">Receipt No</span>
                  <span className="font-mono font-medium">{selectedTransaction.session_id?.slice(0, 12)}...</span>
                </div>
                <div className="flex justify-between p-2">
                  <span className="text-slate-500">Date</span>
                  <span className="font-medium">
                    {selectedTransaction.created_at 
                      ? format(new Date(selectedTransaction.created_at), 'dd MMM yyyy, hh:mm a') 
                      : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
                  <span className="text-slate-500">Service Type</span>
                  <span className="font-medium capitalize">
                    {selectedTransaction.payment_type?.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between p-2">
                  <span className="text-slate-500">Description</span>
                  <span className="font-medium">{selectedTransaction.description || 'N/A'}</span>
                </div>
                <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
                  <span className="text-slate-500">Patient</span>
                  <span className="font-medium">{selectedTransaction.patient_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between p-4 bg-teal-50 rounded-xl border border-teal-200">
                  <span className="text-teal-700 font-medium">Amount Paid</span>
                  <span className="text-xl font-bold text-teal-700 flex items-center">
                    <IndianRupee className="w-5 h-5" />
                    {selectedTransaction.amount || 0}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => downloadReceiptPDF(selectedTransaction)}
                  data-testid="download-pdf-btn"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => window.print()}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentHistory;

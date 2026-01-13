import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowLeft, Receipt, CreditCard, Banknote, Clock, CheckCircle,
  AlertTriangle, Search, Filter, Download, Plus, Loader2,
  Phone, Mail, Calendar, Building, ChevronRight, IndianRupee,
  FileText, Wallet, TrendingUp
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const Billing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'cash',
    reference_number: '',
    notes: ''
  });
  const [processingPayment, setProcessingPayment] = useState(false);
  
  useEffect(() => {
    fetchData();
  }, [activeTab]);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      const statusMap = {
        'pending': 'pending',
        'overdue': 'overdue',
        'partial': 'partial',
        'paid': 'paid',
        'all': ''
      };
      
      const params = statusMap[activeTab] ? { status: statusMap[activeTab] } : {};
      
      const [invoicesRes, statsRes] = await Promise.all([
        axios.get(`${API}/billing/due-payments`, { params }),
        axios.get(`${API}/billing/dashboard`)
      ]);
      
      setInvoices(invoicesRes.data?.invoices || []);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching billing data:', error);
    }
    setLoading(false);
  };
  
  const openPaymentDialog = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentForm({
      amount: invoice.amount_due.toString(),
      payment_method: 'cash',
      reference_number: '',
      notes: ''
    });
    setShowPaymentDialog(true);
  };
  
  const handleRecordPayment = async () => {
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    setProcessingPayment(true);
    try {
      await axios.post(`${API}/billing/payments`, {
        invoice_id: selectedInvoice.id,
        amount: parseFloat(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        reference_number: paymentForm.reference_number || null,
        notes: paymentForm.notes || null
      });
      
      toast.success('Payment recorded successfully!');
      setShowPaymentDialog(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to record payment');
    }
    setProcessingPayment(false);
  };
  
  const sendReminder = async (invoiceId) => {
    try {
      await axios.post(`${API}/billing/invoices/${invoiceId}/send-reminder`);
      toast.success('Payment reminder sent!');
    } catch (error) {
      toast.error('Failed to send reminder');
    }
  };
  
  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-700"><AlertTriangle className="w-3 h-3 mr-1" />Overdue</Badge>;
      case 'partial':
        return <Badge className="bg-orange-100 text-orange-700"><Clock className="w-3 h-3 mr-1" />Partial</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };
  
  const filteredInvoices = invoices.filter(inv => 
    inv.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.patient_phone?.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Receipt className="w-6 h-6 text-emerald-600" />
                Billing & Payments
              </h1>
              <p className="text-gray-500 text-sm">Manage invoices and payments</p>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Wallet className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
                <p className="text-2xl font-bold">₹{stats.total_due?.toLocaleString() || 0}</p>
                <p className="text-xs text-gray-500">Total Due</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <AlertTriangle className="w-8 h-8 mx-auto text-red-500 mb-2" />
                <p className="text-2xl font-bold">{stats.overdue_count || 0}</p>
                <p className="text-xs text-gray-500">Overdue</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-8 h-8 mx-auto text-blue-500 mb-2" />
                <p className="text-2xl font-bold">₹{stats.collected_today?.toLocaleString() || 0}</p>
                <p className="text-xs text-gray-500">Collected Today</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <FileText className="w-8 h-8 mx-auto text-purple-500 mb-2" />
                <p className="text-2xl font-bold">{stats.pending_count || 0}</p>
                <p className="text-xs text-gray-500">Pending Invoices</p>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Search Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by name, phone, or invoice number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
            <TabsTrigger value="partial">Partial</TabsTrigger>
            <TabsTrigger value="paid">Paid</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="mt-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              </div>
            ) : filteredInvoices.length > 0 ? (
              <div className="space-y-3">
                {filteredInvoices.map((invoice) => (
                  <Card key={invoice.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{invoice.patient_name}</h3>
                            {getStatusBadge(invoice.payment_status)}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            {invoice.invoice_number}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {invoice.patient_phone}
                            </span>
                            <span className="flex items-center gap-1">
                              <Building className="w-3 h-3" />
                              {invoice.service_type}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(invoice.created_at).toLocaleDateString('en-IN')}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-emerald-600">
                            ₹{invoice.amount_due?.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            of ₹{invoice.total?.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      {invoice.payment_status !== 'paid' && (
                        <div className="flex gap-2 mt-4 pt-3 border-t">
                          <Button 
                            size="sm" 
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => openPaymentDialog(invoice)}
                          >
                            <CreditCard className="w-4 h-4 mr-1" />
                            Record Payment
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => sendReminder(invoice.id)}
                          >
                            <Mail className="w-4 h-4 mr-1" />
                            Send Reminder
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Receipt className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No invoices found</h3>
                  <p className="text-gray-500">
                    {activeTab === 'paid' 
                      ? 'No paid invoices yet.' 
                      : 'All payments are up to date!'}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
      
      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Invoice: {selectedInvoice?.invoice_number}
            </DialogDescription>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">{selectedInvoice.patient_name}</p>
                <p className="text-sm text-gray-500">Due: ₹{selectedInvoice.amount_due?.toLocaleString()}</p>
              </div>
              
              <div>
                <Label>Payment Amount (₹)</Label>
                <Input
                  type="number"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="Enter amount"
                />
              </div>
              
              <div>
                <Label>Payment Method</Label>
                <Select 
                  value={paymentForm.payment_method} 
                  onValueChange={(v) => setPaymentForm(prev => ({ ...prev, payment_method: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Reference Number (Optional)</Label>
                <Input
                  value={paymentForm.reference_number}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, reference_number: e.target.value }))}
                  placeholder="Transaction ID / Receipt No."
                />
              </div>
              
              <div>
                <Label>Notes (Optional)</Label>
                <Input
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional notes"
                />
              </div>
              
              <Button 
                onClick={handleRecordPayment} 
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={processingPayment}
              >
                {processingPayment ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Record Payment
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Billing;

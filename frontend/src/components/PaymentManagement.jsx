import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  CreditCard, Wallet, Plus, Trash2, Check, Shield, 
  Loader2, ArrowUpRight, ArrowDownLeft, Clock, 
  QrCode, Smartphone, IndianRupee, RefreshCw,
  CheckCircle2, XCircle, AlertCircle, Copy
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Saved Cards Component
const SavedCards = ({ onCardSelect }) => {
  const { user, token } = useAuth();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [newCard, setNewCard] = useState({
    card_number: '',
    expiry: '',
    cvv: '',
    name: '',
    save_card: true
  });

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const response = await axios.get(`${API}/payments/saved-cards`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCards(response.data.cards || []);
    } catch (error) {
      // Cards API might not exist yet, use mock data
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCardSelect = (card) => {
    setSelectedCard(card.id);
    onCardSelect?.(card);
  };

  const formatCardNumber = (value) => {
    return value
      .replace(/\D/g, '')
      .slice(0, 16)
      .replace(/(.{4})/g, '$1 ')
      .trim();
  };

  const formatExpiry = (value) => {
    return value
      .replace(/\D/g, '')
      .slice(0, 4)
      .replace(/(\d{2})(\d)/, '$1/$2');
  };

  const getCardBrand = (number) => {
    const firstDigit = number.replace(/\D/g, '')[0];
    if (firstDigit === '4') return { name: 'Visa', color: 'bg-blue-600' };
    if (firstDigit === '5') return { name: 'Mastercard', color: 'bg-red-500' };
    if (firstDigit === '3') return { name: 'Amex', color: 'bg-emerald-600' };
    if (firstDigit === '6') return { name: 'RuPay', color: 'bg-orange-500' };
    return { name: 'Card', color: 'bg-slate-600' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">Saved Cards</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowAddCard(true)}
          className="rounded-lg"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Card
        </Button>
      </div>

      {cards.length === 0 ? (
        <Card className="p-6 text-center bg-slate-50 border-dashed border-2 rounded-xl">
          <CreditCard className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500">No saved cards</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddCard(true)}
            className="mt-3 rounded-lg"
          >
            Add Your First Card
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {cards.map((card) => {
            const brand = getCardBrand(card.last_four);
            return (
              <Card 
                key={card.id}
                className={`p-4 rounded-xl cursor-pointer transition-all ${
                  selectedCard === card.id 
                    ? 'ring-2 ring-teal-500 bg-teal-50' 
                    : 'hover:bg-slate-50'
                }`}
                onClick={() => handleCardSelect(card)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-8 rounded ${brand.color} flex items-center justify-center text-white text-xs font-bold`}>
                      {brand.name}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">•••• {card.last_four}</p>
                      <p className="text-xs text-slate-500">Expires {card.expiry}</p>
                    </div>
                  </div>
                  {selectedCard === card.id && (
                    <CheckCircle2 className="w-5 h-5 text-teal-500" />
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Card Dialog */}
      <Dialog open={showAddCard} onOpenChange={setShowAddCard}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-teal-500" />
              Add New Card
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Card Number</Label>
              <Input
                value={newCard.card_number}
                onChange={(e) => setNewCard({ ...newCard, card_number: formatCardNumber(e.target.value) })}
                placeholder="1234 5678 9012 3456"
                className="mt-1 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Expiry</Label>
                <Input
                  value={newCard.expiry}
                  onChange={(e) => setNewCard({ ...newCard, expiry: formatExpiry(e.target.value) })}
                  placeholder="MM/YY"
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <Label>CVV</Label>
                <Input
                  type="password"
                  value={newCard.cvv}
                  onChange={(e) => setNewCard({ ...newCard, cvv: e.target.value.slice(0, 4) })}
                  placeholder="•••"
                  className="mt-1 rounded-xl"
                />
              </div>
            </div>
            <div>
              <Label>Cardholder Name</Label>
              <Input
                value={newCard.name}
                onChange={(e) => setNewCard({ ...newCard, name: e.target.value.toUpperCase() })}
                placeholder="NAME ON CARD"
                className="mt-1 rounded-xl"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Shield className="w-4 h-4" />
              Your card details are encrypted and secure
            </div>
            <Button className="w-full rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500">
              <Plus className="w-4 h-4 mr-2" />
              Save Card
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Wallet Component
const WalletSection = () => {
  const { user, token } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTopup, setShowTopup] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);
  const [qrData, setQrData] = useState(null);

  useEffect(() => {
    fetchWallet();
    fetchTransactions();
  }, []);

  const fetchWallet = async () => {
    try {
      const response = await axios.get(`${API}/wallet/balance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWallet(response.data);
    } catch (error) {
      console.error('Failed to fetch wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${API}/wallet/transactions?limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransactions(response.data.transactions || []);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  };

  const initiateTopup = async () => {
    const amount = parseFloat(topupAmount);
    if (!amount || amount < 100) {
      toast.error('Minimum top-up amount is ₹100');
      return;
    }
    if (amount > 50000) {
      toast.error('Maximum top-up amount is ₹50,000');
      return;
    }

    setTopupLoading(true);
    try {
      const response = await axios.post(`${API}/wallet/topup`, {
        amount: amount,
        payment_method: 'upi'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setQrData(response.data.upi_details);
      toast.success('Scan QR code to complete payment');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to initiate top-up');
    } finally {
      setTopupLoading(false);
    }
  };

  const copyUpiId = () => {
    navigator.clipboard.writeText(qrData?.upi_id || '');
    toast.success('UPI ID copied!');
  };

  const getTransactionIcon = (type) => {
    if (type === 'topup' || type === 'credit') {
      return <ArrowDownLeft className="w-4 h-4 text-emerald-500" />;
    }
    return <ArrowUpRight className="w-4 h-4 text-red-500" />;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return <Badge className="bg-emerald-100 text-emerald-700">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-700">Pending</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700">Rejected</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-700">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Wallet Balance Card */}
      <Card className="p-6 rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-600 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-5 h-5" />
            <span className="text-teal-100">Nevika Wallet</span>
          </div>
          <p className="text-4xl font-bold mb-1">
            ₹{(wallet?.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-sm text-teal-100">Available Balance</p>
          
          <div className="flex gap-3 mt-4">
            <Button
              onClick={() => setShowTopup(true)}
              className="flex-1 bg-white text-teal-600 hover:bg-teal-50 rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Money
            </Button>
            <Button
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 rounded-xl"
              onClick={fetchWallet}
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 rounded-xl">
          <p className="text-xs text-slate-500">Total Added</p>
          <p className="text-lg font-bold text-emerald-600">
            ₹{(wallet?.total_added || 0).toLocaleString('en-IN')}
          </p>
        </Card>
        <Card className="p-4 rounded-xl">
          <p className="text-xs text-slate-500">Total Spent</p>
          <p className="text-lg font-bold text-red-500">
            ₹{(wallet?.total_spent || 0).toLocaleString('en-IN')}
          </p>
        </Card>
      </div>

      {/* Pending Top-ups */}
      {wallet?.pending_topups?.length > 0 && (
        <Card className="p-4 rounded-xl bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="font-medium text-amber-800">Pending Top-ups</span>
          </div>
          {wallet.pending_topups.map((topup) => (
            <div key={topup.id} className="flex items-center justify-between py-2 border-t border-amber-200">
              <span className="text-sm text-amber-700">₹{topup.amount}</span>
              <Badge className="bg-amber-100 text-amber-700">Verifying</Badge>
            </div>
          ))}
        </Card>
      )}

      {/* Transaction History */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          Transaction History
        </h3>
        
        {transactions.length === 0 ? (
          <Card className="p-6 text-center bg-slate-50 rounded-xl">
            <p className="text-slate-500">No transactions yet</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {transactions.map((txn) => (
              <Card key={txn.id} className="p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      txn.type === 'topup' || txn.type === 'credit' 
                        ? 'bg-emerald-100' 
                        : 'bg-red-100'
                    }`}>
                      {getTransactionIcon(txn.type)}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">
                        {txn.type === 'topup' ? 'Wallet Top-up' : 
                         txn.description || txn.service_type || 'Payment'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(txn.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      txn.type === 'topup' || txn.type === 'credit' 
                        ? 'text-emerald-600' 
                        : 'text-red-600'
                    }`}>
                      {txn.type === 'topup' || txn.type === 'credit' ? '+' : '-'}₹{txn.amount}
                    </p>
                    {getStatusBadge(txn.status)}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Top-up Dialog */}
      <Dialog open={showTopup} onOpenChange={setShowTopup}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-teal-500" />
              Add Money to Wallet
            </DialogTitle>
          </DialogHeader>
          
          {!qrData ? (
            <div className="space-y-4 mt-4">
              <div>
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="mt-1 rounded-xl text-lg"
                  min="100"
                  max="50000"
                />
                <p className="text-xs text-slate-500 mt-1">Min ₹100, Max ₹50,000</p>
              </div>
              
              {/* Quick amounts */}
              <div className="flex gap-2 flex-wrap">
                {[500, 1000, 2000, 5000].map((amt) => (
                  <Button
                    key={amt}
                    variant="outline"
                    size="sm"
                    onClick={() => setTopupAmount(amt.toString())}
                    className={`rounded-lg ${topupAmount === amt.toString() ? 'ring-2 ring-teal-500' : ''}`}
                  >
                    ₹{amt}
                  </Button>
                ))}
              </div>
              
              <Button
                onClick={initiateTopup}
                disabled={topupLoading || !topupAmount}
                className="w-full h-12 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl"
              >
                {topupLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <QrCode className="w-5 h-5 mr-2" />
                    Generate QR Code
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 mt-4 text-center">
              <div className="bg-white p-4 rounded-xl border">
                <img 
                  src={qrData.qr_code} 
                  alt="UPI QR Code" 
                  className="w-48 h-48 mx-auto"
                />
              </div>
              
              <div>
                <p className="text-2xl font-bold text-teal-600">₹{qrData.amount}</p>
                <p className="text-sm text-slate-500">Scan to pay exactly this amount</p>
              </div>
              
              <Card className="p-3 rounded-xl bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-xs text-slate-500">UPI ID</p>
                    <p className="font-mono text-sm">{qrData.upi_id}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={copyUpiId}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
              
              <div className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                After payment, upload screenshot for verification. Balance will be credited within 30 minutes.
              </div>
              
              <Button
                variant="outline"
                onClick={() => { setQrData(null); setTopupAmount(''); }}
                className="w-full rounded-xl"
              >
                Done / New Top-up
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Main Payment Management Component
const PaymentManagement = () => {
  const [activeTab, setActiveTab] = useState('wallet');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white">
          <CreditCard className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Payments
          </h2>
          <p className="text-sm text-slate-500">Manage your payment methods</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-xl bg-slate-100 p-1">
          <TabsTrigger value="wallet" className="rounded-lg data-[state=active]:bg-white">
            <Wallet className="w-4 h-4 mr-2" />
            Wallet
          </TabsTrigger>
          <TabsTrigger value="cards" className="rounded-lg data-[state=active]:bg-white">
            <CreditCard className="w-4 h-4 mr-2" />
            Cards
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="wallet" className="mt-4">
          <WalletSection />
        </TabsContent>
        
        <TabsContent value="cards" className="mt-4">
          <SavedCards />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PaymentManagement;
export { SavedCards, WalletSection };

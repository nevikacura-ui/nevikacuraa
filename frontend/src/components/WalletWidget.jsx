import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Wallet, Plus, History, Loader2, CheckCircle2, Clock, 
  Upload, Copy, QrCode, IndianRupee, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const WalletWidget = ({ onBalanceChange, compact = false }) => {
  const { user, token } = useAuth();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showTopUp, setShowTopUp] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [upiDetails, setUpiDetails] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [pendingTopups, setPendingTopups] = useState([]);
  const [topUpStep, setTopUpStep] = useState(1); // 1: amount, 2: payment, 3: screenshot
  const [submitting, setSubmitting] = useState(false);
  const [currentTopUpId, setCurrentTopUpId] = useState(null);
  const [screenshot, setScreenshot] = useState(null);

  useEffect(() => {
    if (user && token) {
      fetchBalance();
    }
  }, [user, token]);

  const fetchBalance = async () => {
    try {
      const response = await axios.get(`${API}/wallet/balance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBalance(response.data.balance || 0);
      setUpiDetails(response.data.upi_details);
      setPendingTopups(response.data.pending_topups || []);
      if (onBalanceChange) onBalanceChange(response.data.balance || 0);
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${API}/wallet/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransactions(response.data.transactions || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const handleTopUpRequest = async () => {
    if (!topUpAmount || parseFloat(topUpAmount) < 100) {
      toast.error('Minimum top-up amount is ₹100');
      return;
    }

    setSubmitting(true);
    try {
      const response = await axios.post(`${API}/wallet/topup`, {
        amount: parseFloat(topUpAmount),
        payment_method: 'upi',
        transaction_id: transactionId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setCurrentTopUpId(response.data.transaction_id);
      setTopUpStep(2);
      toast.success('Top-up request created! Please complete payment.');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create top-up request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleScreenshotUpload = async () => {
    if (!screenshot || !currentTopUpId) {
      toast.error('Please select a screenshot');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('screenshot', screenshot);

      await axios.post(`${API}/wallet/topup/${currentTopUpId}/screenshot`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('Screenshot uploaded! Your top-up will be verified within 30 minutes.');
      setShowTopUp(false);
      resetTopUpForm();
      fetchBalance();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload screenshot');
    } finally {
      setSubmitting(false);
    }
  };

  const resetTopUpForm = () => {
    setTopUpStep(1);
    setTopUpAmount('');
    setTransactionId('');
    setCurrentTopUpId(null);
    setScreenshot(null);
  };

  const copyUPI = () => {
    navigator.clipboard.writeText(upiDetails?.upi_id || '');
    toast.success('UPI ID copied!');
  };

  if (!user) return null;

  // Render dialogs for both compact and full modes
  const renderDialogs = () => (
    <>
      {/* Top-Up Dialog */}
      <Dialog open={showTopUp} onOpenChange={(open) => { setShowTopUp(open); if (!open) resetTopUpForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-green-600" />
              Add Money to Wallet
            </DialogTitle>
            <DialogDescription>
              {topUpStep === 1 && "Enter the amount you want to add"}
              {topUpStep === 2 && "Complete payment using UPI"}
              {topUpStep === 3 && "Upload payment screenshot for verification"}
            </DialogDescription>
          </DialogHeader>

          {/* Step 1: Enter Amount */}
          {topUpStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  placeholder="Enter amount (min ₹100)"
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value)}
                  min="100"
                  max="50000"
                  data-testid="topup-amount-input"
                />
              </div>
              <div className="flex gap-2">
                {[500, 1000, 2000, 5000].map(amt => (
                  <Button
                    key={amt}
                    variant="outline"
                    size="sm"
                    onClick={() => setTopUpAmount(amt.toString())}
                    className="flex-1"
                  >
                    ₹{amt}
                  </Button>
                ))}
              </div>
              <Button 
                onClick={handleTopUpRequest} 
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={submitting || !topUpAmount}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Continue to Payment
              </Button>
            </div>
          )}

          {/* Step 2: Payment */}
          {topUpStep === 2 && upiDetails && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-3xl font-bold text-green-600 mb-2">₹{topUpAmount}</p>
                <p className="text-sm text-gray-500">Amount to pay</p>
              </div>

              <div className="flex justify-center">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=upi://pay?pa=${upiDetails.upi_id}&pn=Nevika%20Cura&am=${topUpAmount}&cu=INR`}
                  alt="UPI QR Code"
                  className="rounded-lg border"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">UPI ID</p>
                  <p className="font-mono font-semibold">{upiDetails.upi_id}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={copyUPI}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Important:</strong> After payment, enter your UPI transaction ID and upload screenshot.
                </p>
              </div>

              <div>
                <Label>UPI Transaction ID (Optional)</Label>
                <Input
                  placeholder="e.g., 401234567890"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                />
              </div>

              <Button 
                onClick={() => setTopUpStep(3)} 
                className="w-full"
              >
                I've Made the Payment
              </Button>
            </div>
          )}

          {/* Step 3: Screenshot Upload */}
          {topUpStep === 3 && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
                <p className="font-semibold">Payment of ₹{topUpAmount}</p>
                <p className="text-sm text-gray-500">Upload screenshot to verify</p>
              </div>

              <div>
                <Label>Payment Screenshot</Label>
                <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  {screenshot ? (
                    <div>
                      <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-green-600">{screenshot.name}</p>
                      <Button 
                        variant="link" 
                        size="sm" 
                        onClick={() => setScreenshot(null)}
                      >
                        Change
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">Click to upload screenshot</p>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setScreenshot(e.target.files[0])}
                      />
                    </label>
                  )}
                </div>
              </div>

              <Button 
                onClick={handleScreenshotUpload} 
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={submitting || !screenshot}
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Submit for Verification
              </Button>

              <p className="text-xs text-center text-gray-500">
                Your wallet will be credited within 30 minutes after verification
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Transaction History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Transaction History
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {transactions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No transactions yet</p>
            ) : (
              transactions.map((txn) => (
                <div 
                  key={txn.id} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      txn.type === 'topup' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {txn.type === 'topup' ? (
                        <ArrowDownRight className="w-4 h-4 text-green-600" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {txn.type === 'topup' ? 'Wallet Top-up' : txn.description || 'Payment'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(txn.created_at).toLocaleDateString('en-IN', { 
                          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${
                      txn.type === 'topup' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {txn.type === 'topup' ? '+' : '-'}₹{txn.amount}
                    </p>
                    <p className={`text-xs px-2 py-0.5 rounded-full ${
                      txn.status === 'completed' || txn.status === 'approved' 
                        ? 'bg-green-100 text-green-700'
                        : txn.status === 'pending' 
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                    }`}>
                      {txn.status}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );

  if (compact) {
    return (
      <>
        <button
          onClick={() => setShowTopUp(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full text-sm font-medium hover:shadow-md transition-all"
          data-testid="wallet-compact"
        >
          <Wallet className="w-4 h-4" />
          <span>₹{loading ? '...' : balance.toFixed(0)}</span>
          <Plus className="w-3 h-3" />
        </button>
        {renderDialogs()}
      </>
    );
  }

  return (
    <>
      <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200" data-testid="wallet-widget">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Nevika Wallet</p>
              <p className="text-2xl font-bold text-green-700">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : `₹${balance.toFixed(2)}`}
              </p>
            </div>
          </div>
        </div>

        {pendingTopups.length > 0 && (
          <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-700 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {pendingTopups.length} pending top-up(s) awaiting verification
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={() => setShowTopUp(true)} 
            className="flex-1 bg-green-600 hover:bg-green-700"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Money
          </Button>
          <Button 
            variant="outline" 
            onClick={() => { setShowHistory(true); fetchTransactions(); }}
            size="sm"
          >
            <History className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {renderDialogs()}
    </>
  );
};

export default WalletWidget;

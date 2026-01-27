import React, { useState, useEffect } from 'react';
import { Receipt, CheckCircle, AlertCircle, Clock, Download, RefreshCw, TrendingUp, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { toast } from 'sonner';

const BillingReconciliation = () => {
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [pendingActions, setPendingActions] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    setSummary({
      total_billed: 245000,
      total_collected: 198500,
      pending: 46500,
      collection_rate: 81,
      cash: 85000,
      card: 78500,
      upi: 35000,
      insurance_pending: 32000
    });

    setTransactions([
      { id: '1', patient: 'Rajesh Kumar', type: 'Consultation', amount: 500, status: 'paid', method: 'UPI', time: '10:30 AM' },
      { id: '2', patient: 'Priya Sharma', type: 'Lab Tests', amount: 1200, status: 'paid', method: 'Card', time: '10:15 AM' },
      { id: '3', patient: 'Amit Singh', type: 'Pharmacy', amount: 850, status: 'pending', method: '-', time: '10:00 AM' },
      { id: '4', patient: 'Sunita Devi', type: 'Consultation', amount: 600, status: 'insurance', method: 'Insurance', time: '09:45 AM' }
    ]);

    setPendingActions([
      { id: '1', type: 'insurance', patient: 'Sunita Devi', amount: 8500, claim_id: 'INS-2026-001', days: 5 },
      { id: '2', type: 'payment', patient: 'Vijay Patel', amount: 2400, invoice: 'INV-1234', days: 3 },
      { id: '3', type: 'refund', patient: 'Meera Rao', amount: 500, reason: 'Cancelled test', days: 1 }
    ]);
  };

  const handleAction = (actionId, actionType) => {
    toast.success(`${actionType} action initiated`);
    setPendingActions(pendingActions.filter(a => a.id !== actionId));
  };

  const formatCurrency = (amount) => `₹${amount.toLocaleString()}`;

  return (
    <div className="space-y-4" data-testid="billing-reconciliation">
      {/* Header */}
      <Card className="bg-gradient-to-r from-emerald-600 to-green-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Billing Reconciliation</h2>
                <p className="text-emerald-100 text-sm">Today's financial summary</p>
              </div>
            </div>
            <Button variant="secondary" size="sm">
              <Download className="w-4 h-4 mr-1" /> Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {summary && (
        <>
          {/* Overview */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-500">Collection Rate</p>
                  <p className="text-3xl font-bold text-emerald-600">{summary.collection_rate}%</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Total Billed</p>
                  <p className="text-xl font-bold">{formatCurrency(summary.total_billed)}</p>
                </div>
              </div>
              <Progress value={summary.collection_rate} className="h-3 mb-2" />
              <div className="flex justify-between text-sm">
                <span className="text-emerald-600">Collected: {formatCurrency(summary.total_collected)}</span>
                <span className="text-amber-600">Pending: {formatCurrency(summary.pending)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <div className="grid grid-cols-4 gap-2">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-lg font-bold">{formatCurrency(summary.cash)}</p>
                <p className="text-xs text-gray-500">Cash</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-lg font-bold">{formatCurrency(summary.card)}</p>
                <p className="text-xs text-gray-500">Card</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-lg font-bold">{formatCurrency(summary.upi)}</p>
                <p className="text-xs text-gray-500">UPI</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-lg font-bold text-amber-600">{formatCurrency(summary.insurance_pending)}</p>
                <p className="text-xs text-gray-500">Insurance</p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Pending Actions */}
      {pendingActions.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Pending Actions ({pendingActions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingActions.map(action => (
              <div key={action.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    action.type === 'insurance' ? 'bg-blue-100' :
                    action.type === 'payment' ? 'bg-amber-100' : 'bg-red-100'
                  }`}>
                    {action.type === 'insurance' ? <CreditCard className="w-5 h-5 text-blue-600" /> :
                     action.type === 'payment' ? <Clock className="w-5 h-5 text-amber-600" /> :
                     <RefreshCw className="w-5 h-5 text-red-600" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{action.patient}</p>
                    <p className="text-xs text-gray-500">
                      {action.type === 'insurance' ? `Claim: ${action.claim_id}` :
                       action.type === 'payment' ? `Invoice: ${action.invoice}` :
                       action.reason} • {action.days} days
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{formatCurrency(action.amount)}</span>
                  <Button size="sm" onClick={() => handleAction(action.id, action.type)}>
                    {action.type === 'insurance' ? 'Follow Up' :
                     action.type === 'payment' ? 'Send Reminder' : 'Process'}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Today's Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0 divide-y">
          {transactions.map(txn => (
            <div key={txn.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  txn.status === 'paid' ? 'bg-green-100' :
                  txn.status === 'insurance' ? 'bg-blue-100' : 'bg-amber-100'
                }`}>
                  {txn.status === 'paid' ? <CheckCircle className="w-5 h-5 text-green-600" /> :
                   txn.status === 'insurance' ? <CreditCard className="w-5 h-5 text-blue-600" /> :
                   <Clock className="w-5 h-5 text-amber-600" />}
                </div>
                <div>
                  <p className="font-medium text-sm">{txn.patient}</p>
                  <p className="text-xs text-gray-500">{txn.type} • {txn.time}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold">{formatCurrency(txn.amount)}</p>
                <Badge variant="outline" className={
                  txn.status === 'paid' ? 'text-green-600' :
                  txn.status === 'insurance' ? 'text-blue-600' : 'text-amber-600'
                }>
                  {txn.method}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingReconciliation;

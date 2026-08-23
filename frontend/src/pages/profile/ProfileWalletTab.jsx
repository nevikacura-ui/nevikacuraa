import React, { useEffect } from 'react';
import { useProfile } from './ProfileContext';
import { Wallet, Gift, CreditCard, Plus } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ProfileWalletTab = () => {
  const { walletBalance, setWalletBalance, walletTransactions, setWalletTransactions } = useProfile();

  useEffect(() => {
    const fetchWalletData = async () => {
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('patientToken');
        const headers = { Authorization: `Bearer ${token}` };
        const [balRes, txnRes] = await Promise.all([
          axios.get(`${API}/wallet/balance`, { headers }).catch(() => ({ data: { balance: 0 } })),
          axios.get(`${API}/wallet/transactions`, { headers }).catch(() => ({ data: { transactions: [] } }))
        ]);
        setWalletBalance(balRes.data.balance || 0);
        setWalletTransactions(txnRes.data.transactions || []);
      } catch (e) { console.error(e); }
    };
    fetchWalletData();
  }, [setWalletBalance, setWalletTransactions]);

  return (
    <div className="pb-24">
      {/* Balance Card */}
      <div className="mx-4 mt-4 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-yellow-500/20 rounded-2xl p-6 border border-amber-500/30">
        <p className="text-sm text-gray-300 mb-1">Available Balance</p>
        <p className="text-4xl font-bold text-white" data-testid="wallet-balance">₹{walletBalance.toFixed(2)}</p>
        <p className="text-xs text-gray-400 mt-2">Use wallet balance at checkout</p>
      </div>

      {/* Transaction History */}
      <div className="bg-[#1A1A1A] rounded-2xl mx-4 mt-4 overflow-hidden border border-white/10">
        <div className="px-4 py-3 border-b border-white/10">
          <p className="font-semibold text-white">Transaction History</p>
        </div>
        {walletTransactions.length === 0 ? (
          <div className="p-8 text-center">
            <Wallet className="w-12 h-12 mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400">No transactions yet</p>
            <p className="text-xs text-gray-500 mt-1">Gift cash and rewards will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {walletTransactions.map((txn, idx) => (
              <div key={idx} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    txn.type === 'gift_cash' ? 'bg-green-500/20' : 
                    txn.type === 'topup' ? 'bg-blue-500/20' : 'bg-red-500/20'
                  }`}>
                    {txn.type === 'gift_cash' ? <Gift className="w-5 h-5 text-green-400" /> :
                     txn.type === 'topup' ? <Plus className="w-5 h-5 text-blue-400" /> :
                     <CreditCard className="w-5 h-5 text-red-400" />}
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">{txn.description || txn.type}</p>
                    <p className="text-xs text-gray-400">{new Date(txn.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <p className={`font-semibold ${txn.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {txn.amount > 0 ? '+' : ''}₹{Math.abs(txn.amount).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileWalletTab;

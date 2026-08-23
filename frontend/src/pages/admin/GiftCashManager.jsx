import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Gift } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const GiftCashManager = ({ staffToken }) => {
  const [searchPhone, setSearchPhone] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [giftAmount, setGiftAmount] = useState('');
  const [giftDescription, setGiftDescription] = useState('Gift cash from Nevika Cura');
  const [giftNote, setGiftNote] = useState('');
  const [giftHistory, setGiftHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` };

  const fetchHistory = async () => {
    try { const res = await fetch(`${API}/api/wallet/admin/gift-cash/history`, { headers }); const data = await res.json(); setGiftHistory(data.transactions || []); }
    catch (e) { console.error(e); }
  };

  useEffect(() => { fetchHistory(); }, []);

  const handleSearch = async () => {
    if (!searchPhone.trim()) return;
    setLoading(true);
    try { const res = await fetch(`${API}/api/wallet/admin/search-user?phone=${searchPhone}`, { headers }); const data = await res.json(); setSearchResult(data.users?.[0] || null); }
    catch { toast.error('Search failed'); }
    setLoading(false);
  };

  const handleSendGiftCash = async () => {
    if (!giftAmount || parseFloat(giftAmount) <= 0) { toast.error('Enter a valid amount'); return; }
    const phone = searchResult?.user_phone || searchPhone;
    if (!phone) { toast.error('Enter a phone number'); return; }
    setSending(true);
    try {
      const res = await fetch(`${API}/api/wallet/admin/gift-cash`, {
        method: 'POST', headers,
        body: JSON.stringify({ user_phone: phone, amount: parseFloat(giftAmount), description: giftDescription || 'Gift cash from Nevika Cura', admin_note: giftNote })
      });
      const data = await res.json();
      if (data.success) { toast.success(`Rs.${giftAmount} gift cash sent to ${data.user_name || phone}`); setGiftAmount(''); setGiftNote(''); setSearchResult(prev => prev ? { ...prev, balance: data.new_balance } : null); fetchHistory(); }
      else toast.error(data.detail || 'Failed to send gift cash');
    } catch { toast.error('Failed to send gift cash'); }
    setSending(false);
  };

  return (
    <div className="space-y-6" data-testid="gift-cash-manager">
      <Card>
        <div className="p-4 border-b"><h3 className="font-semibold flex items-center gap-2"><Gift className="w-5 h-5 text-amber-500" /> Send Gift Cash</h3></div>
        <div className="p-4 space-y-4">
          <div className="flex gap-2">
            <Input placeholder="Enter user phone number" value={searchPhone} onChange={(e) => setSearchPhone(e.target.value)} data-testid="gift-cash-phone-input" />
            <Button onClick={handleSearch} disabled={loading} data-testid="gift-cash-search-btn">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}</Button>
          </div>
          {searchResult && (
            <div className="bg-gray-50 rounded-lg p-3 border">
              <p className="font-medium">{searchResult.user_name || 'User'}</p>
              <p className="text-sm text-gray-500">{searchResult.user_phone}</p>
              <p className="text-sm text-amber-600 font-semibold">Current Balance: Rs.{(searchResult.balance || 0).toFixed(2)}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Amount (Rs.)</Label><Input type="number" placeholder="e.g. 500" value={giftAmount} onChange={(e) => setGiftAmount(e.target.value)} data-testid="gift-cash-amount-input" /></div>
            <div><Label>Description</Label><Input placeholder="e.g. Welcome bonus" value={giftDescription} onChange={(e) => setGiftDescription(e.target.value)} /></div>
          </div>
          <div><Label>Admin Note (optional)</Label><Input placeholder="Internal note" value={giftNote} onChange={(e) => setGiftNote(e.target.value)} /></div>
          <Button onClick={handleSendGiftCash} disabled={sending || !giftAmount} className="w-full bg-amber-500 hover:bg-amber-600 text-white" data-testid="gift-cash-send-btn">
            {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Gift className="w-4 h-4 mr-2" />} Send Gift Cash
          </Button>
        </div>
      </Card>
      <Card>
        <div className="p-4 border-b flex items-center justify-between"><h3 className="font-semibold">Recent Gift Cash Transactions</h3><Button variant="outline" size="sm" onClick={fetchHistory}><RefreshCw className="w-4 h-4" /></Button></div>
        <div className="divide-y max-h-96 overflow-y-auto">
          {giftHistory.length === 0 ? <div className="p-8 text-center text-gray-500">No gift cash transactions yet</div>
          : giftHistory.map((txn, idx) => (
            <div key={idx} className="p-3 flex items-center justify-between">
              <div><p className="font-medium text-sm">{txn.user_name || txn.user_phone || 'User'}</p><p className="text-xs text-gray-500">{txn.description}</p><p className="text-xs text-gray-400">{new Date(txn.created_at).toLocaleString()}</p></div>
              <div className="text-right"><p className="font-bold text-green-600">+Rs.{txn.amount}</p><p className="text-xs text-gray-400">Bal: Rs.{txn.balance_after?.toFixed(2) || '\u2014'}</p></div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default GiftCashManager;

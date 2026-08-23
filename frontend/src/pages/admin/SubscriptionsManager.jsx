import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Shield, Gift, Users as UsersIcon, Plus } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const SubscriptionsManager = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('subscriptions');
  const [showGrantModal, setShowGrantModal] = useState(false);
  const [grantForm, setGrantForm] = useState({ patient_id: '', plan_type: 'glydex', validity_days: 365, reason: '' });
  const [couponFilter, setCouponFilter] = useState({ plan_type: '', used: '' });

  useEffect(() => { fetchSubscriptions(); fetchCoupons(); }, []);

  const fetchSubscriptions = async () => {
    try { const res = await fetch(`${API}/api/subscriptions/admin/all-subscriptions`); const data = await res.json(); setSubscriptions(data.subscriptions || []); }
    catch (error) { console.error('Failed to fetch subscriptions:', error); }
  };

  const fetchCoupons = async () => {
    try {
      let url = `${API}/api/subscriptions/admin/coupons`;
      const params = new URLSearchParams();
      if (couponFilter.plan_type) params.append('plan_type', couponFilter.plan_type);
      if (couponFilter.used !== '') params.append('used', couponFilter.used);
      if (params.toString()) url += `?${params.toString()}`;
      const res = await fetch(url); const data = await res.json(); setCoupons(data.coupons || []);
    } catch (error) { console.error('Failed to fetch coupons:', error); }
    finally { setLoading(false); }
  };

  const handleGrantAccess = async () => {
    if (!grantForm.patient_id) { toast.error('Please enter patient ID'); return; }
    try {
      const res = await fetch(`${API}/api/subscriptions/admin/grant-access`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(grantForm) });
      const data = await res.json();
      if (data.success) { toast.success(data.message); setShowGrantModal(false); setGrantForm({ patient_id: '', plan_type: 'glydex', validity_days: 365, reason: '' }); fetchSubscriptions(); }
      else toast.error(data.detail || 'Failed to grant access');
    } catch { toast.error('Failed to grant access'); }
  };

  const generateCoupons = async (planType, count) => {
    try {
      const res = await fetch(`${API}/api/subscriptions/admin/generate-coupons?plan_type=${planType}&count=${count}&discount_percent=100&validity_days=365`, { method: 'POST' });
      const data = await res.json();
      if (data.success) { toast.success(`Generated ${data.count} ${planType.toUpperCase()} coupons`); fetchCoupons(); }
    } catch { toast.error('Failed to generate coupons'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button variant={activeSubTab === 'subscriptions' ? 'default' : 'outline'} onClick={() => setActiveSubTab('subscriptions')} size="sm"><UsersIcon className="w-4 h-4 mr-1" /> Subscriptions ({subscriptions.length})</Button>
        <Button variant={activeSubTab === 'coupons' ? 'default' : 'outline'} onClick={() => setActiveSubTab('coupons')} size="sm"><Gift className="w-4 h-4 mr-1" /> Coupons ({coupons.length})</Button>
        <Button onClick={() => setShowGrantModal(true)} size="sm" className="bg-green-600 hover:bg-green-700 text-white ml-auto"><Plus className="w-4 h-4 mr-1" /> Grant Free Access</Button>
      </div>

      {activeSubTab === 'subscriptions' && (
        <div className="space-y-3">
          {loading ? <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
          : subscriptions.length === 0 ? <div className="text-center py-8 text-gray-500">No subscriptions yet</div>
          : subscriptions.map((sub, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{sub.patient_name || sub.patient_id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sub.plan_type === 'glydex' ? 'bg-purple-100 text-purple-700' : 'bg-pink-100 text-pink-700'}`}>{sub.plan_type?.toUpperCase()}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${sub.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{sub.status}</span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">{sub.patient_phone} {'\u2022'} {'\u20B9'}{sub.amount_paid || 0} via {sub.payment_method}</div>
                </div>
                <div className="text-right text-sm"><div className="text-gray-500">Expires</div><div className="font-medium">{new Date(sub.end_date).toLocaleDateString()}</div></div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeSubTab === 'coupons' && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap items-center">
            <select className="border rounded-md px-3 py-1.5 text-sm" value={couponFilter.plan_type} onChange={(e) => setCouponFilter({...couponFilter, plan_type: e.target.value})}>
              <option value="">All Plans</option><option value="glydex">Glydex</option><option value="evara">Evara</option>
            </select>
            <select className="border rounded-md px-3 py-1.5 text-sm" value={couponFilter.used} onChange={(e) => setCouponFilter({...couponFilter, used: e.target.value})}>
              <option value="">All Status</option><option value="false">Unused</option><option value="true">Used</option>
            </select>
            <Button size="sm" variant="outline" onClick={fetchCoupons}><RefreshCw className="w-4 h-4 mr-1" /> Refresh</Button>
            <div className="ml-auto flex gap-2">
              <Button size="sm" onClick={() => generateCoupons('glydex', 50)} className="bg-purple-600 hover:bg-purple-700">+50 Glydex</Button>
              <Button size="sm" onClick={() => generateCoupons('evara', 50)} className="bg-pink-600 hover:bg-pink-700">+50 Evara</Button>
            </div>
          </div>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 max-h-[60vh] overflow-y-auto">
            {coupons.slice(0, 100).map((coupon, i) => (
              <div key={i} className={`p-3 rounded-lg border ${coupon.used_by ? 'bg-gray-50 border-gray-200' : coupon.plan_type === 'glydex' ? 'bg-purple-50 border-purple-200' : 'bg-pink-50 border-pink-200'}`}>
                <div className="flex items-center justify-between">
                  <code className="font-mono font-bold">{coupon.code}</code>
                  <span className={`px-2 py-0.5 rounded text-xs ${coupon.used_by ? 'bg-gray-200 text-gray-600' : 'bg-green-100 text-green-700'}`}>{coupon.used_by ? 'Used' : 'Active'}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">{coupon.plan_type?.toUpperCase()} {'\u2022'} {coupon.discount_percent}% off{coupon.used_by && <span className="ml-2">{'\u2022'} Used by: {coupon.used_by}</span>}</div>
              </div>
            ))}
          </div>
          {coupons.length > 100 && <p className="text-sm text-gray-500 text-center">Showing 100 of {coupons.length} coupons</p>}
        </div>
      )}

      <Dialog open={showGrantModal} onOpenChange={setShowGrantModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Grant Free Subscription Access</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>Patient ID</Label><Input placeholder="Enter patient ID (e.g., NC-2026-00001)" value={grantForm.patient_id} onChange={(e) => setGrantForm({...grantForm, patient_id: e.target.value})} /></div>
            <div><Label>Plan Type</Label><select className="w-full border rounded-md px-3 py-2" value={grantForm.plan_type} onChange={(e) => setGrantForm({...grantForm, plan_type: e.target.value})}><option value="glydex">Glydex (Diabetes Care)</option><option value="evara">Evara (Womens Wellness)</option></select></div>
            <div><Label>Validity (Days)</Label><Input type="number" value={grantForm.validity_days} onChange={(e) => setGrantForm({...grantForm, validity_days: parseInt(e.target.value)})} /></div>
            <div><Label>Reason (Optional)</Label><Input placeholder="e.g., Beta tester, VIP patient" value={grantForm.reason} onChange={(e) => setGrantForm({...grantForm, reason: e.target.value})} /></div>
            <Button onClick={handleGrantAccess} className="w-full bg-green-600 hover:bg-green-700">Grant Access</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionsManager;

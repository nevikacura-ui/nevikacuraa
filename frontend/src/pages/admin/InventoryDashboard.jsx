import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Package, AlertTriangle, TrendingDown } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const InventoryDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bulkUpdates, setBulkUpdates] = useState([{ medicine_id: '', mrp: '', sale_price: '' }]);
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const token = localStorage.getItem('token');
        const r = await fetch(`${API}/api/inventory/stock-summary`, { headers: { Authorization: `Bearer ${token}` } });
        const d = await r.json();
        if (d.success) setSummary(d);
      } catch { /* fallback */ }
      setLoading(false);
    };
    fetchSummary();
  }, []);

  const handleBulkUpdate = async () => {
    const valid = bulkUpdates.filter(u => u.medicine_id);
    if (!valid.length) { toast.error('Add at least one medicine to update'); return; }
    setBulkLoading(true);
    try {
      const token = localStorage.getItem('token');
      const r = await fetch(`${API}/api/inventory/bulk-price-update`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ updates: valid.map(u => ({ medicine_id: u.medicine_id, ...(u.mrp ? { mrp: parseFloat(u.mrp) } : {}), ...(u.sale_price ? { sale_price: parseFloat(u.sale_price) } : {}) })) }),
      });
      const d = await r.json();
      toast.success(`Updated ${d.updated} medicines`);
      if (d.errors?.length) toast.error(`${d.errors.length} failed`);
      setBulkUpdates([{ medicine_id: '', mrp: '', sale_price: '' }]);
    } catch { toast.error('Bulk update failed'); }
    setBulkLoading(false);
  };

  if (loading) return <div className="text-center py-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-500" /><p className="text-sm text-slate-500 mt-2">Loading inventory...</p></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold flex items-center gap-2"><Package className="w-5 h-5 text-blue-500" /> Inventory Dashboard</h2>
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-green-50 border-green-200"><p className="text-xs text-green-600 font-medium">In Stock</p><p className="text-2xl font-bold text-green-700">{summary.pharmacy?.in_stock || 0}</p></Card>
          <Card className="p-4 bg-amber-50 border-amber-200"><p className="text-xs text-amber-600 font-medium flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Low Stock</p><p className="text-2xl font-bold text-amber-700">{summary.pharmacy?.low_stock || 0}</p></Card>
          <Card className="p-4 bg-red-50 border-red-200"><p className="text-xs text-red-600 font-medium">Out of Stock</p><p className="text-2xl font-bold text-red-700">{summary.pharmacy?.out_of_stock || 0}</p></Card>
          <Card className="p-4 bg-blue-50 border-blue-200"><p className="text-xs text-blue-600 font-medium">Total Medicines</p><p className="text-2xl font-bold text-blue-700">{summary.pharmacy?.total || 0}</p></Card>
        </div>
      )}
      {summary?.batch_expiry && (
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> Batch Expiry Alerts</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-red-50 text-center"><p className="text-xl font-bold text-red-600">{summary.batch_expiry.expired}</p><p className="text-xs text-red-500">Expired</p></div>
            <div className="p-3 rounded-lg bg-amber-50 text-center"><p className="text-xl font-bold text-amber-600">{summary.batch_expiry.expiring_30_days}</p><p className="text-xs text-amber-500">Expiring in 30d</p></div>
            <div className="p-3 rounded-lg bg-blue-50 text-center"><p className="text-xl font-bold text-blue-600">{summary.batch_expiry.expiring_90_days}</p><p className="text-xs text-blue-500">Expiring in 90d</p></div>
          </div>
        </Card>
      )}
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">Bulk Price Update</h3>
        <div className="space-y-2">
          {bulkUpdates.map((item, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input value={item.medicine_id} onChange={(e) => { const u = [...bulkUpdates]; u[i].medicine_id = e.target.value; setBulkUpdates(u); }} placeholder="Medicine ID" className="flex-1 h-9 text-sm" data-testid={`bulk-med-id-${i}`} />
              <Input value={item.mrp} onChange={(e) => { const u = [...bulkUpdates]; u[i].mrp = e.target.value; setBulkUpdates(u); }} placeholder="MRP" className="w-24 h-9 text-sm" type="number" data-testid={`bulk-mrp-${i}`} />
              <Input value={item.sale_price} onChange={(e) => { const u = [...bulkUpdates]; u[i].sale_price = e.target.value; setBulkUpdates(u); }} placeholder="Sale Price" className="w-24 h-9 text-sm" type="number" data-testid={`bulk-sale-${i}`} />
              {i > 0 && <button onClick={() => setBulkUpdates(bulkUpdates.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => setBulkUpdates([...bulkUpdates, { medicine_id: '', mrp: '', sale_price: '' }])} data-testid="add-bulk-row"><Plus className="w-3 h-3 mr-1" /> Add Row</Button>
            <Button size="sm" onClick={handleBulkUpdate} disabled={bulkLoading} className="bg-blue-500 hover:bg-blue-600" data-testid="submit-bulk-update">{bulkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Prices'}</Button>
          </div>
        </div>
      </Card>
      {summary?.recently_updated?.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3">Recently Updated Medicines</h3>
          <div className="space-y-2">
            {summary.recently_updated.map((m, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div><p className="text-sm font-medium">{m.name}</p><p className="text-xs text-slate-400">ID: {m.id}</p></div>
                <div className="text-right"><p className="text-sm font-semibold">{'\u20B9'}{m.mrp}</p><p className={`text-xs ${m.stock > 10 ? 'text-green-500' : m.stock > 0 ? 'text-amber-500' : 'text-red-500'}`}>Stock: {m.stock}</p></div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default InventoryDashboard;

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Sparkles } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const AIEnrichmentManager = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [store, setStore] = useState('all');

  const fetchStatus = async () => {
    try { const res = await fetch(`${API}/api/admin/ai-enrichment/status`); const data = await res.json(); setStatus(data); }
    catch (e) { console.error('Failed to fetch enrichment status:', e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStatus(); const t = setInterval(fetchStatus, 10000); return () => clearInterval(t); }, []);

  const triggerEnrichment = async () => {
    setTriggering(true);
    try {
      const res = await fetch(`${API}/api/admin/ai-enrichment/trigger?store=${store}&batch_size=25&max_batches=40`, { method: 'POST' });
      const data = await res.json();
      if (data.success) { toast.success('Enrichment job started!'); fetchStatus(); }
      else toast.error(data.message || 'Failed to start');
    } catch { toast.error('Failed to trigger enrichment'); }
    finally { setTriggering(false); }
  };

  if (loading) return <div className="p-8 text-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

  const pct = status?.enriched_percentage || 0;
  const job = status?.latest_job;

  return (
    <div className="space-y-4" data-testid="ai-enrichment-panel">
      <Card className="p-6">
        <h2 className="text-lg font-bold mb-1">Gemini AI Description Enrichment</h2>
        <p className="text-sm text-gray-500 mb-4">Auto-generate composition, uses, and side effects for medicines using AI.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-slate-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-slate-800">{(status?.total_products || 0).toLocaleString()}</p><p className="text-xs text-slate-500">Total Products</p></div>
          <div className="bg-emerald-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-emerald-600">{pct}%</p><p className="text-xs text-slate-500">Enriched</p></div>
          <div className="bg-amber-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-amber-600">{(status?.total_missing || 0).toLocaleString()}</p><p className="text-xs text-slate-500">Missing Descriptions</p></div>
          <div className="bg-orange-50 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-orange-600">{(status?.missing_by_store?.orange_pharmacy || 0).toLocaleString()}</p><p className="text-xs text-slate-500">Pharmacy Missing</p></div>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-4"><div className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
        <div className="flex items-center gap-3">
          <select value={store} onChange={e => setStore(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
            <option value="all">All Stores</option><option value="orange_pharmacy">Orange Pharmacy Only</option><option value="orange_healthplus">Orange HealthPlus Only</option>
          </select>
          <Button onClick={triggerEnrichment} disabled={triggering || job?.status === 'running'} className="bg-emerald-600 hover:bg-emerald-700">
            {triggering ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />} {job?.status === 'running' ? 'Running...' : 'Start Enrichment'}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchStatus}><RefreshCw className="w-4 h-4" /></Button>
        </div>
      </Card>
      {job && (
        <Card className="p-4">
          <h3 className="font-semibold mb-2">Latest Job: {job.job_id}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div><span className="text-slate-500">Status:</span> <span className={`font-bold ${job.status === 'running' ? 'text-blue-600' : job.status === 'completed' ? 'text-emerald-600' : 'text-red-600'}`}>{job.status}</span></div>
            <div><span className="text-slate-500">Batches:</span> <span className="font-medium">{job.batches_done}/{job.max_batches}</span></div>
            <div><span className="text-slate-500">Updated:</span> <span className="font-bold text-emerald-600">{job.total_updated}</span></div>
            <div><span className="text-slate-500">Store:</span> <span className="font-medium">{job.store}</span></div>
          </div>
          {job.last_error && <p className="text-xs text-red-500 mt-2">Last error: {job.last_error}</p>}
        </Card>
      )}
    </div>
  );
};

export default AIEnrichmentManager;

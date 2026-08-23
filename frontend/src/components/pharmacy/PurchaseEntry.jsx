import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Plus, Trash2, Upload, Download, Loader2, Package, Building2,
  FileSpreadsheet, IndianRupee
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;
const getAuth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('staffToken')}` } });

const EMPTY_ITEM = { medicine_name: '', batch_no: '', expiry: '', quantity: 0, purchase_rate: 0, mrp: 0, gst_percent: 0, location: '' };

export default function PurchaseEntry({ onPurchaseCreated }) {
  const [mode, setMode] = useState('manual'); // manual | csv
  const [supplierName, setSupplierName] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    axios.get(`${API}/api/pharmacy-billing/suppliers`, getAuth()).then(r => setSuppliers(r.data.suppliers || [])).catch(() => {});
    axios.get(`${API}/api/pharmacy-billing/purchases?limit=10`, getAuth()).then(r => setPurchases(r.data.purchases || [])).catch(() => {});
  }, []);

  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const addRow = () => setItems(prev => [...prev, { ...EMPTY_ITEM }]);
  const removeRow = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  const totalAmount = items.reduce((s, i) => s + (i.purchase_rate * i.quantity), 0);
  const totalGST = items.reduce((s, i) => s + (i.purchase_rate * i.quantity * i.gst_percent / 100), 0);

  const handleSave = async () => {
    const validItems = items.filter(i => i.medicine_name && i.quantity > 0);
    if (!validItems.length) { toast.error('Add at least one item with name & quantity'); return; }
    setSaving(true);
    try {
      const res = await axios.post(`${API}/api/pharmacy-billing/purchases`, {
        supplier_name: supplierName, invoice_number: invoiceNo, items: validItems,
      }, getAuth());
      if (res.data.success) {
        toast.success(`Purchase ${res.data.purchase.purchase_no} recorded! Inventory updated.`);
        setItems([{ ...EMPTY_ITEM }]);
        setSupplierName('');
        setInvoiceNo('');
        onPurchaseCreated?.();
      }
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
    setSaving(false);
  };

  const handleCSVImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('supplier_name', supplierName);
    formData.append('invoice_number', invoiceNo);
    try {
      const res = await axios.post(`${API}/api/pharmacy-billing/purchase-csv-import`, formData, {
        ...getAuth(), headers: { ...getAuth().headers, 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        toast.success(`Purchase recorded! ${res.data.purchase?.item_count || 0} items imported.`);
        onPurchaseCreated?.();
      }
      if (res.data.errors?.length) toast.warning(`${res.data.errors.length} rows had errors`);
    } catch (err) { toast.error(err.response?.data?.detail || 'Import failed'); }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const downloadTemplate = async () => {
    try {
      const res = await axios.get(`${API}/api/pharmacy-billing/purchase-csv-template`, { ...getAuth(), responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = 'purchase_template.csv'; a.click();
    } catch { toast.error('Failed'); }
  };

  return (
    <div className="space-y-4" data-testid="purchase-entry">
      {/* Mode Toggle + History */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          <button onClick={() => setMode('manual')} className={`px-4 py-1.5 text-sm font-medium rounded-lg ${mode === 'manual' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
            Manual Entry
          </button>
          <button onClick={() => setMode('csv')} className={`px-4 py-1.5 text-sm font-medium rounded-lg ${mode === 'csv' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
            CSV Import
          </button>
        </div>
        <Button onClick={() => setShowHistory(!showHistory)} variant="outline" className="h-9 rounded-xl text-sm border-gray-200 ml-auto">
          {showHistory ? 'Hide' : 'Show'} History
        </Button>
      </div>

      {/* Supplier & Invoice */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2.5">Supplier Details</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input value={supplierName} onChange={e => setSupplierName(e.target.value)} list="suppliers-list"
              placeholder="Supplier name" className="pl-9 h-9 text-sm bg-white border-gray-200 rounded-lg" data-testid="supplier-name" />
            <datalist id="suppliers-list">
              {suppliers.map(s => <option key={s.id} value={s.name} />)}
            </datalist>
          </div>
          <Input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)}
            placeholder="Invoice / Bill Number" className="h-9 text-sm bg-white border-gray-200 rounded-lg" />
          {mode === 'csv' && (
            <div className="flex gap-2">
              <Button onClick={downloadTemplate} variant="outline" className="h-9 rounded-lg text-xs gap-1 border-gray-200">
                <Download className="w-3.5 h-3.5" /> Template
              </Button>
              <div className="relative flex-1">
                <input ref={fileRef} type="file" accept=".csv" onChange={handleCSVImport} className="hidden" id="purchase-csv" />
                <Button onClick={() => fileRef.current?.click()} disabled={importing}
                  className="h-9 w-full rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs gap-1" data-testid="purchase-csv-upload">
                  {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {importing ? 'Importing...' : 'Upload CSV'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manual Entry Table */}
      {mode === 'manual' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-xs text-gray-500 uppercase">
                  <th className="text-left px-3 py-2">Medicine Name</th>
                  <th className="px-2 py-2 w-20">Batch</th>
                  <th className="px-2 py-2 w-20">Expiry</th>
                  <th className="px-2 py-2 w-14">Qty</th>
                  <th className="px-2 py-2 w-16">Rate</th>
                  <th className="px-2 py-2 w-16">MRP</th>
                  <th className="px-2 py-2 w-14">GST%</th>
                  <th className="px-2 py-2 w-20">Location</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-50">
                    <td className="px-2 py-1.5">
                      <Input value={item.medicine_name} onChange={e => updateItem(idx, 'medicine_name', e.target.value)}
                        placeholder="Medicine name" className="h-8 text-xs rounded-lg border-gray-200" />
                    </td>
                    <td className="px-1 py-1.5">
                      <Input value={item.batch_no} onChange={e => updateItem(idx, 'batch_no', e.target.value)}
                        placeholder="B001" className="h-8 text-xs rounded-lg border-gray-200 text-center w-20" />
                    </td>
                    <td className="px-1 py-1.5">
                      <Input value={item.expiry} onChange={e => updateItem(idx, 'expiry', e.target.value)}
                        placeholder="2027-06" className="h-8 text-xs rounded-lg border-gray-200 text-center w-20" />
                    </td>
                    <td className="px-1 py-1.5">
                      <Input type="number" value={item.quantity || ''} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                        className="h-8 text-xs rounded-lg border-gray-200 text-center w-14" />
                    </td>
                    <td className="px-1 py-1.5">
                      <Input type="number" value={item.purchase_rate || ''} onChange={e => updateItem(idx, 'purchase_rate', parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs rounded-lg border-gray-200 text-center w-16" />
                    </td>
                    <td className="px-1 py-1.5">
                      <Input type="number" value={item.mrp || ''} onChange={e => updateItem(idx, 'mrp', parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs rounded-lg border-gray-200 text-center w-16" />
                    </td>
                    <td className="px-1 py-1.5">
                      <Input type="number" value={item.gst_percent || ''} onChange={e => updateItem(idx, 'gst_percent', parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs rounded-lg border-gray-200 text-center w-14" />
                    </td>
                    <td className="px-1 py-1.5">
                      <Input value={item.location} onChange={e => updateItem(idx, 'location', e.target.value)}
                        placeholder="Rack-A" className="h-8 text-xs rounded-lg border-gray-200 w-20" />
                    </td>
                    <td className="pr-2">
                      {items.length > 1 && (
                        <button onClick={() => removeRow(idx)} className="p-1 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <Button onClick={addRow} variant="outline" className="h-8 rounded-lg text-xs gap-1 border-gray-200">
              <Plus className="w-3.5 h-3.5" /> Add Row
            </Button>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-500">Total: <span className="font-bold text-gray-900"><IndianRupee className="w-3 h-3 inline" />{totalAmount.toFixed(2)}</span></span>
              <span className="text-gray-500">GST: <span className="font-bold text-gray-900"><IndianRupee className="w-3 h-3 inline" />{totalGST.toFixed(2)}</span></span>
              <Button onClick={handleSave} disabled={saving} className="h-9 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm gap-1.5" data-testid="save-purchase-btn">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                Save Purchase
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase History */}
      {showHistory && purchases.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-700">Recent Purchases</p>
          </div>
          <div className="divide-y divide-gray-50">
            {purchases.map(p => (
              <div key={p.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.purchase_no}</p>
                  <p className="text-xs text-gray-500">{p.supplier_name || 'No supplier'} &middot; {p.date} &middot; {p.item_count} items</p>
                </div>
                <p className="text-sm font-bold text-gray-900"><IndianRupee className="w-3 h-3 inline" />{(p.grand_total || 0).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import { Upload, Download, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;
const getAuth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('staffToken')}` } });

export default function CSVImport({ onImportComplete }) {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [exporting, setExporting] = useState(false);
  const fileRef = useRef(null);

  const handleDownloadTemplate = async () => {
    try {
      const res = await axios.get(`${API}/api/pharmacy-billing/csv-template`, { ...getAuth(), responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = 'medicine_import_template.csv'; a.click();
      URL.revokeObjectURL(url);
      toast.success('Template downloaded!');
    } catch { toast.error('Failed to download template'); }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { toast.error('Please upload a CSV file'); return; }

    setImporting(true);
    setResult(null);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${API}/api/pharmacy-billing/csv-import`, formData, {
        ...getAuth(), headers: { ...getAuth().headers, 'Content-Type': 'multipart/form-data' }
      });
      setResult(res.data);
      toast.success(`Imported ${res.data.imported} new, updated ${res.data.updated} existing`);
      onImportComplete?.();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Import failed');
    }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await axios.get(`${API}/api/pharmacy-billing/csv-export`, { ...getAuth(), responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url; a.download = `orange_pharmacy_inventory.csv`; a.click();
      URL.revokeObjectURL(url);
      toast.success('Inventory exported!');
    } catch { toast.error('Export failed'); }
    setExporting(false);
  };

  return (
    <div className="space-y-4" data-testid="csv-import">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-base font-bold text-gray-900 mb-1">Import Medicines from CSV</h3>
        <p className="text-sm text-gray-500 mb-4">Upload a CSV file to bulk-add or update your inventory. Existing medicines (matched by name) will be updated.</p>

        <div className="flex flex-wrap gap-3 mb-4">
          <Button onClick={handleDownloadTemplate} variant="outline" className="h-10 rounded-xl border-gray-200 gap-2 text-sm" data-testid="download-template">
            <Download className="w-4 h-4" /> Download Template
          </Button>
          <div className="relative">
            <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} className="hidden" id="csv-upload" />
            <Button onClick={() => fileRef.current?.click()} disabled={importing}
              className="h-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-white gap-2 text-sm" data-testid="upload-csv-btn">
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {importing ? 'Importing...' : 'Upload CSV'}
            </Button>
          </div>
          <Button onClick={handleExport} disabled={exporting} variant="outline" className="h-10 rounded-xl border-gray-200 gap-2 text-sm" data-testid="export-csv-btn">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            Export Inventory
          </Button>
        </div>

        {/* CSV Column Guide */}
        <div className="bg-gray-50 rounded-lg p-4 text-xs">
          <p className="font-semibold text-gray-700 mb-2">Supported CSV Columns:</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 text-gray-600">
            {['name*', 'generic_name', 'manufacturer', 'category', 'form', 'mrp', 'purchase_price', 'discount_percent', 'stock_quantity', 'batch_no', 'expiry', 'hsn_code', 'barcode', 'description'].map(col => (
              <span key={col} className={`px-2 py-1 rounded ${col.includes('*') ? 'bg-orange-100 text-orange-700 font-semibold' : 'bg-white border border-gray-200'}`}>
                {col}
              </span>
            ))}
          </div>
          <p className="text-gray-400 mt-2">* Required field. Column headers are flexible (e.g., "Name", "Medicine Name", "name" all work).</p>
        </div>
      </div>

      {/* Import Result */}
      {result && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5" data-testid="import-result">
          <h4 className="text-sm font-bold text-gray-900 mb-3">Import Result</h4>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
              <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-green-700">{result.imported}</p>
              <p className="text-xs text-green-600">New Added</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
              <FileSpreadsheet className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-blue-700">{result.updated}</p>
              <p className="text-xs text-blue-600">Updated</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-600 mx-auto mb-1" />
              <p className="text-lg font-bold text-amber-700">{result.errors?.length || 0}</p>
              <p className="text-xs text-amber-600">Errors</p>
            </div>
          </div>
          {result.errors?.length > 0 && (
            <div className="bg-red-50 rounded-lg p-3 text-xs text-red-700 max-h-32 overflow-y-auto">
              {result.errors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import { Barcode, Printer, Download, Search, RefreshCw, Loader2, CheckCircle2 } from 'lucide-react';
import JsBarcode from 'jsbarcode';

const API = process.env.REACT_APP_BACKEND_URL;
const getAuth = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('staffToken')}` } });

// Single Barcode Label Component
function BarcodeLabel({ medicine }) {
  const svgRef = useRef(null);
  useEffect(() => {
    if (svgRef.current && medicine.barcode) {
      try {
        JsBarcode(svgRef.current, medicine.barcode, {
          format: 'CODE128', width: 1.2, height: 28, displayValue: true,
          fontSize: 8, margin: 2, textMargin: 1,
        });
      } catch { /* invalid barcode */ }
    }
  }, [medicine.barcode]);

  return (
    <div className="barcode-sticker flex flex-col items-center justify-center p-1 border border-gray-300 overflow-hidden"
      style={{ width: '38.1mm', height: '21.2mm', pageBreakInside: 'avoid' }}>
      <p className="text-[7px] font-bold text-center leading-tight truncate w-full px-0.5" style={{ maxHeight: '10px' }}>
        {medicine.name?.substring(0, 30)}
      </p>
      <svg ref={svgRef} className="w-full" style={{ maxHeight: '14mm' }} />
      <div className="flex justify-between w-full px-1 text-[6px] text-gray-600">
        <span>MRP: {medicine.mrp || '-'}</span>
        {medicine.expiry && <span>Exp: {medicine.expiry}</span>}
      </div>
    </div>
  );
}

export default function BarcodeGenerator() {
  const [medicines, setMedicines] = useState([]);
  const [selectedMeds, setSelectedMeds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const printRef = useRef(null);

  const loadMedicinesWithBarcodes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/pharmacy-billing/barcode/sticker-data?limit=200`, getAuth());
      setMedicines(res.data.medicines || []);
    } catch { toast.error('Failed to load barcode data'); }
    setLoading(false);
  }, []);

  useEffect(() => { loadMedicinesWithBarcodes(); }, [loadMedicinesWithBarcodes]);

  const handleBulkGenerate = async () => {
    setGenerating(true);
    try {
      const res = await axios.post(`${API}/api/pharmacy-billing/barcode/bulk-generate`, [], getAuth());
      toast.success(`Generated ${res.data.generated} barcodes!`);
      loadMedicinesWithBarcodes();
    } catch { toast.error('Failed to generate barcodes'); }
    setGenerating(false);
  };

  const toggleSelect = (med) => {
    setSelectedMeds(prev => {
      const exists = prev.find(m => m.id === med.id);
      if (exists) return prev.filter(m => m.id !== med.id);
      if (prev.length >= 65) { toast.error('Max 65 stickers per sheet'); return prev; }
      return [...prev, med];
    });
  };

  const selectAll = () => {
    const filtered = filteredMeds.slice(0, 65);
    setSelectedMeds(filtered);
  };

  const handlePrint = () => {
    if (!selectedMeds.length) { toast.error('Select medicines for sticker sheet'); return; }
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><head><title>Orange Pharmacy - Barcode Stickers</title>
      <style>
        @page { size: A4; margin: 5mm; }
        body { margin: 0; font-family: Arial, sans-serif; }
        .grid { display: grid; grid-template-columns: repeat(5, 38.1mm); grid-template-rows: repeat(13, 21.2mm); gap: 0; justify-content: center; }
        .sticker { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1mm; border: 0.5px solid #ddd; overflow: hidden; page-break-inside: avoid; }
        .sticker .name { font-size: 7px; font-weight: bold; text-align: center; max-height: 10px; overflow: hidden; line-height: 1.2; }
        .sticker .info { display: flex; justify-content: space-between; width: 100%; padding: 0 1mm; font-size: 6px; color: #666; }
        svg { max-width: 100%; max-height: 14mm; }
      </style></head><body><div class="grid">
    `);

    selectedMeds.forEach(med => {
      const canvas = document.createElement('canvas');
      try {
        JsBarcode(canvas, med.barcode, { format: 'CODE128', width: 1.2, height: 28, displayValue: true, fontSize: 8, margin: 2, textMargin: 1 });
        const imgSrc = canvas.toDataURL('image/png');
        printWindow.document.write(`
          <div class="sticker">
            <div class="name">${(med.name || '').substring(0, 30)}</div>
            <img src="${imgSrc}" style="max-width:100%;max-height:14mm" />
            <div class="info"><span>MRP: ${med.mrp || '-'}</span>${med.expiry ? `<span>Exp: ${med.expiry}</span>` : ''}</div>
          </div>
        `);
      } catch {
        printWindow.document.write(`<div class="sticker"><div class="name">${med.name}</div><div>No barcode</div></div>`);
      }
    });

    // Fill remaining cells to complete the 65 grid
    const remaining = 65 - selectedMeds.length;
    for (let i = 0; i < remaining; i++) {
      printWindow.document.write('<div class="sticker"></div>');
    }

    printWindow.document.write('</div></body></html>');
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  const filteredMeds = medicines.filter(m =>
    !searchQ || m.name?.toLowerCase().includes(searchQ.toLowerCase()) || m.barcode?.includes(searchQ)
  );

  return (
    <div className="space-y-4" data-testid="barcode-generator">
      {/* Header Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder="Search medicines with barcodes..." className="pl-10 h-10 bg-white border-gray-200 rounded-xl text-sm" />
        </div>
        <Button onClick={handleBulkGenerate} disabled={generating} variant="outline"
          className="h-10 rounded-xl border-gray-200 text-sm gap-1.5" data-testid="bulk-generate-btn">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Barcode className="w-4 h-4" />}
          Auto-Generate Barcodes
        </Button>
        <Button onClick={selectAll} variant="outline" className="h-10 rounded-xl border-gray-200 text-sm gap-1.5">
          <CheckCircle2 className="w-4 h-4" /> Select All (65 max)
        </Button>
        <Button onClick={handlePrint} disabled={!selectedMeds.length}
          className="h-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm gap-1.5" data-testid="print-stickers-btn">
          <Printer className="w-4 h-4" /> Print {selectedMeds.length} Stickers
        </Button>
      </div>

      {/* Medicine Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-orange-500" /></div>
      ) : filteredMeds.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Barcode className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No medicines with barcodes found</p>
          <p className="text-xs mt-1">Click "Auto-Generate Barcodes" to assign barcodes to your inventory</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {filteredMeds.map(med => (
            <button key={med.id} onClick={() => toggleSelect(med)}
              className={`text-left p-3 rounded-xl border transition-all text-sm ${selectedMeds.find(m => m.id === med.id)
                ? 'border-orange-400 bg-orange-50 shadow-sm ring-2 ring-orange-200'
                : 'border-gray-200 bg-white hover:border-gray-300'}`}
              data-testid={`barcode-med-${med.id}`}>
              <p className="font-medium text-gray-900 text-xs truncate">{med.name}</p>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5">{med.barcode}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">MRP: {med.mrp || '-'}</p>
            </button>
          ))}
        </div>
      )}

      {/* Preview Section */}
      {selectedMeds.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-700 mb-3">Sticker Preview ({selectedMeds.length}/65)</p>
          <div ref={printRef} className="grid gap-0" style={{ gridTemplateColumns: 'repeat(5, 38.1mm)' }}>
            {selectedMeds.slice(0, 10).map(med => (
              <BarcodeLabel key={med.id} medicine={med} />
            ))}
            {selectedMeds.length > 10 && (
              <div className="col-span-5 text-center text-xs text-gray-400 py-2">
                + {selectedMeds.length - 10} more stickers (visible in print)
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ScanLine, Search, Pill, X, Loader2, Camera, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const MedicineScanner = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('search'); // 'search' | 'scan' | 'result'
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [medicine, setMedicine] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const scannerRef = useRef(null);
  const html5QrCode = useRef(null);

  const searchMedicine = async (q) => {
    if (!q || q.length < 2) { setResults([]); return; }
    setSearchLoading(true);
    try {
      const res = await axios.get(`${API}/medicine/search?q=${q}`);
      setResults(res.data.results || []);
    } catch { setResults([]); }
    setSearchLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => searchMedicine(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const startScan = async () => {
    setMode('scan');
    setScanning(true);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      html5QrCode.current = new Html5Qrcode("scanner-region");
      await html5QrCode.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        async (decodedText) => {
          stopScan();
          try {
            const res = await axios.get(`${API}/medicine/lookup/${decodedText}`);
            if (res.data.found) {
              setMedicine(res.data.medicine);
              setMode('result');
            } else {
              toast.error('Medicine not found');
              setMode('search');
            }
          } catch {
            toast.error('Lookup failed');
            setMode('search');
          }
        },
        () => {} // ignore scan failures
      );
    } catch (err) {
      toast.error('Camera access required for scanning');
      setMode('search');
      setScanning(false);
    }
  };

  const stopScan = () => {
    if (html5QrCode.current) {
      html5QrCode.current.stop().catch(() => {});
      html5QrCode.current = null;
    }
    setScanning(false);
  };

  useEffect(() => { return () => { stopScan(); }; }, []);

  const selectMedicine = (med) => {
    setMedicine(med);
    setMode('result');
    setQuery('');
    setResults([]);
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: '#050510' }} data-testid="medicine-scanner-page">
      {/* Header */}
      <div className="sticky top-0 z-50 px-4 pt-4 pb-3" style={{ background: 'rgba(5,5,16,0.9)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => { stopScan(); navigate(-1); }} className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <ArrowLeft className="w-4 h-4 text-white/50" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-semibold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Scan Medicines</h1>
            <p className="text-[10px] text-white/25">Scan barcode or search by name</p>
          </div>
          <span className="px-2.5 py-1 rounded-lg text-[9px] font-bold" style={{ background: 'rgba(254,205,211,0.12)', color: '#fecdd3' }}>New</span>
        </div>
      </div>

      <div className="px-4 mt-3">
        {/* Mode Toggle */}
        <div className="flex gap-2 mb-5">
          <button onClick={() => { stopScan(); setMode('search'); setMedicine(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold transition-all ${mode === 'search' || mode === 'result' ? 'text-pink-300' : 'text-white/30'}`}
            style={mode === 'search' || mode === 'result' ? { background: 'rgba(236,72,153,0.12)', border: '1px solid rgba(236,72,153,0.25)' } : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            data-testid="search-mode-btn">
            <Search className="w-4 h-4" /> Search
          </button>
          <button onClick={startScan}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold transition-all ${mode === 'scan' ? 'text-teal-300' : 'text-white/30'}`}
            style={mode === 'scan' ? { background: 'rgba(20,184,166,0.12)', border: '1px solid rgba(20,184,166,0.25)' } : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            data-testid="scan-mode-btn">
            <Camera className="w-4 h-4" /> Scan Barcode
          </button>
        </div>

        {/* Search Mode */}
        {(mode === 'search') && (
          <>
            <div className="rounded-2xl px-4 py-3 flex items-center gap-2 mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <Search className="w-4 h-4 text-white/20" />
              <input value={query} onChange={e => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/15"
                placeholder="Search medicine name or brand..." data-testid="medicine-search-input" />
              {query && <button onClick={() => setQuery('')}><X className="w-3.5 h-3.5 text-white/20" /></button>}
            </div>
            {searchLoading && <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-white/20" /></div>}
            {results.length > 0 && (
              <div className="space-y-2">
                {results.map((r, i) => (
                  <button key={i} onClick={() => selectMedicine(r)} className="w-full text-left rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98]" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }} data-testid={`search-result-${i}`}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.1)' }}>
                      <Pill className="w-5 h-5 text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white/80 text-sm font-semibold">{r.name}</p>
                      <p className="text-white/25 text-xs">{r.brand} · {r.type} · MRP ₹{r.mrp}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {query.length >= 2 && !searchLoading && results.length === 0 && (
              <div className="text-center py-12">
                <AlertCircle className="w-8 h-8 text-white/8 mx-auto mb-2" />
                <p className="text-white/20 text-sm">No medicines found</p>
                <p className="text-white/10 text-xs mt-1">Try a different search term</p>
              </div>
            )}
            {!query && (
              <div className="text-center py-12">
                <ScanLine className="w-10 h-10 text-white/6 mx-auto mb-3" />
                <p className="text-white/15 text-sm">Search by medicine name</p>
                <p className="text-white/8 text-xs mt-1">or scan barcode for instant lookup</p>
              </div>
            )}
          </>
        )}

        {/* Scan Mode */}
        {mode === 'scan' && (
          <div className="relative">
            <div id="scanner-region" ref={scannerRef} className="rounded-2xl overflow-hidden mb-4" style={{ background: 'rgba(255,255,255,0.02)', minHeight: 300 }} />
            <div className="text-center">
              <p className="text-white/30 text-xs">Point camera at medicine barcode</p>
              <button onClick={() => { stopScan(); setMode('search'); }} className="mt-3 text-teal-400 text-xs font-medium">Switch to Search</button>
            </div>
          </div>
        )}

        {/* Result Mode */}
        {mode === 'result' && medicine && (
          <div style={{ animation: 'fadeUp 0.4s ease-out' }}>
            <div className="rounded-3xl overflow-hidden mb-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {/* Medicine Header */}
              <div className="p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.1), rgba(234,179,8,0.05))' }}>
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-orange-500/10 -mr-8 -mt-8 blur-2xl" />
                <div className="flex items-center gap-4 relative">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.15)' }}>
                    <Pill className="w-8 h-8 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-xl font-black text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>{medicine.name}</p>
                    <p className="text-white/40 text-sm">{medicine.brand} · {medicine.type}</p>
                  </div>
                </div>
              </div>
              {/* Details Grid */}
              <div className="p-5 space-y-4">
                {[
                  { label: 'MRP', value: `₹${medicine.mrp}`, color: '#22c55e' },
                  { label: 'Uses', value: medicine.uses, color: '#3b82f6' },
                  { label: 'Dosage', value: medicine.dosage, color: '#a855f7' },
                  { label: 'Type', value: medicine.type, color: '#f59e0b' },
                ].map((d, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: d.color }} />
                    <div>
                      <p className="text-white/25 text-[10px] uppercase tracking-wide">{d.label}</p>
                      <p className="text-white/70 text-sm">{d.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setMedicine(null); setMode('search'); }} className="flex-1 py-3 rounded-2xl text-white/40 text-xs font-medium" style={{ background: 'rgba(255,255,255,0.04)' }}>
                Search Another
              </button>
              <button onClick={() => navigate('/pharmacy')} className="flex-1 py-3 rounded-2xl text-white text-xs font-bold" style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }} data-testid="order-medicine-btn">
                Order from Pharmacy
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
};

export default MedicineScanner;

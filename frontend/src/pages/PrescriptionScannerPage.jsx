import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Upload, Loader2, CheckCircle2, Plus, ShoppingCart, X, FileText, Pill } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import ServiceHeader from '@/components/ServiceHeader';
import BottomNav from '@/components/BottomNav';

const API = process.env.REACT_APP_BACKEND_URL;

const PrescriptionScannerPage = () => {
  const navigate = useNavigate();
  const { addToPharmacyCart } = useCart();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [selectedMeds, setSelectedMeds] = useState(new Set());

  const handleFileSelect = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (selected.size > 10 * 1024 * 1024) { toast.error('Max 10MB allowed'); return; }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setResults(null);
    setSelectedMeds(new Set());
  };

  const handleScan = async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API}/api/prescription/extract`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success && data.medicines?.length > 0) {
        setResults(data);
        setSelectedMeds(new Set(data.medicines.map((_, i) => i)));
        toast.success(`Found ${data.medicines.length} medicine(s)`);
      } else {
        setResults(data);
        toast.info(data.message || 'No medicines detected. Try a clearer image.');
      }
    } catch (err) {
      toast.error('Failed to scan prescription');
    } finally {
      setProcessing(false);
    }
  };

  const toggleMed = (idx) => {
    setSelectedMeds(prev => {
      const s = new Set(prev);
      s.has(idx) ? s.delete(idx) : s.add(idx);
      return s;
    });
  };

  const addToCart = () => {
    if (!results?.medicines) return;
    let added = 0;
    results.medicines.forEach((med, idx) => {
      if (selectedMeds.has(idx)) {
        addToPharmacyCart({
          id: `rx-${Date.now()}-${idx}`,
          name: med.name,
          price: 0,
          quantity: med.quantity || 1,
          category: 'Prescription',
          prescription_required: true,
        });
        added++;
      }
    });
    if (added > 0) {
      toast.success(`${added} medicine(s) added to cart`);
      navigate('/pharmacy');
    }
  };

  const reset = () => { setFile(null); setPreview(null); setResults(null); setSelectedMeds(new Set()); };

  return (
    <div className="min-h-screen bg-[#0a0b14]">
      <ServiceHeader />
      <main className="max-w-lg mx-auto px-4 py-6 pb-28">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center bg-white/5" data-testid="scanner-back">
            <ArrowLeft className="w-5 h-5 text-white/70" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Prescription Scanner</h1>
            <p className="text-xs text-white/40">AI-powered medicine detection</p>
          </div>
        </div>

        {!preview ? (
          /* Upload Area */
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-purple-500/30 rounded-2xl p-10 text-center cursor-pointer hover:border-purple-500/50 transition-all active:scale-[0.98]"
              style={{ background: 'rgba(168,85,247,0.05)' }}
              data-testid="upload-area"
            >
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-purple-400" />
              </div>
              <p className="text-white font-semibold mb-1">Upload Prescription</p>
              <p className="text-xs text-white/40">JPG, PNG up to 10MB</p>
            </div>

            <button
              onClick={() => cameraInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-300 font-semibold active:scale-[0.98] transition-all"
              data-testid="camera-btn"
            >
              <Camera className="w-5 h-5" /> Take Photo
            </button>

            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

            {/* How it works */}
            <div className="mt-8 space-y-3">
              <h3 className="text-sm font-bold text-white/60">How it works</h3>
              {[
                { step: '1', text: 'Upload or photograph your prescription' },
                { step: '2', text: 'AI reads & extracts medicine names' },
                { step: '3', text: 'Review & add medicines to cart' },
              ].map(s => (
                <div key={s.step} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-purple-500/15 flex items-center justify-center text-xs font-bold text-purple-400">{s.step}</div>
                  <p className="text-sm text-white/50">{s.text}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Preview & Results */
          <div className="space-y-4">
            {/* Image Preview */}
            <div className="relative rounded-2xl overflow-hidden">
              <img src={preview} alt="Prescription" className="w-full max-h-64 object-contain bg-white/5 rounded-2xl" />
              <button onClick={reset} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center" data-testid="clear-preview">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {!results && !processing && (
              <Button onClick={handleScan} className="w-full h-12 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl" data-testid="scan-btn">
                <FileText className="w-5 h-5 mr-2" /> Scan Prescription
              </Button>
            )}

            {processing && (
              <div className="text-center py-8 relative" data-testid="scan-wheel">
                {/* Scan Rx Wheel Animation */}
                <div className="relative w-32 h-32 mx-auto mb-5">
                  {/* Outer ring */}
                  <div className="absolute inset-0 rounded-full border-4 border-purple-500/10" />
                  {/* Spinning ring */}
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 border-r-purple-400 animate-spin" style={{ animationDuration: '1.2s' }} />
                  {/* Inner ring */}
                  <div className="absolute inset-3 rounded-full border-2 border-purple-500/5" />
                  <div className="absolute inset-3 rounded-full border-2 border-transparent border-b-purple-400/50 border-l-purple-300/30 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
                  {/* Center icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-2xl bg-purple-500/15 flex items-center justify-center backdrop-blur-sm">
                      <FileText className="w-8 h-8 text-purple-400" style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
                    </div>
                  </div>
                  {/* Scanning dots */}
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className="absolute w-2 h-2 rounded-full bg-purple-400" style={{
                      top: `${50 + 45 * Math.sin(Math.PI * 2 * i / 4)}%`, left: `${50 + 45 * Math.cos(Math.PI * 2 * i / 4)}%`,
                      transform: 'translate(-50%, -50%)', animation: `pulse 1.5s ease-in-out infinite`, animationDelay: `${i * 0.3}s`,
                    }} />
                  ))}
                </div>
                <p className="text-sm text-white/60 font-medium">Scanning Prescription</p>
                <p className="text-xs text-white/30 mt-1">AI is reading your prescription...</p>
                {/* Progress steps */}
                <div className="mt-5 flex items-center justify-center gap-2">
                  {['Reading', 'Detecting', 'Matching'].map((step, i) => (
                    <div key={step} className="flex items-center gap-1.5 text-[10px]" style={{ animation: 'fadeIn 0.5s ease-in forwards', animationDelay: `${i * 1.5}s`, opacity: 0 }}>
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" style={{ animationDelay: `${i * 0.5}s` }} />
                      <span className="text-purple-300/60">{step}</span>
                    </div>
                  ))}
                </div>
                <style>{`@keyframes fadeIn { to { opacity: 1; } }`}</style>
              </div>
            )}

            {results && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">
                    {results.medicines?.length > 0 ? `${results.medicines.length} Medicine(s) Found` : 'No Medicines Detected'}
                  </h3>
                  {results.confidence && results.confidence !== 'error' && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${results.confidence === 'high' ? 'bg-green-500/15 text-green-400' : results.confidence === 'mock' ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400'}`}>
                      {results.confidence === 'mock' ? 'Demo' : results.confidence} confidence
                    </span>
                  )}
                </div>

                {results.medicines?.map((med, idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleMed(idx)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl text-left transition-all ${selectedMeds.has(idx) ? 'bg-purple-500/15 border border-purple-500/30' : 'bg-white/5 border border-white/5'}`}
                    data-testid={`medicine-${idx}`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${selectedMeds.has(idx) ? 'bg-purple-500' : 'bg-white/10'}`}>
                      {selectedMeds.has(idx) && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{med.name}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {med.dosage && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/50">{med.dosage}</span>}
                        {med.frequency && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/50">{med.frequency}</span>}
                        {med.duration && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/50">{med.duration}</span>}
                      </div>
                    </div>
                    <Pill className="w-4 h-4 text-white/20 flex-shrink-0" />
                  </button>
                ))}

                {results.medicines?.length > 0 && (
                  <div className="flex gap-2 pt-2">
                    <Button onClick={addToCart} disabled={selectedMeds.size === 0} className="flex-1 h-11 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-xl disabled:opacity-40" data-testid="add-to-cart-btn">
                      <ShoppingCart className="w-4 h-4 mr-2" /> Add {selectedMeds.size} to Cart
                    </Button>
                    <Button onClick={reset} variant="outline" className="h-11 px-4 rounded-xl border-white/10 text-white/60 bg-transparent hover:bg-white/5" data-testid="scan-another-btn">
                      Scan Another
                    </Button>
                  </div>
                )}

                {results.medicines?.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-sm text-white/40 mb-3">{results.raw_text || 'Could not read medicines from this image'}</p>
                    <Button onClick={reset} variant="outline" className="rounded-xl border-white/10 text-white/60 bg-transparent hover:bg-white/5" data-testid="try-again-btn">
                      Try Another Image
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default PrescriptionScannerPage;

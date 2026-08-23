import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Camera, Upload, X, Pill, Loader2, CheckCircle2,
  AlertCircle, Plus, FileText, Image as ImageIcon
} from 'lucide-react';
import { useCart } from '@/context/CartContext';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

/**
 * Prescription OCR Component
 * Upload prescription image and auto-detect medicines
 */
export const PrescriptionOCR = ({ isOpen, onClose, initialFile = null }) => {
  const { addToPharmacyCart } = useCart();
  const fileInputRef = useRef(null);
  
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [selectedMedicines, setSelectedMedicines] = useState([]);

  // Handle initial file from direct upload
  React.useEffect(() => {
    if (initialFile && isOpen) {
      setFile(initialFile);
      setPreview(URL.createObjectURL(initialFile));
      setResults(null);
      setSelectedMedicines([]);
    }
  }, [initialFile, isOpen]);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setResults(null);
    setSelectedMedicines([]);
  };

  const handleProcess = async () => {
    if (!file) {
      toast.error('Please select a prescription image');
      return;
    }

    setProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API}/prescription/ocr`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setResults(response.data);
      
      if (response.data.success && response.data.matched_medicines?.length > 0) {
        toast.success(`Found ${response.data.matched_medicines.length} medicines!`);
      } else if (!response.data.success) {
        toast.warning(response.data.message || 'Could not process prescription');
      } else {
        toast.info('No medicines detected. Try a clearer image.');
      }
    } catch (error) {
      console.error('OCR error:', error);
      toast.error('Failed to process prescription. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const toggleMedicine = (medicine) => {
    setSelectedMedicines(prev => {
      const exists = prev.find(m => m.id === medicine.id);
      if (exists) {
        return prev.filter(m => m.id !== medicine.id);
      }
      return [...prev, medicine];
    });
  };

  const handleAddToCart = () => {
    if (selectedMedicines.length === 0) {
      toast.error('Please select at least one medicine');
      return;
    }

    selectedMedicines.forEach(medicine => {
      addToPharmacyCart({
        id: medicine.id,
        name: medicine.name,
        price: medicine.price || 0,
        quantity: 1,
        manufacturer: medicine.manufacturer,
        form: medicine.form
      });
    });

    toast.success(`${selectedMedicines.length} medicines added to cart!`);
    onClose();
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setResults(null);
    setSelectedMedicines([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg bg-[#0f0f0f] rounded-t-3xl max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="sticky top-0 bg-[#0f0f0f] border-b border-white/10 p-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Camera className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Scan Prescription</h2>
                <p className="text-xs text-zinc-500">Auto-detect medicines with OCR</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4 space-y-4" style={{ maxHeight: 'calc(90vh - 80px)' }}>
          {/* Upload Section */}
          {!preview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-blue-500/30 rounded-2xl p-8 text-center cursor-pointer hover:bg-blue-500/5 transition-colors"
            >
              <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-blue-400" />
              </div>
              <p className="text-white font-medium mb-1">Upload Prescription</p>
              <p className="text-sm text-zinc-400">
                Take a photo or select from gallery
              </p>
              <p className="text-xs text-zinc-500 mt-2">
                Supports JPG, PNG (max 10MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            <>
              {/* Preview */}
              <div className="relative">
                <img
                  src={preview}
                  alt="Prescription preview"
                  className="w-full rounded-2xl border border-zinc-700"
                />
                <button
                  onClick={handleReset}
                  className="absolute top-2 right-2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Process Button */}
              {!results && (
                <Button
                  onClick={handleProcess}
                  disabled={processing}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-6"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Scanning prescription...
                    </>
                  ) : (
                    <>
                      <Camera className="w-5 h-5 mr-2" />
                      Scan for Medicines
                    </>
                  )}
                </Button>
              )}

              {/* Results */}
              {results && (
                <div className="space-y-4">
                  {/* Status */}
                  <div className={`flex items-center gap-3 p-3 rounded-xl ${
                    results.matched_medicines?.length > 0
                      ? 'bg-green-500/10 border border-green-500/30'
                      : 'bg-amber-500/10 border border-amber-500/30'
                  }`}>
                    {results.matched_medicines?.length > 0 ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                        <span className="text-sm text-green-300">
                          Found {results.matched_medicines.length} medicines
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5 text-amber-400" />
                        <span className="text-sm text-amber-300">
                          {results.message || 'No medicines detected'}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Extracted Text (Debug) */}
                  {results.extracted_text && (
                    <details className="text-xs">
                      <summary className="text-zinc-500 cursor-pointer hover:text-zinc-400">
                        View extracted text
                      </summary>
                      <pre className="mt-2 p-3 bg-zinc-900 rounded-lg text-zinc-400 overflow-x-auto whitespace-pre-wrap">
                        {results.extracted_text}
                      </pre>
                    </details>
                  )}

                  {/* Medicine List */}
                  {results.matched_medicines?.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-white">Select medicines to add:</p>
                        <button
                          onClick={() => setSelectedMedicines(results.matched_medicines)}
                          className="text-xs text-blue-400 hover:text-blue-300"
                        >
                          Select all
                        </button>
                      </div>
                      
                      {results.matched_medicines.map((medicine) => (
                        <MedicineCard
                          key={medicine.id}
                          medicine={medicine}
                          selected={selectedMedicines.some(m => m.id === medicine.id)}
                          onToggle={() => toggleMedicine(medicine)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Add to Cart */}
                  {results.matched_medicines?.length > 0 && (
                    <Button
                      onClick={handleAddToCart}
                      disabled={selectedMedicines.length === 0}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Add {selectedMedicines.length} to Cart
                    </Button>
                  )}

                  {/* Try Again */}
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="w-full"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Scan Another Prescription
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Tips */}
          <div className="bg-zinc-900/50 rounded-xl p-4">
            <p className="text-xs font-medium text-zinc-400 mb-2">Tips for best results:</p>
            <ul className="text-xs text-zinc-500 space-y-1">
              <li>• Use good lighting and avoid shadows</li>
              <li>• Keep the prescription flat and in focus</li>
              <li>• Capture the full prescription in frame</li>
              <li>• Handwritten prescriptions may have lower accuracy</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Medicine Card (for OCR results)
 */
const MedicineCard = ({ medicine, selected, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
        selected
          ? 'border-orange-500 bg-orange-500/10'
          : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
        selected ? 'bg-orange-500/20' : 'bg-zinc-700'
      }`}>
        <Pill className={`w-5 h-5 ${selected ? 'text-orange-400' : 'text-zinc-400'}`} />
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className={`font-medium truncate ${selected ? 'text-white' : 'text-zinc-300'}`}>
          {medicine.name}
        </p>
        <p className="text-xs text-zinc-500 truncate">
          {medicine.manufacturer} • {medicine.form}
        </p>
      </div>
      <div className="text-right">
        <p className={`font-bold ${selected ? 'text-orange-400' : 'text-zinc-400'}`}>
          ₹{medicine.price || '—'}
        </p>
        {selected && (
          <CheckCircle2 className="w-5 h-5 text-orange-400 ml-auto mt-1" />
        )}
      </div>
    </button>
  );
};

/**
 * Quick OCR Button (for Pharmacy page)
 * Opens file picker directly for immediate prescription upload
 */
export const PrescriptionOCRButton = ({ className = '' }) => {
  const [showModal, setShowModal] = useState(false);
  const fileInputRef = useRef(null);

  const handleDirectUpload = () => {
    // Directly trigger file input for camera/gallery selection
    fileInputRef.current?.click();
  };

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Open modal with the selected file
      setShowModal(true);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelected}
        className="hidden"
        data-testid="prescription-file-input"
      />
      <button
        onClick={handleDirectUpload}
        className={`flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl font-medium hover:bg-blue-500/30 transition-colors ${className}`}
        data-testid="prescription-ocr-btn"
      >
        <Camera className="w-4 h-4" />
        Scan Rx
      </button>

      <PrescriptionOCR
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          // Reset file input
          if (fileInputRef.current) fileInputRef.current.value = '';
        }}
        initialFile={fileInputRef.current?.files?.[0]}
      />
    </>
  );
};

export default PrescriptionOCR;

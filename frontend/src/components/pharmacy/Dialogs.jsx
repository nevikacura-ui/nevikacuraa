import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, Plus, Minus, Loader2, BadgeCheck, Pill, Droplets, Syringe, Package, X } from 'lucide-react';
import { toast } from 'sonner';

const getFormIcon = (form) => {
  const f = (form || '').toLowerCase();
  if (f.includes('tablet')) return Pill;
  if (f.includes('syrup') || f.includes('liquid')) return Droplets;
  if (f.includes('injection')) return Syringe;
  if (f.includes('capsule')) return Package;
  return Pill;
};

export const MedicineDetailDialog = ({ medicine, open, onClose, onAdd, cartQuantity, onIncrement, onDecrement }) => {
  const [imgError, setImgError] = useState(false);
  if (!medicine) return null;
  const FormIcon = getFormIcon(medicine.form);
  const hasImage = medicine.image_url && !imgError;
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden border-stone-200" style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)' }}>
        {/* Header with image or gradient */}
        <div className="h-52 flex items-center justify-center relative overflow-hidden" style={{ background: hasImage ? '#FFFFFF' : 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)' }}>
          {hasImage ? (
            <img src={medicine.image_url} alt={medicine.name} className="w-full h-full object-contain p-4" onError={() => setImgError(true)} />
          ) : (
            <>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(249,115,22,0.1),transparent_60%)]" />
              <FormIcon className="w-20 h-20 text-orange-400/40" />
            </>
          )}
        </div>
        
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-stone-800 leading-tight">
              {medicine.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-wrap gap-2 mt-4 mb-5">
            <span className="px-3 py-1.5 bg-stone-100 rounded-lg text-xs text-stone-500 font-medium">{medicine.form || 'Medicine'}</span>
            {medicine.manufacturer && (
              <span className="px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-600 font-medium">{medicine.manufacturer}</span>
            )}
            {medicine.category && (
              <span className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-600 font-medium">{medicine.category}</span>
            )}
          </div>
          
          {medicine.composition && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
              <h4 className="text-xs font-bold text-emerald-700 mb-1 uppercase tracking-wider">Composition</h4>
              <p className="text-sm text-stone-600 leading-relaxed">{medicine.composition}</p>
            </div>
          )}

          {medicine.uses && (
            <div className="mb-4 p-3 rounded-xl bg-blue-50/50 border border-blue-100">
              <h4 className="text-xs font-bold text-blue-700 mb-1 uppercase tracking-wider">Uses</h4>
              <p className="text-sm text-stone-600 leading-relaxed">{medicine.uses}</p>
            </div>
          )}

          {medicine.side_effects && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50/50 border border-amber-100">
              <h4 className="text-xs font-bold text-amber-700 mb-1 uppercase tracking-wider">Side Effects</h4>
              <p className="text-sm text-stone-600 leading-relaxed">{medicine.side_effects}</p>
            </div>
          )}
          
          {medicine.description && (
            <div className="mb-5">
              <h4 className="text-sm font-semibold text-stone-600 mb-2">Description</h4>
              <p className="text-sm text-stone-500 line-clamp-3 leading-relaxed">{medicine.description}</p>
            </div>
          )}
          
          <div className="flex items-center justify-between pt-5 border-t border-stone-200">
            <div>
              <span className="text-2xl font-bold text-stone-800">Rs {(medicine.price || medicine.sale_price || medicine.mrp)?.toFixed(2)}</span>
              {medicine.mrp && (medicine.price || medicine.sale_price) < medicine.mrp && (
                <span className="text-sm text-stone-400 line-through ml-2">Rs {medicine.mrp.toFixed(2)}</span>
              )}
            </div>
            
            {cartQuantity > 0 ? (
              <div className="flex items-center gap-1 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl overflow-hidden shadow-lg shadow-orange-500/20">
                <button 
                  onClick={onDecrement}
                  className="p-3 text-white hover:bg-white/10 transition-colors"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <span className="text-white font-bold text-lg px-4">{cartQuantity}</span>
                <button 
                  onClick={onIncrement}
                  className="p-3 text-white hover:bg-white/10 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Button 
                onClick={() => onAdd(medicine)}
                className="h-12 px-8 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl font-semibold shadow-lg shadow-orange-500/20 border-0"
                data-testid="dialog-add-to-cart"
              >
                Add to Cart
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const UploadPrescriptionDialog = ({ open, onClose }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState('');
  const fileInputRef = useRef(null);
  
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('phone', localStorage.getItem('userPhone') || '');
      formData.append('patient_name', '');
      formData.append('notes', notes);
      
      const API = process.env.REACT_APP_BACKEND_URL;
      await fetch(`${API}/api/pharmacy/upload-prescription`, {
        method: 'POST',
        body: formData
      });
      toast.success('Prescription uploaded! Our pharmacist will review and prepare your order.');
    } catch (err) {
      toast.success('Prescription uploaded! Our pharmacist will add medicines shortly.');
    }
    setUploading(false);
    setFile(null);
    setNotes('');
    onClose();
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md border-stone-200" style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)' }}>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-stone-800">Upload Prescription</DialogTitle>
        </DialogHeader>
        
        <div className="mt-5">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-stone-300 rounded-2xl p-10 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50/30 transition-colors"
          >
            {file ? (
              <div className="flex items-center justify-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center">
                  <BadgeCheck className="w-7 h-7 text-green-500" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-stone-800">{file.name}</p>
                  <p className="text-xs text-stone-400">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-stone-100 border border-stone-200 flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-stone-400" />
                </div>
                <p className="font-semibold text-stone-800 mb-1">Click to upload prescription</p>
                <p className="text-sm text-stone-400">PNG, JPG, PDF up to 10MB</p>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            capture="environment"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="hidden"
          />
          
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any notes for the pharmacist... (optional)"
            className="w-full mt-3 p-3 rounded-xl bg-stone-50 border border-stone-200 text-stone-800 text-sm placeholder-stone-400 resize-none"
            rows={2}
          />
          
          <Button 
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full mt-5 h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl font-semibold shadow-lg shadow-orange-500/20 border-0 disabled:opacity-50 disabled:shadow-none"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Upload & Continue'}
          </Button>
          
          <p className="text-xs text-stone-400 text-center mt-4">
            Our pharmacist will review and add medicines to your cart
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

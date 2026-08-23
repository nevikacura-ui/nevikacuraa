import React, { useState, useRef } from 'react';
import { Upload, Camera, X, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PrescriptionUpload = ({ phone, patientName, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      toast.error('File too large (max 10MB)');
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('phone', phone || '');
      formData.append('patient_name', patientName || '');
      formData.append('notes', notes);
      
      const res = await axios.post(`${API}/pharmacy/upload-prescription`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setSuccess(true);
      toast.success('Prescription uploaded! Our pharmacist will review it.');
      if (onSuccess) onSuccess(res.data);
      setTimeout(() => onClose?.(), 2000);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-8" data-testid="prescription-upload-success">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <h3 className="text-lg font-bold text-white mb-1">Prescription Uploaded!</h3>
        <p className="text-gray-400 text-sm">Our pharmacist will review and prepare your order.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="prescription-upload">
      <div className="text-center">
        <h3 className="text-lg font-bold text-white mb-1">Upload Prescription</h3>
        <p className="text-gray-400 text-sm">Take a photo or upload your prescription</p>
      </div>

      {!preview ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-white/20 rounded-2xl p-8 text-center cursor-pointer hover:border-teal-500/40 transition-all"
        >
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-teal-500/20 flex items-center justify-center">
            <Camera className="w-7 h-7 text-teal-400" />
          </div>
          <p className="text-white font-medium text-sm">Tap to take photo or choose file</p>
          <p className="text-gray-500 text-xs mt-1">JPG, PNG up to 10MB</p>
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden">
          <img src={preview} alt="Prescription" className="w-full max-h-64 object-contain bg-black/50 rounded-2xl" />
          <button 
            onClick={() => { setFile(null); setPreview(null); }}
            className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Any notes for the pharmacist... (optional)"
        className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-gray-500 resize-none"
        rows={2}
        data-testid="prescription-notes"
      />

      <Button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold py-3 rounded-xl disabled:opacity-50"
        data-testid="upload-prescription-btn"
      >
        {uploading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
        ) : (
          <><Upload className="w-4 h-4 mr-2" /> Upload Prescription</>
        )}
      </Button>
    </div>
  );
};

export default PrescriptionUpload;

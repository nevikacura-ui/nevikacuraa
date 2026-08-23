import React from 'react';
import { useOrangeStaff } from './OrangeStaffContext';
import { Input } from '@/components/ui/input';
import { X, Camera, Upload, Eye } from 'lucide-react';

const OrangeImageUploadModal = () => {
  const s = useOrangeStaff();
  if (!s.showImageUpload) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.15)', backdropFilter: 'blur(4px)' }} onClick={() => s.setShowImageUpload(false)}>
      <div className="w-full max-w-sm rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(249,115,22,0.15)' }} onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <h3 className="font-bold text-sm text-gray-900">Upload Image</h3>
          <button onClick={() => s.setShowImageUpload(false)}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <button onClick={() => s.cameraInputRef.current?.click()}
            className="w-full p-4 rounded-xl border-2 border-dashed border-emerald-200 hover:border-emerald-400 bg-emerald-50 hover:bg-emerald-100 transition-all flex items-center justify-center gap-3">
            <Camera className="w-6 h-6 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-700">Take Photo</span>
          </button>
          <button onClick={() => s.fileInputRef.current?.click()}
            className="w-full p-4 rounded-xl border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50 hover:bg-blue-100 transition-all flex items-center justify-center gap-3">
            <Upload className="w-6 h-6 text-blue-600" />
            <span className="text-sm font-semibold text-blue-700">Choose from Gallery</span>
          </button>
          <div className="relative">
            <Input placeholder="Or paste image URL..." className="h-10 rounded-xl text-xs bg-gray-50 border-gray-200 pr-16"
              onKeyDown={e => { if (e.key === 'Enter' && e.target.value) s.handleUrlUpload(e.target.value); }} />
            <Eye className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrangeImageUploadModal;

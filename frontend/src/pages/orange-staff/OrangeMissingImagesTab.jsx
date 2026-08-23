import React from 'react';
import { useOrangeStaff } from './OrangeStaffContext';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Camera, CheckCircle2, Loader2, Upload } from 'lucide-react';

const OrangeMissingImagesTab = () => {
  const s = useOrangeStaff();

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-bold text-amber-800">Medicines Without Images</p>
          <p className="text-xs text-amber-600 mt-0.5">These products need images uploaded. Tap the camera icon to add an image.</p>
        </div>
      </div>
      {s.loadingMissing ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>
      ) : s.missingImageMeds.length === 0 ? (
        <div className="text-center py-16 text-green-500"><CheckCircle2 className="w-10 h-10 mx-auto mb-3" /><p className="text-sm font-medium">All medicines have images!</p></div>
      ) : (
        <div className="space-y-2">
          {s.missingImageMeds.map(med => (
            <div key={med.id} className="rounded-2xl p-3 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(12px)', border: '1px solid rgba(251,191,36,0.25)', boxShadow: '0 2px 8px rgba(251,191,36,0.08)' }} data-testid={`missing-img-${med.id}`}>
              <button onClick={() => s.openImageUpload(med.id, med.name)}
                className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center bg-amber-50 border-2 border-dashed border-amber-300 hover:border-orange-400 hover:bg-orange-50 transition-all"
                data-testid={`upload-img-${med.id}`}>
                <Camera className="w-5 h-5 text-amber-400" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{med.name}</p>
                <p className="text-[10px] text-gray-500">{med.category} · {med.manufacturer || 'Unknown'} · MRP {med.mrp}</p>
              </div>
              <Button onClick={() => s.openImageUpload(med.id, med.name)} className="h-8 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs font-semibold border border-amber-300">
                <Upload className="w-3.5 h-3.5 mr-1" /> Upload
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrangeMissingImagesTab;

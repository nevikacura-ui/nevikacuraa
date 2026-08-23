import React from 'react';
import { Upload, Sparkles } from 'lucide-react';

export const QuickActions = ({ onUploadPrescription }) => (
  <div className="max-w-7xl mx-auto px-4 py-4">
    <div className="grid grid-cols-2 gap-3">
      <button 
        onClick={onUploadPrescription}
        className="bg-white rounded-xl p-4 shadow-sm border border-orange-200 flex items-center gap-3 hover:shadow-md hover:border-orange-300 transition-all"
        data-testid="upload-prescription-btn"
      >
        <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
          <Upload className="w-5 h-5 text-white" />
        </div>
        <div className="text-left">
          <p className="font-semibold text-gray-900 text-sm">Upload Prescription</p>
          <p className="text-xs text-gray-500">We'll add medicines</p>
        </div>
      </button>
      
      <div className="bg-orange-500 rounded-xl p-4 shadow-sm text-white">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4" />
          <span className="font-semibold text-sm">Today's Offers</span>
        </div>
        <p className="text-xs opacity-90">Up to 25% OFF on first order</p>
        <p className="text-[10px] mt-1 opacity-75">Use code: ORANGE25</p>
      </div>
    </div>
  </div>
);

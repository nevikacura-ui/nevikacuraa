import React from 'react';
import { useProfile } from './ProfileContext';
import { Button } from '@/components/ui/button';
import { FileText, ChevronRight } from 'lucide-react';

const ProfileRecordsTab = () => {
  const { healthRecords, prescriptionInputRef } = useProfile();

  return (
    <div className="pb-24">
      <div className="bg-[#1A1A1A] rounded-2xl mx-4 mt-4 overflow-hidden border border-white/10">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <p className="font-semibold text-white">Health Records</p>
          <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10" onClick={() => prescriptionInputRef.current?.click()}>
            Upload
          </Button>
        </div>
        {healthRecords.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400">No health records yet</p>
            <p className="text-xs text-gray-500 mt-1">Upload prescriptions, reports & more</p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {healthRecords.map((record, idx) => (
              <div key={idx} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-blue-400" />
                  <div>
                    <p className="font-medium text-white">{record.title}</p>
                    <p className="text-xs text-gray-400">{record.record_type} &bull; {new Date(record.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileRecordsTab;

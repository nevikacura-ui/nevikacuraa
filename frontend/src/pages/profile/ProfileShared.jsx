import React from 'react';
import { ChevronRight } from 'lucide-react';
import { lightTap } from '@/utils/haptics';

export const MenuItem = ({ icon: Icon, label, sublabel, onClick, rightElement, showArrow = true, color = "text-gray-400" }) => (
  <button 
    onClick={() => { lightTap(); onClick?.(); }}
    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/5 transition-colors"
  >
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-left">
        <p className="font-medium text-white">{label}</p>
        {sublabel && <p className="text-xs text-gray-400">{sublabel}</p>}
      </div>
    </div>
    {rightElement ? rightElement : (showArrow && <ChevronRight className="w-5 h-5 text-gray-500" />)}
  </button>
);

export const SectionHeader = ({ title }) => (
  <div className="px-4 py-2 bg-[#050510]">
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
  </div>
);

import React from 'react';
import { toast } from 'sonner';
import { MenuItem } from './ProfileShared';
import { Fingerprint, Smartphone, Monitor } from 'lucide-react';

const ProfileSecurityTab = () => {
  return (
    <div className="pb-24">
      <div className="bg-[#1A1A1A] rounded-2xl mx-4 mt-4 overflow-hidden border border-white/10">
        <div className="px-4 py-3 border-b border-white/10">
          <p className="font-semibold text-white">Security Settings</p>
        </div>
        
        <MenuItem icon={Fingerprint} label="Biometric authentication" sublabel="Use Face ID or fingerprint to login" onClick={() => toast.info('Biometric setup requires a supported device')} color="text-violet-400" />
        <div className="h-px bg-white/10" />
        <MenuItem icon={Smartphone} label="Two-factor authentication" sublabel="Add extra security to your account" onClick={() => toast.info('2FA requires WhatsApp verification')} color="text-blue-400" />
        <div className="h-px bg-white/10" />
        <MenuItem icon={Monitor} label="Manage devices" sublabel="View and manage trusted devices" onClick={() => toast.info('You have 1 trusted device')} color="text-gray-400" />
      </div>
    </div>
  );
};

export default ProfileSecurityTab;

import React from 'react';
import { useProfile } from './ProfileContext';
import { Switch } from '@/components/ui/switch';
import NotificationPanel from '@/components/NotificationPanel';
import AdminNotificationSender from '@/components/AdminNotificationSender';
import { selectionTap } from '@/utils/haptics';

const ProfileNotificationsTab = () => {
  const { user, ramadanGreetings, handleRamadanToggle, showRamadanToggle } = useProfile();
  const userRole = (user?.role || '').toLowerCase();
  const isAdmin = userRole.includes('admin') || userRole.includes('doctor') || userRole.includes('dr_');

  return (
    <div className="pb-24">
      {/* Admin notification sender - only for admin/doctor */}
      {isAdmin && (
        <div className="mx-4 mt-4">
          <AdminNotificationSender />
        </div>
      )}

      {/* Real notification list */}
      <NotificationPanel />

      {/* Ramadan Greetings Toggle */}
      {showRamadanToggle && (
        <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl mx-4 mt-4 overflow-hidden border border-emerald-500/30">
          <div className="px-4 py-3 border-b border-emerald-500/30 bg-emerald-500/10">
            <div className="flex items-center gap-2">
              <span className="text-lg">&#127769;</span>
              <p className="font-semibold text-emerald-400">Ramadan Greetings</p>
            </div>
          </div>
          <div className="px-4 py-4">
            <div className="flex items-center justify-between" data-testid="ramadan-toggle-container">
              <div>
                <p className="font-medium text-white">Receive Iftar & Sehri messages</p>
                <p className="text-xs text-gray-400">Get blessed greetings during Ramadan via WhatsApp</p>
              </div>
              <Switch 
                checked={ramadanGreetings} 
                onCheckedChange={handleRamadanToggle}
                data-testid="ramadan-toggle"
              />
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#1A1A1A] rounded-2xl mx-4 mt-4 overflow-hidden border border-white/10">
        <div className="px-4 py-3 border-b border-white/10">
          <p className="font-semibold text-white">Notification Preferences</p>
        </div>
        <div className="px-4 py-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div><p className="font-medium text-white">Push notifications</p><p className="text-xs text-gray-400">Get alerts on your device</p></div>
              <Switch defaultChecked onCheckedChange={() => selectionTap()} />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="font-medium text-white">Order updates</p><p className="text-xs text-gray-400">Track your orders in real-time</p></div>
              <Switch defaultChecked onCheckedChange={() => selectionTap()} />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="font-medium text-white">Promotional offers</p><p className="text-xs text-gray-400">Get discounts and deals</p></div>
              <Switch onCheckedChange={() => selectionTap()} />
            </div>
            <div className="flex items-center justify-between">
              <div><p className="font-medium text-white">Appointment reminders</p><p className="text-xs text-gray-400">Never miss an appointment</p></div>
              <Switch defaultChecked onCheckedChange={() => selectionTap()} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileNotificationsTab;

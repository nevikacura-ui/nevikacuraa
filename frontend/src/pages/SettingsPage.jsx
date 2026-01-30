import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, User, Bell, Globe, Heart, Users, Shield,
  ChevronRight, LogOut, HelpCircle, FileText, Star,
  CreditCard, BellRing, Calendar, Download, ExternalLink, Check
} from 'lucide-react';
import NotificationSettings from '@/components/NotificationSettings';
import LanguageSelector from '@/components/LanguageSelector';
import FamilyMembers from '@/components/FamilyMembers';
import PaymentManagement from '@/components/PaymentManagement';
import PushNotificationManager from '@/components/PushNotificationManager';
import SmartScheduling from '@/components/SmartScheduling';
import { SyncAllAppointmentsButton } from '@/components/AddToCalendar';
import { useLanguage } from '@/context/LanguageContext';
import BottomNav from '@/components/BottomNav';

// Calendar Sync Section Component
const CalendarSyncSection = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white">
          <Calendar className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Calendar Sync
          </h2>
          <p className="text-sm text-slate-500">Never miss an appointment</p>
        </div>
      </div>

      {/* Sync All Button */}
      <Card className="p-5 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-800">Sync All Appointments</h3>
            <p className="text-sm text-slate-500">Download all upcoming appointments as a calendar file</p>
          </div>
        </div>
        <SyncAllAppointmentsButton />
      </Card>

      {/* Supported Calendars */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-700">Supported Calendars</h3>
        
        <Card className="p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white shadow flex items-center justify-center">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="2" fill="#4285F4"/>
                <rect x="5" y="5" width="14" height="14" rx="1" fill="white"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-800">Google Calendar</p>
              <p className="text-xs text-slate-500">Click "Add to Calendar" on any appointment</p>
            </div>
            <Check className="w-5 h-5 text-emerald-500" />
          </div>
        </Card>

        <Card className="p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 shadow flex items-center justify-center text-white">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-800">Apple Calendar</p>
              <p className="text-xs text-slate-500">Download .ics file to add events</p>
            </div>
            <Check className="w-5 h-5 text-emerald-500" />
          </div>
        </Card>

        <Card className="p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 shadow flex items-center justify-center text-white">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-800">Outlook / Microsoft 365</p>
              <p className="text-xs text-slate-500">Import .ics file to your calendar</p>
            </div>
            <Check className="w-5 h-5 text-emerald-500" />
          </div>
        </Card>

        <Card className="p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 shadow flex items-center justify-center text-slate-600">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-800">Other Calendars</p>
              <p className="text-xs text-slate-500">Yahoo, Zoho, and any iCal-compatible app</p>
            </div>
            <Check className="w-5 h-5 text-emerald-500" />
          </div>
        </Card>
      </div>

      {/* How It Works */}
      <Card className="p-5 rounded-2xl bg-slate-50">
        <h3 className="font-semibold text-slate-700 mb-3">How It Works</h3>
        <ol className="space-y-3 text-sm">
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold text-xs">1</span>
            <span className="text-slate-600">Go to "My Appointments" in Patient Portal</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold text-xs">2</span>
            <span className="text-slate-600">Click the calendar icon on any upcoming appointment</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold text-xs">3</span>
            <span className="text-slate-600">Choose Google Calendar or download .ics file</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold text-xs">4</span>
            <span className="text-slate-600">You'll get reminders 24h and 1h before your appointment!</span>
          </li>
        </ol>
      </Card>
    </div>
  );
};

const SettingsPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState(null);

  const menuItems = [
    { id: 'profile', icon: User, label: 'Profile', description: 'View and edit your profile', color: 'bg-blue-100 text-blue-600', onClick: () => navigate('/profile') },
    { id: 'family', icon: Users, label: t('familyMembers'), description: 'Manage family health profiles', color: 'bg-pink-100 text-pink-600', onClick: () => setActiveSection('family') },
    { id: 'notifications', icon: Bell, label: t('notifications'), description: 'Email & SMS preferences', color: 'bg-violet-100 text-violet-600', onClick: () => setActiveSection('notifications') },
    { id: 'push', icon: BellRing, label: 'Push Notifications', description: 'Real-time alerts & reminders', color: 'bg-emerald-100 text-emerald-600', onClick: () => setActiveSection('push') },
    { id: 'calendar', icon: Calendar, label: 'Calendar Sync', description: 'Sync appointments to your calendar', color: 'bg-cyan-100 text-cyan-600', onClick: () => setActiveSection('calendar') },
    { id: 'payments', icon: CreditCard, label: 'Payments & Wallet', description: 'Manage cards and wallet balance', color: 'bg-amber-100 text-amber-600', onClick: () => setActiveSection('payments') },
    { id: 'health', icon: Heart, label: t('myHealth'), description: 'Health dashboard & achievements', color: 'bg-red-100 text-red-600', onClick: () => navigate('/health-dashboard') }
  ];

  const supportItems = [
    {
      id: 'help',
      icon: HelpCircle,
      label: 'Help & Support',
      onClick: () => window.open('tel:9403890429')
    },
    {
      id: 'privacy',
      icon: Shield,
      label: 'Privacy Policy',
      onClick: () => {}
    },
    {
      id: 'terms',
      icon: FileText,
      label: 'Terms of Service',
      onClick: () => {}
    },
    {
      id: 'rate',
      icon: Star,
      label: 'Rate Us',
      onClick: () => {}
    }
  ];

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
      navigate('/');
    }
  };

  // Show section content
  if (activeSection === 'family') {
    return (
      <div className="min-h-screen bg-slate-50 pb-24">
        <div className="sticky top-0 z-40 bg-white border-b">
          <div className="flex items-center gap-3 p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveSection(null)}
              className="rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">{t('familyMembers')}</h1>
          </div>
        </div>
        <div className="p-4">
          <FamilyMembers />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (activeSection === 'notifications') {
    return (
      <div className="min-h-screen bg-slate-50 pb-24">
        <div className="sticky top-0 z-40 bg-white border-b">
          <div className="flex items-center gap-3 p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveSection(null)}
              className="rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">{t('notifications')}</h1>
          </div>
        </div>
        <div className="p-4">
          <NotificationSettings />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (activeSection === 'push') {
    return (
      <div className="min-h-screen bg-slate-50 pb-24">
        <div className="sticky top-0 z-40 bg-white border-b">
          <div className="flex items-center gap-3 p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveSection(null)}
              className="rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">Push Notifications</h1>
          </div>
        </div>
        <div className="p-4">
          <PushNotificationManager />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (activeSection === 'payments') {
    return (
      <div className="min-h-screen bg-slate-50 pb-24">
        <div className="sticky top-0 z-40 bg-white border-b">
          <div className="flex items-center gap-3 p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveSection(null)}
              className="rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">Payments & Wallet</h1>
          </div>
        </div>
        <div className="p-4">
          <PaymentManagement />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (activeSection === 'calendar') {
    return (
      <div className="min-h-screen bg-slate-50 pb-24">
        <div className="sticky top-0 z-40 bg-white border-b">
          <div className="flex items-center gap-3 p-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveSection(null)}
              className="rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">Calendar Sync</h1>
          </div>
        </div>
        <div className="p-4">
          <CalendarSyncSection />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-r from-teal-600 to-cyan-600 text-white">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="rounded-xl text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">{t('settings')}</h1>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* User Card */}
        <Card className="p-4 rounded-2xl" data-testid="settings-user-card">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white text-2xl font-bold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-lg text-slate-800">{user?.name || 'User'}</h2>
              <p className="text-sm text-slate-500">{user?.phone || user?.email}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/profile')}
              className="rounded-xl"
            >
              Edit
            </Button>
          </div>
        </Card>

        {/* Main Settings */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-500 px-1">Account Settings</h3>
          <Card className="rounded-2xl overflow-hidden divide-y">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={item.onClick}
                className="w-full p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
                data-testid={`settings-${item.id}`}
              >
                <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-slate-800">{item.label}</p>
                  <p className="text-sm text-slate-500">{item.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>
            ))}
          </Card>
        </div>

        {/* Support Section */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-500 px-1">Support</h3>
          <Card className="rounded-2xl overflow-hidden divide-y">
            {supportItems.map((item) => (
              <button
                key={item.id}
                onClick={item.onClick}
                className="w-full p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="flex-1 text-left font-medium text-slate-700">{item.label}</span>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </button>
            ))}
          </Card>
        </div>

        {/* Logout Button */}
        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-full rounded-xl h-12 text-red-600 border-red-200 hover:bg-red-50"
          data-testid="logout-btn"
        >
          <LogOut className="w-5 h-5 mr-2" />
          {t('logout')}
        </Button>

        {/* Version */}
        <p className="text-center text-xs text-slate-400">
          Nevika Cura v2.0.0
        </p>
      </div>

      <BottomNav />
    </div>
  );
};

export default SettingsPage;

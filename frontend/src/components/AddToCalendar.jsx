import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Calendar, CalendarPlus, Download, ExternalLink, 
  Loader2, Check, Apple, Chrome, Mail
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Google Calendar Icon
const GoogleCalendarIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="2" fill="#4285F4"/>
    <rect x="5" y="5" width="14" height="14" rx="1" fill="white"/>
    <rect x="7" y="8" width="2" height="2" fill="#EA4335"/>
    <rect x="11" y="8" width="2" height="2" fill="#FBBC05"/>
    <rect x="15" y="8" width="2" height="2" fill="#34A853"/>
    <rect x="7" y="12" width="2" height="2" fill="#4285F4"/>
    <rect x="11" y="12" width="2" height="2" fill="#EA4335"/>
    <rect x="15" y="12" width="2" height="2" fill="#FBBC05"/>
    <rect x="7" y="16" width="2" height="2" fill="#34A853"/>
    <rect x="11" y="16" width="2" height="2" fill="#4285F4"/>
  </svg>
);

// Apple Calendar Icon  
const AppleCalendarIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <rect x="2" y="4" width="20" height="18" rx="3" fill="#FF3B30"/>
    <rect x="2" y="4" width="20" height="5" fill="#FF3B30"/>
    <rect x="2" y="9" width="20" height="13" rx="0 0 3 3" fill="white"/>
    <text x="12" y="18" textAnchor="middle" fill="#FF3B30" fontSize="8" fontWeight="bold">31</text>
  </svg>
);

const AddToCalendarButton = ({ 
  appointmentId, 
  appointmentData,
  variant = 'default',  // 'default', 'compact', 'icon-only'
  showDialog = true 
}) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [calendarLinks, setCalendarLinks] = useState(null);

  const fetchCalendarLinks = async () => {
    if (!appointmentId || !token) return;
    
    setLoading(true);
    try {
      const response = await axios.get(
        `${API}/calendar/appointment/${appointmentId}/links`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCalendarLinks(response.data);
      if (showDialog) {
        setDialogOpen(true);
      }
    } catch (error) {
      console.error('Failed to get calendar links:', error);
      toast.error('Failed to generate calendar links');
    } finally {
      setLoading(false);
    }
  };

  const openGoogleCalendar = () => {
    if (calendarLinks?.calendar_links?.google) {
      window.open(calendarLinks.calendar_links.google, '_blank');
      toast.success('Opening Google Calendar...');
    }
  };

  const downloadIcal = async () => {
    try {
      const response = await axios.get(
        `${API}/calendar/appointment/${appointmentId}/ical`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `appointment_${appointmentId.slice(0, 8)}.ics`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Calendar file downloaded! Open it to add to your calendar.');
    } catch (error) {
      toast.error('Failed to download calendar file');
    }
  };

  // Compact variant - single button with dropdown action
  if (variant === 'compact') {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchCalendarLinks}
          disabled={loading}
          className="rounded-lg text-xs"
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <>
              <CalendarPlus className="w-3 h-3 mr-1" />
              Add to Calendar
            </>
          )}
        </Button>
        
        <CalendarDialog 
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          calendarLinks={calendarLinks}
          onGoogleClick={openGoogleCalendar}
          onDownloadClick={downloadIcal}
        />
      </>
    );
  }

  // Icon-only variant
  if (variant === 'icon-only') {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchCalendarLinks}
          disabled={loading}
          className="h-8 w-8 p-0"
          title="Add to Calendar"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CalendarPlus className="w-4 h-4" />
          )}
        </Button>
        
        <CalendarDialog 
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          calendarLinks={calendarLinks}
          onGoogleClick={openGoogleCalendar}
          onDownloadClick={downloadIcal}
        />
      </>
    );
  }

  // Default variant - full button
  return (
    <>
      <Button
        onClick={fetchCalendarLinks}
        disabled={loading}
        className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded-xl"
        data-testid="add-to-calendar-btn"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <CalendarPlus className="w-4 h-4 mr-2" />
        )}
        Add to Calendar
      </Button>
      
      <CalendarDialog 
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        calendarLinks={calendarLinks}
        onGoogleClick={openGoogleCalendar}
        onDownloadClick={downloadIcal}
      />
    </>
  );
};

const CalendarDialog = ({ open, onOpenChange, calendarLinks, onGoogleClick, onDownloadClick }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="w-5 h-5 text-blue-500" />
            Add to Calendar
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 mt-4">
          {/* Appointment Info */}
          {calendarLinks?.appointment && (
            <Card className="p-4 rounded-xl bg-slate-50">
              <p className="font-semibold text-slate-800">
                {calendarLinks.appointment.doctor}
              </p>
              <p className="text-sm text-slate-500">
                {calendarLinks.appointment.clinic}
              </p>
              <p className="text-sm text-teal-600 mt-1">
                {calendarLinks.appointment.date} at {calendarLinks.appointment.time}
              </p>
            </Card>
          )}
          
          {/* Calendar Options */}
          <div className="space-y-2">
            {/* Google Calendar */}
            <button
              onClick={onGoogleClick}
              className="w-full p-4 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-white shadow flex items-center justify-center">
                <GoogleCalendarIcon className="w-6 h-6" />
              </div>
              <div className="text-left flex-1">
                <p className="font-medium text-slate-800">Google Calendar</p>
                <p className="text-xs text-slate-500">Opens in new tab</p>
              </div>
              <ExternalLink className="w-4 h-4 text-slate-400" />
            </button>
            
            {/* Apple Calendar / iCal Download */}
            <button
              onClick={onDownloadClick}
              className="w-full p-4 rounded-xl border-2 border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 shadow flex items-center justify-center text-white">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="text-left flex-1">
                <p className="font-medium text-slate-800">Apple Calendar / Outlook</p>
                <p className="text-xs text-slate-500">Download .ics file</p>
              </div>
              <Download className="w-4 h-4 text-slate-400" />
            </button>
            
            {/* Other Calendars */}
            <button
              onClick={onDownloadClick}
              className="w-full p-4 rounded-xl border-2 border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-100 shadow flex items-center justify-center text-slate-600">
                <Mail className="w-5 h-5" />
              </div>
              <div className="text-left flex-1">
                <p className="font-medium text-slate-800">Other Calendars</p>
                <p className="text-xs text-slate-500">Yahoo, Zoho, etc.</p>
              </div>
              <Download className="w-4 h-4 text-slate-400" />
            </button>
          </div>
          
          {/* Instructions */}
          <p className="text-xs text-center text-slate-400 pt-2">
            Your appointment includes reminders 24h and 1h before
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Sync All Appointments Button
const SyncAllAppointmentsButton = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  const downloadAllAppointments = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API}/calendar/sync/upcoming`,
        { 
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'nevika_appointments.ics');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('All appointments downloaded! Import this file to sync your calendar.');
    } catch (error) {
      toast.error('Failed to download appointments');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={downloadAllAppointments}
      disabled={loading}
      className="rounded-xl"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
      ) : (
        <Download className="w-4 h-4 mr-2" />
      )}
      Sync All Appointments
    </Button>
  );
};

export default AddToCalendarButton;
export { AddToCalendarButton, SyncAllAppointmentsButton, CalendarDialog };

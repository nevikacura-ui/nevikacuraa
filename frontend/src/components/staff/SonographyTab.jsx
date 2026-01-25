import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Scan, Calendar, RefreshCw, Loader2, Bell, Clock, Phone, User, MapPin
} from 'lucide-react';
import { 
  API, getAuthHeaders, SCAN_FEES 
} from '@/pages/staff/staffUtils';

const SonographyTab = ({ 
  staffInfo,
  selectedDate,
  setSelectedDate,
  SCAN_FEES_PROP
}) => {
  const [sonographyBookings, setSonographyBookings] = useState([]);
  const [loadingSonography, setLoadingSonography] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [selectedSonographyBooking, setSelectedSonographyBooking] = useState(null);

  // Use passed SCAN_FEES or import
  const scanFees = SCAN_FEES_PROP || SCAN_FEES;

  // Fetch sonography bookings
  const fetchSonographyBookings = async () => {
    setLoadingSonography(true);
    try {
      const clinic = staffInfo?.clinic || '';
      const res = await axios.get(`${API}/staff/sonography/bookings`, {
        params: { date: selectedDate, clinic },
        headers: getAuthHeaders()
      });
      setSonographyBookings(res.data.bookings || []);
    } catch (error) {
      console.error('Error fetching sonography bookings:', error);
    }
    setLoadingSonography(false);
  };

  // Send reminders
  const sendSonographyReminders = async () => {
    setSendingReminders(true);
    try {
      const res = await axios.post(`${API}/staff/sonography/send-reminders`, {
        date: selectedDate,
        clinic: staffInfo?.clinic
      }, { headers: getAuthHeaders() });
      
      if (res.data.success) {
        toast.success(`Sent ${res.data.sent_count} reminder(s)`);
        fetchSonographyBookings();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send reminders');
    }
    setSendingReminders(false);
  };

  // Update booking status
  const updateSonographyStatus = async (bookingId, status) => {
    try {
      await axios.put(`${API}/staff/sonography/bookings/${bookingId}/status`, 
        { status },
        { headers: getAuthHeaders() }
      );
      toast.success(`Status updated to ${status.replace('_', ' ')}`);
      fetchSonographyBookings();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update status');
    }
  };

  // Fetch on mount and date change
  useEffect(() => {
    if (staffInfo) {
      fetchSonographyBookings();
    }
  }, [selectedDate, staffInfo?.clinic]);

  return (
    <Card className="p-4" data-testid="sonography-tab">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Scan className="w-5 h-5 text-purple-600" />
            Sonography Bookings
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {sonographyBookings.length} booking{sonographyBookings.length !== 1 ? 's' : ''} for {selectedDate}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40"
            data-testid="sonography-date-input"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSonographyBookings}
            disabled={loadingSonography}
            data-testid="sonography-refresh-btn"
          >
            <RefreshCw className={`w-4 h-4 ${loadingSonography ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={sendSonographyReminders}
            disabled={sendingReminders}
            className="border-purple-300 text-purple-600 hover:bg-purple-50"
            title="Send SMS reminders for upcoming scans (within 30 mins)"
            data-testid="sonography-reminders-btn"
          >
            {sendingReminders ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Bell className="w-4 h-4 mr-1" />
            )}
            Send Reminders
          </Button>
        </div>
      </div>
      
      {loadingSonography ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
        </div>
      ) : sonographyBookings.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Scan className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No sonography bookings for this date</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sonographyBookings.map((booking) => (
            <div 
              key={booking.id} 
              className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200 cursor-pointer"
              onClick={() => setSelectedSonographyBooking(selectedSonographyBooking?.id === booking.id ? null : booking)}
              data-testid={`sonography-booking-${booking.id}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-purple-900">{booking.patient_name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      booking.status === 'booked' ? 'bg-blue-100 text-blue-800' :
                      booking.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                      booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {booking.status?.replace('_', ' ').toUpperCase()}
                    </span>
                    {booking.scan_type && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-purple-200 text-purple-800">
                        {scanFees[booking.scan_type]?.label || booking.scan_type}
                      </span>
                    )}
                    {booking.reminder_sent && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 flex items-center gap-1">
                        <Bell className="w-3 h-3" /> Reminded
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {booking.booking_time}
                    </span>
                    <span><strong>Age:</strong> {booking.age} yrs</span>
                    <span><strong>LMP:</strong> {booking.lmp}</span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {booking.mobile_number}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    <strong>Husband:</strong> {booking.husband_name}
                  </div>
                </div>
                <div className="flex gap-2">
                  {booking.status === 'booked' && (
                    <Button
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); updateSonographyStatus(booking.id, 'in_progress'); }}
                      className="bg-yellow-500 hover:bg-yellow-600"
                      data-testid={`sonography-start-${booking.id}`}
                    >
                      Start
                    </Button>
                  )}
                  {booking.status === 'in_progress' && (
                    <Button
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); updateSonographyStatus(booking.id, 'completed'); }}
                      className="bg-green-500 hover:bg-green-600"
                      data-testid={`sonography-complete-${booking.id}`}
                    >
                      Complete
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Expanded Details */}
              {selectedSonographyBooking?.id === booking.id && (
                <div className="mt-4 pt-4 border-t border-purple-200 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Date of Birth:</strong> {booking.date_of_birth || 'Not provided'}</p>
                    <p className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <strong>Address:</strong> {booking.address || 'Not provided'}
                    </p>
                    <p><strong>Clinic:</strong> {booking.clinic}</p>
                  </div>
                  <div>
                    {booking.has_children && booking.children?.length > 0 && (
                      <div>
                        <strong>Children:</strong>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {booking.children.map((child, idx) => (
                            <span key={idx} className="px-2 py-1 bg-white rounded text-xs">
                              {child.gender === 'boy' ? '👦' : '👧'} {child.gender} - {child.age}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {booking.notes && (
                      <p className="mt-2"><strong>Notes:</strong> {booking.notes}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default SonographyTab;

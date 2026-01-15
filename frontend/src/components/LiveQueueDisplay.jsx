import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Users, Clock, RefreshCw, MapPin, Phone, 
  CheckCircle2, Loader2, AlertCircle, TrendingUp,
  Calendar, ArrowRight, Navigation
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

// Status badge colors
const getStatusBadge = (status) => {
  const statusConfig = {
    'In-Progress': { color: 'bg-green-500', label: 'Being Served' },
    'in_consultation': { color: 'bg-green-500', label: 'Being Served' },
    'Checked-In': { color: 'bg-blue-500', label: 'Waiting' },
    'In Clinic': { color: 'bg-blue-500', label: 'In Clinic' },
    'waiting': { color: 'bg-yellow-500', label: 'Waiting' },
    'On-Way': { color: 'bg-purple-500', label: 'On Way' },
    'Completed': { color: 'bg-gray-500', label: 'Done' }
  };
  return statusConfig[status] || { color: 'bg-gray-400', label: status };
};

const LiveQueueDisplay = ({ clinic = 'Pushpa Clinic', showRemoteCheckIn = true }) => {
  const [queueData, setQueueData] = useState(null);
  const [busyHours, setBusyHours] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkInPhone, setCheckInPhone] = useState('');
  const [appointmentId, setAppointmentId] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [myPosition, setMyPosition] = useState(null);
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookingUp, setLookingUp] = useState(false);

  // Fetch queue data
  const fetchQueueData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const clinicParam = clinic.toLowerCase().includes('amnion') ? 'amnion' : 'pushpa';
      const response = await axios.get(`${API}/api/live-queue/status/${clinicParam}`);
      setQueueData(response.data);
    } catch (error) {
      console.error('Failed to fetch queue:', error);
      if (showRefresh) toast.error('Failed to refresh queue');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clinic]);

  // Fetch busy hours heatmap
  const fetchBusyHours = useCallback(async () => {
    try {
      const clinicParam = clinic.toLowerCase().includes('amnion') ? 'amnion' : 'pushpa';
      const response = await axios.get(`${API}/api/live-queue/busy-hours/${clinicParam}?days=14`);
      setBusyHours(response.data);
    } catch (error) {
      console.error('Failed to fetch busy hours:', error);
    }
  }, [clinic]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchQueueData();
    fetchBusyHours();
    const interval = setInterval(() => fetchQueueData(), 30000);
    return () => clearInterval(interval);
  }, [fetchQueueData, fetchBusyHours]);

  // Remote check-in
  const handleRemoteCheckIn = async () => {
    if (!appointmentId || !checkInPhone) {
      toast.error('Please enter appointment ID and phone number');
      return;
    }
    
    setCheckingIn(true);
    try {
      const response = await axios.post(`${API}/api/live-queue/remote-checkin`, {
        appointment_id: appointmentId,
        patient_phone: checkInPhone,
        eta_minutes: 15
      });
      
      if (response.data.success) {
        toast.success(response.data.message);
        setMyPosition(response.data.queue_position);
        fetchQueueData(true);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Check-in failed');
    } finally {
      setCheckingIn(false);
    }
  };

  // Lookup queue position
  const handleLookupPosition = async () => {
    if (!lookupPhone) {
      toast.error('Please enter your phone number');
      return;
    }
    
    setLookingUp(true);
    try {
      const response = await axios.get(`${API}/api/live-queue/position?phone=${lookupPhone}`);
      if (response.data.success) {
        setMyPosition(response.data.queue_position);
        toast.success(`You are #${response.data.queue_position.position} in queue`);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Appointment not found');
      setMyPosition(null);
    } finally {
      setLookingUp(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading queue...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Clinic Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Live Queue - {clinic}
          </h2>
          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
            <Clock className="w-4 h-4" />
            Last updated: {queueData?.current_time_ist} IST
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => fetchQueueData(true)}
          disabled={refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700">Being Served</p>
                <p className="text-3xl font-bold text-green-800">
                  {queueData?.stats?.currently_serving || 0}
                </p>
              </div>
              <CheckCircle2 className="w-10 h-10 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700">Waiting</p>
                <p className="text-3xl font-bold text-blue-800">
                  {queueData?.stats?.total_waiting || 0}
                </p>
              </div>
              <Users className="w-10 h-10 text-blue-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-700">Avg Wait</p>
                <p className="text-3xl font-bold text-amber-800">
                  {queueData?.stats?.avg_wait_time_minutes || 0}
                  <span className="text-lg ml-1">min</span>
                </p>
              </div>
              <Clock className="w-10 h-10 text-amber-500 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700">Est. Queue Time</p>
                <p className="text-3xl font-bold text-purple-800">
                  {queueData?.stats?.estimated_queue_time || 0}
                  <span className="text-lg ml-1">min</span>
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-purple-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Currently Serving */}
      {queueData?.currently_serving?.length > 0 && (
        <Card className="border-green-300 bg-green-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-green-800 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Now Serving
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {queueData.currently_serving.map((patient, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-green-600">
                      {patient.token_display}
                    </span>
                    <div>
                      <p className="font-medium">{patient.patient_name_masked}</p>
                      <p className="text-sm text-gray-500">{patient.doctor}</p>
                    </div>
                  </div>
                  <Badge className="bg-green-500">Being Served</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Waiting Queue */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Waiting Queue
          </CardTitle>
          <CardDescription>
            Patients waiting for consultation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {queueData?.waiting_queue?.length > 0 ? (
            <div className="space-y-2">
              {queueData.waiting_queue.map((patient, idx) => {
                const statusBadge = getStatusBadge(patient.status);
                return (
                  <div 
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      idx === 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        idx === 0 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-700'
                      }`}>
                        {patient.position}
                      </div>
                      <div>
                        <p className="font-medium">{patient.patient_name_masked}</p>
                        <p className="text-sm text-gray-500">
                          {patient.doctor} • {patient.type === 'walk-in' ? 'Walk-in' : 'Appointment'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={statusBadge.color}>{statusBadge.label}</Badge>
                      <p className="text-sm text-gray-500 mt-1">
                        ~{patient.estimated_wait_minutes} min wait
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No patients currently waiting</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Check My Position */}
      <Card className="border-blue-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-blue-800 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Check My Position
          </CardTitle>
          <CardDescription>
            Enter your phone number to see your queue position
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter phone number"
              value={lookupPhone}
              onChange={(e) => setLookupPhone(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleLookupPosition}
              disabled={lookingUp}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {lookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check'}
            </Button>
          </div>
          
          {myPosition && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Your Position</p>
                  <p className="text-4xl font-bold text-blue-800">#{myPosition.position}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Patients Ahead</p>
                  <p className="text-2xl font-bold">{myPosition.patients_ahead}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Est. Wait</p>
                  <p className="text-2xl font-bold">{myPosition.estimated_wait_minutes} min</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remote Check-in */}
      {showRemoteCheckIn && (
        <Card className="border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-purple-800 flex items-center gap-2">
              <Navigation className="w-5 h-5" />
              I'm On My Way
            </CardTitle>
            <CardDescription>
              Let the clinic know you're coming
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Input
                placeholder="Appointment ID"
                value={appointmentId}
                onChange={(e) => setAppointmentId(e.target.value)}
              />
              <Input
                placeholder="Phone Number (last 4 digits match)"
                value={checkInPhone}
                onChange={(e) => setCheckInPhone(e.target.value)}
              />
              <Button 
                onClick={handleRemoteCheckIn}
                disabled={checkingIn}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {checkingIn ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Navigation className="w-4 h-4 mr-2" />
                )}
                Check In Remotely
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Busy Hours Insight */}
      {busyHours?.peak_hours?.length > 0 && (
        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-800 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Busy Hours Insight
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-amber-700 mb-3">{busyHours.recommendation}</p>
            <div className="flex flex-wrap gap-2">
              {busyHours.peak_hours.slice(0, 3).map((peak, idx) => (
                <Badge 
                  key={idx}
                  variant="outline"
                  className={`
                    ${peak.intensity === 'high' ? 'border-red-400 bg-red-50 text-red-700' :
                      peak.intensity === 'medium' ? 'border-amber-400 bg-amber-50 text-amber-700' :
                      'border-green-400 bg-green-50 text-green-700'}
                  `}
                >
                  {peak.day} {peak.hour_label} ({peak.patient_count} patients)
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LiveQueueDisplay;

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Users, Clock, RefreshCw, CheckCircle2, Loader2, 
  PlayCircle, AlertTriangle, TrendingUp, UserCheck,
  PhoneCall, Bell, BarChart3
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const StaffQueueManager = ({ clinic = 'Pushpa Clinic', token }) => {
  const [queueData, setQueueData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [callingNext, setCallingNext] = useState(false);
  const [completingId, setCompletingId] = useState(null);
  const [notifyingId, setNotifyingId] = useState(null);

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const clinicParam = clinic.toLowerCase().includes('amnion') ? 'amnion' : 'pushpa';

  // Fetch queue data
  const fetchQueueData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const response = await axios.get(`${API}/api/live-queue/status/${clinicParam}`);
      setQueueData(response.data);
    } catch (error) {
      console.error('Failed to fetch queue:', error);
      if (showRefresh) toast.error('Failed to refresh queue');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clinicParam]);

  // Fetch analytics
  const fetchAnalytics = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API}/api/live-queue/staff/analytics/${clinicParam}`,
        { headers }
      );
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  }, [clinicParam, headers]);

  // Auto-refresh every 15 seconds for staff
  useEffect(() => {
    fetchQueueData();
    fetchAnalytics();
    const interval = setInterval(() => {
      fetchQueueData();
      fetchAnalytics();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchQueueData, fetchAnalytics]);

  // Call next patient
  const handleCallNext = async () => {
    setCallingNext(true);
    try {
      const response = await axios.post(
        `${API}/api/live-queue/staff/call-next/${clinicParam}`,
        {},
        { headers }
      );
      
      if (response.data.success) {
        const patient = response.data.called_patient;
        toast.success(`Called ${patient.name} (Token: ${patient.token || 'N/A'})`);
        fetchQueueData(true);
        fetchAnalytics();
      } else {
        toast.info(response.data.message || 'No patients waiting');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to call next patient');
    } finally {
      setCallingNext(false);
    }
  };

  // Mark consultation complete
  const handleComplete = async (appointmentId) => {
    setCompletingId(appointmentId);
    try {
      const response = await axios.post(
        `${API}/api/live-queue/staff/complete/${appointmentId}`,
        {},
        { headers }
      );
      
      if (response.data.success) {
        toast.success('Consultation marked complete');
        fetchQueueData(true);
        fetchAnalytics();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to mark complete');
    } finally {
      setCompletingId(null);
    }
  };

  // Send notification to patient
  const handleNotify = async (appointmentId, positionsAhead) => {
    setNotifyingId(appointmentId);
    try {
      const response = await axios.post(
        `${API}/api/live-queue/notify-patient/${appointmentId}?positions_ahead=${positionsAhead}`,
        {},
        { headers }
      );
      
      if (response.data.success) {
        toast.success('Notification sent to patient');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send notification');
    } finally {
      setNotifyingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-600">Loading queue manager...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            Queue Manager - {clinic}
          </h2>
          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
            <Clock className="w-4 h-4" />
            {queueData?.current_time_ist} IST • Auto-refreshes every 15s
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              fetchQueueData(true);
              fetchAnalytics();
            }}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={handleCallNext}
            disabled={callingNext || queueData?.stats?.total_waiting === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            {callingNext ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <PlayCircle className="w-4 h-4 mr-2" />
            )}
            Call Next Patient
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-blue-700">Total Today</p>
              <p className="text-3xl font-bold text-blue-800">
                {analytics.today_stats?.total_patients || 0}
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-green-100">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-green-700">Completed</p>
              <p className="text-3xl font-bold text-green-800">
                {analytics.today_stats?.completed || 0}
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-amber-700">Waiting</p>
              <p className="text-3xl font-bold text-amber-800">
                {analytics.today_stats?.waiting || 0}
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-purple-700">Walk-ins</p>
              <p className="text-3xl font-bold text-purple-800">
                {analytics.today_stats?.walk_ins || 0}
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-rose-50 to-rose-100">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-rose-700">Avg Wait</p>
              <p className="text-3xl font-bold text-rose-800">
                {analytics.today_stats?.avg_wait_time_minutes || 0}
                <span className="text-lg">m</span>
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Currently Serving */}
      <Card className="border-green-300 bg-green-50/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-green-800 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Currently Serving
          </CardTitle>
        </CardHeader>
        <CardContent>
          {queueData?.currently_serving?.length > 0 ? (
            <div className="space-y-3">
              {queueData.currently_serving.map((patient, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-green-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-green-600 text-white flex items-center justify-center text-xl font-bold">
                      {patient.token_display}
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{patient.patient_name_masked}</p>
                      <p className="text-sm text-gray-500">{patient.doctor}</p>
                      <Badge className="mt-1 bg-green-500">In Progress</Badge>
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleComplete(patient.id)}
                    disabled={completingId === patient.id}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {completingId === patient.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <UserCheck className="w-4 h-4 mr-2" />
                    )}
                    Mark Complete
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No patient currently being served</p>
              <Button 
                onClick={handleCallNext}
                disabled={callingNext || queueData?.stats?.total_waiting === 0}
                className="mt-3 bg-green-600 hover:bg-green-700"
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Call First Patient
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Waiting Queue */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Waiting Queue ({queueData?.stats?.total_waiting || 0})
          </CardTitle>
          <CardDescription>
            Click bell icon to notify patient • Click row to call
          </CardDescription>
        </CardHeader>
        <CardContent>
          {queueData?.waiting_queue?.length > 0 ? (
            <div className="space-y-2">
              {queueData.waiting_queue.map((patient, idx) => (
                <div 
                  key={idx}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    idx === 0 
                      ? 'bg-blue-50 border-blue-300 hover:bg-blue-100' 
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      idx === 0 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-700'
                    }`}>
                      {patient.position}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{patient.patient_name_masked}</p>
                        <Badge variant="outline" className="text-xs">
                          {patient.token_display}
                        </Badge>
                        {patient.type === 'walk-in' && (
                          <Badge variant="secondary" className="text-xs">Walk-in</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {patient.doctor} • ~{patient.estimated_wait_minutes} min wait
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleNotify(patient.id, patient.position)}
                      disabled={notifyingId === patient.id}
                      title="Send notification"
                    >
                      {notifyingId === patient.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Bell className="w-4 h-4" />
                      )}
                    </Button>
                    {idx === 0 && (
                      <Button
                        size="sm"
                        onClick={handleCallNext}
                        disabled={callingNext}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <PhoneCall className="w-4 h-4 mr-1" />
                        Call
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No patients waiting</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Efficiency Score */}
      {analytics && (
        <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Today's Efficiency Score
                </p>
                <p className="text-4xl font-bold mt-1">
                  {analytics.efficiency_score || 0}%
                </p>
                <p className="text-sm text-indigo-200 mt-1">
                  Based on completed consultations vs total patients
                </p>
              </div>
              <div className="w-24 h-24 rounded-full border-4 border-white/30 flex items-center justify-center">
                <TrendingUp className="w-12 h-12 text-white/80" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StaffQueueManager;

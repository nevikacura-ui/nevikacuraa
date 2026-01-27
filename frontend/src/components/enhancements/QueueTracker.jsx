import React, { useState, useEffect } from 'react';
import { Users, Clock, Bell, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';

const API = process.env.REACT_APP_BACKEND_URL;

// Queue Position Tracker (#2)
const QueueTracker = ({ appointmentId, clinicId }) => {
  const [queueData, setQueueData] = useState({
    position: 0,
    totalAhead: 0,
    estimatedWait: 0,
    averageConsultTime: 15,
    status: 'waiting'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQueuePosition = async () => {
      try {
        const token = localStorage.getItem('patientToken');
        const res = await fetch(`${API}/api/queue/position?appointment_id=${appointmentId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setQueueData(data);
        }
      } catch (error) {
        console.error('Failed to fetch queue position:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQueuePosition();
    // Poll every 30 seconds
    const interval = setInterval(fetchQueuePosition, 30000);
    return () => clearInterval(interval);
  }, [appointmentId]);

  const getStatusColor = () => {
    if (queueData.position <= 1) return 'text-green-600 bg-green-50';
    if (queueData.position <= 3) return 'text-yellow-600 bg-yellow-50';
    return 'text-blue-600 bg-blue-50';
  };

  const getStatusMessage = () => {
    if (queueData.position === 0) return "It's your turn!";
    if (queueData.position === 1) return "You're next!";
    if (queueData.position <= 3) return "Almost there!";
    return "Please wait";
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-20 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden" data-testid="queue-tracker">
      <CardHeader className={`${getStatusColor()} pb-2`}>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5" />
          Queue Status
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Position Display */}
        <div className="text-center py-4">
          <div className="text-6xl font-bold text-teal-600">
            #{queueData.position}
          </div>
          <p className="text-gray-600 mt-1">{getStatusMessage()}</p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-500">
            <span>Patients ahead: {queueData.totalAhead}</span>
            <span>~{queueData.estimatedWait} min wait</span>
          </div>
          <Progress 
            value={queueData.totalAhead > 0 ? ((queueData.totalAhead - queueData.position + 1) / queueData.totalAhead) * 100 : 100} 
            className="h-2"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <Clock className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">Avg. Consult</p>
              <p className="font-semibold">{queueData.averageConsultTime} min</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <div>
              <p className="text-xs text-gray-500">Est. Time</p>
              <p className="font-semibold">{queueData.estimatedWait} min</p>
            </div>
          </div>
        </div>

        {/* Notification Toggle */}
        <button className="w-full flex items-center justify-center gap-2 p-3 bg-teal-50 text-teal-700 rounded-lg hover:bg-teal-100">
          <Bell className="w-4 h-4" />
          Notify me when 2 patients ahead
        </button>
      </CardContent>
    </Card>
  );
};

export default QueueTracker;

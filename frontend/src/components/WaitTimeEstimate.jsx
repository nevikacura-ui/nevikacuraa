import React, { useState, useEffect } from 'react';
import { Clock, Users, TrendingUp, AlertCircle, CheckCircle2, Timer } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

// Simulated wait time data (would come from real queue in production)
const getEstimatedWaitTime = (queuePosition, avgConsultTime = 10) => {
  // Average consultation time in minutes
  const baseWait = queuePosition * avgConsultTime;
  // Add some variance
  const variance = Math.floor(Math.random() * 5) - 2;
  return Math.max(0, baseWait + variance);
};

const formatWaitTime = (minutes) => {
  if (minutes === 0) return 'No wait';
  if (minutes < 5) return '< 5 min';
  if (minutes < 60) return `~${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `~${hours}h ${mins}m`;
};

const getWaitTimeColor = (minutes) => {
  if (minutes === 0) return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' };
  if (minutes < 15) return { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' };
  if (minutes < 30) return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' };
  if (minutes < 60) return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' };
  return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
};

const WaitTimeEstimate = ({ clinic = 'DiaGyn', doctor = null, className = '' }) => {
  const [waitData, setWaitData] = useState({
    currentQueue: 0,
    estimatedWait: 0,
    avgConsultTime: 10,
    status: 'normal', // 'low', 'normal', 'busy', 'very_busy'
    lastUpdated: new Date()
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWaitTime();
    // Refresh every 2 minutes
    const interval = setInterval(fetchWaitTime, 120000);
    return () => clearInterval(interval);
  }, [clinic, doctor]);

  const fetchWaitTime = async () => {
    try {
      // In production, this would call the real API
      // const response = await fetch(`${API}/api/queue/wait-time?clinic=${clinic}&doctor=${doctor}`);
      // const data = await response.json();
      
      // Simulated data for now
      const simulatedQueue = Math.floor(Math.random() * 8);
      const avgTime = doctor ? 12 : 10; // Specialists take longer
      
      setWaitData({
        currentQueue: simulatedQueue,
        estimatedWait: getEstimatedWaitTime(simulatedQueue, avgTime),
        avgConsultTime: avgTime,
        status: simulatedQueue < 2 ? 'low' : simulatedQueue < 5 ? 'normal' : simulatedQueue < 8 ? 'busy' : 'very_busy',
        lastUpdated: new Date()
      });
    } catch (error) {
      console.error('Failed to fetch wait time:', error);
    } finally {
      setLoading(false);
    }
  };

  const colors = getWaitTimeColor(waitData.estimatedWait);

  const getStatusMessage = () => {
    switch (waitData.status) {
      case 'low':
        return { icon: CheckCircle2, text: 'Low wait time', color: 'text-green-600' };
      case 'normal':
        return { icon: Clock, text: 'Normal wait', color: 'text-blue-600' };
      case 'busy':
        return { icon: TrendingUp, text: 'Busy right now', color: 'text-orange-600' };
      case 'very_busy':
        return { icon: AlertCircle, text: 'Very busy', color: 'text-red-600' };
      default:
        return { icon: Clock, text: 'Checking...', color: 'text-gray-600' };
    }
  };

  const status = getStatusMessage();
  const StatusIcon = status.icon;

  if (loading) {
    return (
      <div className={`animate-pulse bg-slate-100 rounded-xl p-4 ${className}`}>
        <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
        <div className="h-6 bg-slate-200 rounded w-16"></div>
      </div>
    );
  }

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-xl p-4 ${className}`} data-testid="wait-time-estimate">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center`}>
            <Timer className={`w-5 h-5 ${colors.text}`} />
          </div>
          <div>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <StatusIcon className={`w-3 h-3 ${status.color}`} />
              <span className={status.color}>{status.text}</span>
            </p>
            <p className={`text-lg font-bold ${colors.text}`}>
              {formatWaitTime(waitData.estimatedWait)}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="flex items-center gap-1 text-slate-500 text-xs">
            <Users className="w-3 h-3" />
            <span>{waitData.currentQueue} in queue</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            Updated {new Date(waitData.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      {/* Peak Hours Info */}
      {waitData.status === 'busy' || waitData.status === 'very_busy' ? (
        <div className="mt-3 pt-3 border-t border-dashed border-orange-200">
          <p className="text-xs text-slate-600">
            💡 <span className="font-medium">Tip:</span> Less busy hours are typically 2-4 PM and after 6 PM
          </p>
        </div>
      ) : null}
    </div>
  );
};

// Compact version for clinic cards
export const WaitTimeBadge = ({ clinic, waitMinutes = null, className = '' }) => {
  const [wait, setWait] = useState(waitMinutes);

  useEffect(() => {
    if (waitMinutes === null) {
      // Simulate fetching
      setWait(Math.floor(Math.random() * 30));
    }
  }, [waitMinutes]);

  if (wait === null) return null;

  const colors = getWaitTimeColor(wait);

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text} ${className}`}>
      <Clock className="w-3 h-3" />
      {formatWaitTime(wait)} wait
    </span>
  );
};

// Live Queue Status Component
export const LiveQueueStatus = ({ clinics = ['DiaGyn', 'Mango'], className = '' }) => {
  const [queues, setQueues] = useState({});

  useEffect(() => {
    // Simulate queue data
    const data = {};
    clinics.forEach(clinic => {
      data[clinic] = {
        waiting: Math.floor(Math.random() * 5),
        avgWait: Math.floor(Math.random() * 20) + 5
      };
    });
    setQueues(data);
  }, []);

  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`} data-testid="live-queue-status">
      {clinics.map(clinic => (
        <div 
          key={clinic}
          className="bg-white rounded-xl p-3 border border-slate-100 shadow-sm"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${
              queues[clinic]?.waiting === 0 ? 'bg-green-500' :
              queues[clinic]?.waiting < 3 ? 'bg-yellow-500' : 'bg-orange-500'
            } animate-pulse`} />
            <span className="font-medium text-slate-800 text-sm">{clinic}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>~{queues[clinic]?.avgWait || 0} min</span>
            <span>{queues[clinic]?.waiting || 0} waiting</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default WaitTimeEstimate;

import React, { useState, useEffect } from 'react';
import { Monitor, Users, Clock, RefreshCw, Volume2, VolumeX, Maximize2, Settings } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

const DigitalSignage = () => {
  const [queueData, setQueueData] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    fetchQueueData();
    const interval = setInterval(fetchQueueData, 10000);
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
    };
  }, []);

  const fetchQueueData = () => {
    setQueueData([
      { token: 'D001', name: 'Rajesh K.', doctor: 'Dr. Vikas Jha', status: 'in-consultation', room: 'Room 1' },
      { token: 'D002', name: 'Priya M.', doctor: 'Dr. Vikas Jha', status: 'next', room: 'Room 1' },
      { token: 'D003', name: 'Amit S.', doctor: 'Dr. Vikas Jha', status: 'waiting', room: 'Room 1' },
      { token: 'G001', name: 'Sunita D.', doctor: 'Dr. Neha Patel', status: 'in-consultation', room: 'Room 2' },
      { token: 'G002', name: 'Meera R.', doctor: 'Dr. Neha Patel', status: 'next', room: 'Room 2' },
      { token: 'L001', name: 'Vijay P.', doctor: 'Lab Collection', status: 'in-progress', room: 'Lab' }
    ]);

    setAnnouncements([
      'COVID-19 vaccination available daily from 10 AM to 4 PM',
      'New health packages available - Enquire at reception',
      'Please maintain social distancing in waiting area'
    ]);
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'in-consultation':
      case 'in-progress':
        return 'bg-green-500 text-white animate-pulse';
      case 'next':
        return 'bg-amber-500 text-white';
      default:
        return 'bg-gray-200 text-gray-700';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'in-consultation': return 'In Consultation';
      case 'in-progress': return 'In Progress';
      case 'next': return 'Next';
      default: return 'Waiting';
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Group by room/doctor
  const groupedQueue = queueData.reduce((acc, item) => {
    const key = item.room;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-4" data-testid="digital-signage">
      {/* Header */}
      <Card className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Monitor className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Digital Signage</h2>
                <p className="text-teal-100 text-sm">Queue display for waiting area</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={() => setSoundEnabled(!soundEnabled)} className="text-white hover:bg-white/20">
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="text-white hover:bg-white/20">
                <Maximize2 className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Card */}
      <Card className="bg-slate-900 text-white overflow-hidden">
        <CardContent className="p-0">
          {/* Display Header */}
          <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img 
                  src="https://customer-assets.emergentagent.com/job_ac8a9ff5-aa40-4353-a699-dcb3a3af111e/artifacts/3jh0hyis_Blue%20White%20Minimal%20Marketing%20Agency%20Business%20Card%20%28Business%20Card%20%28US%29%29%20%28Cir_20260110_233820_0000%20%281%29.jpg" 
                  alt="Nevika Cura" 
                  className="h-10 rounded-lg bg-white p-1"
                />
                <h1 className="text-xl font-bold">Queue Status</h1>
              </div>
              <div className="text-right">
                <p className="text-2xl font-mono">{currentTime.toLocaleTimeString()}</p>
                <p className="text-sm opacity-80">{currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
              </div>
            </div>
          </div>

          {/* Queue Display */}
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(groupedQueue).map(([room, patients]) => (
              <div key={room} className="bg-slate-800 rounded-xl p-4">
                <h3 className="text-lg font-semibold mb-3 text-teal-400">{room}</h3>
                <div className="space-y-2">
                  {patients.map((patient, idx) => (
                    <div 
                      key={patient.token}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        idx === 0 ? 'bg-slate-700' : 'bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold font-mono text-white">{patient.token}</span>
                        <div>
                          <p className="font-medium">{patient.name}</p>
                          <p className="text-xs text-gray-400">{patient.doctor}</p>
                        </div>
                      </div>
                      <Badge className={getStatusStyle(patient.status)}>
                        {getStatusText(patient.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Announcements Ticker */}
          <div className="bg-amber-500 text-white py-2 overflow-hidden">
            <div className="animate-marquee whitespace-nowrap">
              {announcements.map((ann, idx) => (
                <span key={idx} className="mx-8">📢 {ann}</span>
              ))}
              {announcements.map((ann, idx) => (
                <span key={`dup-${idx}`} className="mx-8">📢 {ann}</span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CSS for marquee */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: inline-block;
          animation: marquee 30s linear infinite;
        }
      `}</style>

      {/* Settings */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4" /> Display Settings
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Refresh Interval</p>
              <p className="font-medium">10 seconds</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Sound Alerts</p>
              <p className="font-medium">{soundEnabled ? 'Enabled' : 'Disabled'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DigitalSignage;

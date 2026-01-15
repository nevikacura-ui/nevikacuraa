import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import LiveQueueDisplay from '@/components/LiveQueueDisplay';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Phone, Clock, ExternalLink, Navigation } from 'lucide-react';

const CLINICS = {
  pushpa: {
    name: 'Pushpa Clinic',
    address: 'Near Zilla Parishad, Pusad, Maharashtra 445204',
    phone: '9403890429',
    mapLink: 'https://maps.app.goo.gl/LfFoHwVzvMEQ1Qzt9',
    hours: {
      morning: '10:00 AM - 2:00 PM',
      evening: '5:00 PM - 9:00 PM'
    }
  },
  amnion: {
    name: 'Amnion Clinic',
    address: 'Near Bus Stand, Pusad, Maharashtra 445204',
    mapLink: 'https://maps.app.goo.gl/aBr4jwCv3b6874vi8',
    phone: '9403890429',
    hours: {
      morning: '10:00 AM - 2:00 PM',
      evening: '5:00 PM - 9:00 PM'
    }
  }
};

// Get current IST time
const getISTTime = () => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + istOffset);
};

const formatISTTime = (date) => {
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  });
};

const formatISTDate = (date) => {
  return date.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  });
};

const QueuePage = () => {
  const [searchParams] = useSearchParams();
  const initialClinic = searchParams.get('clinic') || 'pushpa';
  const [selectedClinic, setSelectedClinic] = useState(initialClinic);
  const [currentTime, setCurrentTime] = useState(getISTTime());
  
  const clinicInfo = CLINICS[selectedClinic];

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getISTTime());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Check if clinic is currently open
  const isClinicOpen = () => {
    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();
    const currentMinutes = hour * 60 + minute;
    
    // Morning: 10:00 AM - 2:00 PM (600 - 840 minutes)
    // Evening: 5:00 PM - 9:00 PM (1020 - 1260 minutes)
    const morningOpen = 10 * 60; // 10:00 AM
    const morningClose = 14 * 60; // 2:00 PM
    const eveningOpen = 17 * 60; // 5:00 PM
    const eveningClose = 21 * 60; // 9:00 PM
    
    return (currentMinutes >= morningOpen && currentMinutes < morningClose) ||
           (currentMinutes >= eveningOpen && currentMinutes < eveningClose);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Nevika Cura
              </h1>
              <p className="text-sm text-gray-500">Live Queue Status</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex gap-2">
                <Button
                  variant={selectedClinic === 'pushpa' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedClinic('pushpa')}
                >
                  Pushpa
                </Button>
                <Button
                  variant={selectedClinic === 'amnion' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedClinic('amnion')}
                >
                  Amnion
                </Button>
              </div>
              <p className="text-xs text-gray-400">
                {formatISTTime(currentTime)} IST
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Clinic Info Card */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              {/* Clinic Name & Status */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">{clinicInfo.name}</h2>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  isClinicOpen() 
                    ? 'bg-green-400 text-green-900' 
                    : 'bg-red-400 text-red-900'
                }`}>
                  {isClinicOpen() ? '● Open Now' : '● Closed'}
                </span>
              </div>
              
              {/* Address with Map Link */}
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-blue-100 text-sm">{clinicInfo.address}</p>
                  <a 
                    href={clinicInfo.mapLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-white/90 hover:text-white mt-1 underline underline-offset-2"
                  >
                    <Navigation className="w-3 h-3" />
                    Get Directions on Google Maps
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
              
              {/* Timing */}
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-blue-100">
                    <span className="text-white font-medium">Morning:</span> {clinicInfo.hours.morning}
                  </p>
                  <p className="text-blue-100">
                    <span className="text-white font-medium">Evening:</span> {clinicInfo.hours.evening}
                  </p>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <a href={`tel:${clinicInfo.phone}`} className="flex-1">
                  <Button variant="secondary" size="sm" className="w-full">
                    <Phone className="w-4 h-4 mr-1" />
                    Call: {clinicInfo.phone}
                  </Button>
                </a>
                <a href={clinicInfo.mapLink} target="_blank" rel="noopener noreferrer" className="flex-1">
                  <Button variant="secondary" size="sm" className="w-full">
                    <MapPin className="w-4 h-4 mr-1" />
                    Open in Maps
                  </Button>
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Date/Time Display */}
        <div className="text-center mb-4">
          <p className="text-sm text-gray-600">
            {formatISTDate(currentTime)} • <span className="font-medium">{formatISTTime(currentTime)} IST</span>
          </p>
        </div>

        {/* Live Queue Component */}
        <LiveQueueDisplay 
          clinic={clinicInfo.name} 
          showRemoteCheckIn={true}
        />
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto px-4 py-8 text-center text-gray-500 text-sm">
        <p>© 2026 Nevika Cura Healthcare Group</p>
        <p className="mt-1">Queue data refreshes automatically every 30 seconds • All times in IST</p>
      </div>
    </div>
  );
};

export default QueuePage;

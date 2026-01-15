import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import LiveQueueDisplay from '@/components/LiveQueueDisplay';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Phone, Clock } from 'lucide-react';

const CLINICS = {
  pushpa: {
    name: 'Pushpa Clinic',
    address: 'Near SBI Bank, Main Road, Pusad',
    phone: '9403890429',
    hours: '10:00 AM - 2:00 PM, 5:00 PM - 9:00 PM'
  },
  amnion: {
    name: 'Amnion Clinic',
    address: 'Opposite City Mall, Station Road, Pusad',
    phone: '9403890429',
    hours: '10:00 AM - 2:00 PM, 5:00 PM - 9:00 PM'
  }
};

const QueuePage = () => {
  const [searchParams] = useSearchParams();
  const initialClinic = searchParams.get('clinic') || 'pushpa';
  const [selectedClinic, setSelectedClinic] = useState(initialClinic);
  
  const clinicInfo = CLINICS[selectedClinic];

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
          </div>
        </div>
      </div>

      {/* Clinic Info Card */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{clinicInfo.name}</h2>
                <p className="text-blue-100 text-sm flex items-center gap-1 mt-1">
                  <MapPin className="w-4 h-4" />
                  {clinicInfo.address}
                </p>
                <p className="text-blue-100 text-sm flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {clinicInfo.hours}
                </p>
              </div>
              <div className="flex gap-2">
                <a href={`tel:${clinicInfo.phone}`}>
                  <Button variant="secondary" size="sm">
                    <Phone className="w-4 h-4 mr-1" />
                    Call
                  </Button>
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Live Queue Component */}
        <LiveQueueDisplay 
          clinic={clinicInfo.name} 
          showRemoteCheckIn={true}
        />
      </div>

      {/* Footer */}
      <div className="max-w-4xl mx-auto px-4 py-8 text-center text-gray-500 text-sm">
        <p>© 2026 Nevika Cura Healthcare Group</p>
        <p className="mt-1">Queue data refreshes automatically every 30 seconds</p>
      </div>
    </div>
  );
};

export default QueuePage;

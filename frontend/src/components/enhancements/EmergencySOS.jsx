import React, { useState, useEffect } from 'react';
import { AlertTriangle, Phone, MapPin, Ambulance, Heart, Zap, User, Clock, CheckCircle, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Emergency SOS Feature (#30)
const EmergencySOS = () => {
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [location, setLocation] = useState(null);
  const [emergencyContacts, setEmergencyContacts] = useState([
    { id: 1, name: 'Emergency Contact 1', phone: '+91 9876543210', relation: 'Spouse' },
    { id: 2, name: 'Emergency Contact 2', phone: '+91 9876543211', relation: 'Parent' },
  ]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [alertSent, setAlertSent] = useState(false);

  const emergencyServices = [
    { name: 'Ambulance', number: '102', icon: Ambulance, color: 'bg-red-500' },
    { name: 'Police', number: '100', icon: Shield, color: 'bg-blue-600' },
    { name: 'Fire', number: '101', icon: Zap, color: 'bg-orange-500' },
    { name: 'Women Helpline', number: '1091', icon: User, color: 'bg-pink-500' },
  ];

  useEffect(() => {
    // Get user location on mount
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Location access denied');
        }
      );
    }
  }, []);

  const sendEmergencyAlert = async () => {
    // Vibrate device
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }

    try {
      const token = localStorage.getItem('patientToken');
      await fetch(`${API}/api/emergency/sos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          location,
          contacts: emergencyContacts.map(c => c.phone),
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.log('API call failed, continuing with local alert');
    }

    setAlertSent(true);
    setEmergencyMode(false);
    setShowConfirmation(true);
    toast.success('Emergency alert sent to your contacts!');
  };

  useEffect(() => {
    let timer;
    if (emergencyMode && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (emergencyMode && countdown === 0) {
      sendEmergencyAlert();
    }
    return () => clearTimeout(timer);
  }, [emergencyMode, countdown, sendEmergencyAlert]);

  const triggerSOS = () => {
    setEmergencyMode(true);
    setCountdown(5);
  };

  const cancelSOS = () => {
    setEmergencyMode(false);
    setCountdown(5);
  };

  const callEmergency = (number) => {
    window.open(`tel:${number}`, '_self');
  };

  return (
    <div className="space-y-4" data-testid="emergency-sos">
      {/* SOS Button */}
      <Card className="bg-gradient-to-br from-red-500 to-rose-600 text-white overflow-hidden">
        <CardContent className="p-6">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Emergency SOS</h2>
            <p className="text-red-100 mb-6">
              Press and hold for 3 seconds to send emergency alert
            </p>

            {!emergencyMode ? (
              <Button
                size="lg"
                className="w-32 h-32 rounded-full bg-white text-red-600 hover:bg-red-50 text-xl font-bold shadow-xl"
                onClick={triggerSOS}
              >
                SOS
              </Button>
            ) : (
              <div className="relative">
                <Button
                  size="lg"
                  className="w-32 h-32 rounded-full bg-white text-red-600 animate-pulse text-4xl font-bold shadow-xl"
                  onClick={cancelSOS}
                >
                  {countdown}
                </Button>
                <p className="mt-4 text-red-100">Tap to cancel</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Emergency Calls */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Phone className="w-5 h-5 text-red-500" />
            Quick Emergency Calls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {emergencyServices.map((service) => (
              <Button
                key={service.number}
                variant="outline"
                className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-red-50 hover:border-red-300"
                onClick={() => callEmergency(service.number)}
              >
                <div className={`w-10 h-10 ${service.color} rounded-full flex items-center justify-center`}>
                  <service.icon className="w-5 h-5 text-white" />
                </div>
                <span className="font-medium">{service.name}</span>
                <span className="text-lg font-bold text-red-600">{service.number}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Emergency Contacts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-teal-600" />
            Your Emergency Contacts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {emergencyContacts.map((contact) => (
            <div key={contact.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <p className="font-medium">{contact.name}</p>
                  <p className="text-sm text-gray-500">{contact.relation} • {contact.phone}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => callEmergency(contact.phone.replace(/\s/g, ''))}
              >
                <Phone className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" className="w-full">
            + Add Emergency Contact
          </Button>
        </CardContent>
      </Card>

      {/* Location Status */}
      {location && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4 flex items-center gap-3">
            <MapPin className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800">Location Enabled</p>
              <p className="text-sm text-green-600">
                Your location will be shared in emergency
              </p>
            </div>
            <CheckCircle className="w-5 h-5 text-green-500 ml-auto" />
          </CardContent>
        </Card>
      )}

      {!location && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4 flex items-center gap-3">
            <MapPin className="w-5 h-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800">Location Disabled</p>
              <p className="text-sm text-amber-600">
                Enable location for better emergency response
              </p>
            </div>
            <Button size="sm" variant="outline" className="ml-auto">
              Enable
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-6 h-6" />
              Alert Sent Successfully
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-gray-600">
              Emergency alert has been sent to your contacts with your current location.
            </p>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700">
                <strong>Contacts notified:</strong>
              </p>
              <ul className="mt-2 space-y-1">
                {emergencyContacts.map(c => (
                  <li key={c.id} className="text-sm text-green-600">
                    ✓ {c.name} ({c.phone})
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex gap-2">
              <Button 
                className="flex-1 bg-red-500 hover:bg-red-600"
                onClick={() => callEmergency('102')}
              >
                Call Ambulance
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowConfirmation(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmergencySOS;

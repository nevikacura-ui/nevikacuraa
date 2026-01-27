import React, { useState, useEffect } from 'react';
import { Phone, AlertTriangle, MapPin, Heart, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../ui/dialog';

// Emergency SOS Feature (#30)
const EmergencySOS = () => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isCalling, setIsCalling] = useState(false);

  const emergencyContacts = [
    { name: 'Ambulance', number: '108', icon: '🚑' },
    { name: 'Police', number: '100', icon: '🚔' },
    { name: 'Fire', number: '101', icon: '🚒' },
    { name: 'Nevika Emergency', number: '+91-9876543210', icon: '🏥' },
  ];

  useEffect(() => {
    let timer;
    if (showConfirm && countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (showConfirm && countdown === 0) {
      handleEmergencyCall();
    }
    return () => clearTimeout(timer);
  }, [showConfirm, countdown]);

  const handleEmergencyCall = () => {
    setIsCalling(true);
    // In a real app, this would trigger actual emergency call
    window.location.href = 'tel:108';
  };

  const cancelSOS = () => {
    setShowConfirm(false);
    setCountdown(5);
    setIsCalling(false);
  };

  return (
    <>
      {/* Floating SOS Button */}
      <button
        onClick={() => setShowConfirm(true)}
        className="fixed bottom-24 right-4 z-50 w-16 h-16 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-2xl flex items-center justify-center animate-pulse"
        data-testid="sos-button"
      >
        <div className="text-center">
          <AlertTriangle className="w-6 h-6 mx-auto" />
          <span className="text-xs font-bold">SOS</span>
        </div>
      </button>

      {/* Emergency Dialog */}
      <Dialog open={showConfirm} onOpenChange={cancelSOS}>
        <DialogContent className="max-w-sm rounded-3xl p-0 overflow-hidden bg-red-600">
          <div className="p-6 text-white text-center">
            <DialogTitle className="text-2xl font-bold flex items-center justify-center gap-2">
              <AlertTriangle className="w-8 h-8 animate-bounce" />
              EMERGENCY SOS
            </DialogTitle>
            <DialogDescription className="text-white/90 mt-2">
              {isCalling ? 'Connecting to emergency services...' : `Calling emergency in ${countdown} seconds`}
            </DialogDescription>
          </div>

          <div className="bg-white p-6 space-y-4">
            {/* Countdown Circle */}
            {!isCalling && (
              <div className="flex justify-center">
                <div className="w-24 h-24 rounded-full border-4 border-red-600 flex items-center justify-center">
                  <span className="text-4xl font-bold text-red-600">{countdown}</span>
                </div>
              </div>
            )}

            {/* Emergency Contacts */}
            <div className="grid grid-cols-2 gap-3">
              {emergencyContacts.map((contact) => (
                <a
                  key={contact.number}
                  href={`tel:${contact.number}`}
                  className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl hover:bg-gray-100"
                >
                  <span className="text-2xl">{contact.icon}</span>
                  <div>
                    <p className="font-semibold text-sm">{contact.name}</p>
                    <p className="text-xs text-gray-500">{contact.number}</p>
                  </div>
                </a>
              ))}
            </div>

            {/* Share Location */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition((pos) => {
                    const { latitude, longitude } = pos.coords;
                    const msg = `EMERGENCY! My location: https://maps.google.com/?q=${latitude},${longitude}`;
                    if (navigator.share) {
                      navigator.share({ text: msg });
                    }
                  });
                }
              }}
            >
              <MapPin className="w-4 h-4 mr-2" />
              Share My Location
            </Button>

            {/* Cancel Button */}
            <Button
              variant="outline"
              className="w-full border-red-300 text-red-600 hover:bg-red-50"
              onClick={cancelSOS}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel Emergency
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EmergencySOS;

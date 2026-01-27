import React, { useState } from 'react';
import { Scan, CheckCircle, UserPlus, Search, QrCode, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { toast } from 'sonner';

const PatientCheckinKiosk = () => {
  const [mode, setMode] = useState('home'); // home, search, checkin, success
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);

  const mockPatients = [
    { id: '1', name: 'Rajesh Kumar', phone: '9876543210', appointment: '10:30 AM', doctor: 'Dr. Vikas Jha' },
    { id: '2', name: 'Priya Sharma', phone: '9876543211', appointment: '11:00 AM', doctor: 'Dr. Neha Patel' },
    { id: '3', name: 'Amit Singh', phone: '9876543212', appointment: '11:30 AM', doctor: 'Dr. Vikas Jha' }
  ];

  const searchPatients = () => {
    if (searchQuery.length < 3) {
      toast.error('Please enter at least 3 characters');
      return;
    }
    
    const results = mockPatients.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery)
    );
    setSearchResults(results);
    setMode('search');
  };

  const selectPatient = (patient) => {
    setSelectedPatient(patient);
    setMode('checkin');
  };

  const confirmCheckin = async () => {
    setCheckingIn(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setCheckingIn(false);
    setMode('success');
  };

  const reset = () => {
    setMode('home');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedPatient(null);
  };

  return (
    <div className="space-y-4" data-testid="patient-checkin-kiosk">
      {/* Header */}
      <Card className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Scan className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg">Self Check-in Kiosk</h2>
              <p className="text-teal-100 text-sm">Quick and easy patient check-in</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {mode === 'home' && (
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold mb-2">Welcome to Nevika Cura</h3>
              <p className="text-gray-500">Please check in for your appointment</p>
            </div>

            {/* Search by Name/Phone */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Enter name or phone number"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchPatients()}
                  className="pl-12 h-14 text-lg"
                />
              </div>
              <Button onClick={searchPatients} className="w-full h-12" size="lg">
                <Search className="w-5 h-5 mr-2" /> Find My Appointment
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-4 text-gray-500">or</span>
              </div>
            </div>

            {/* QR Code Check-in */}
            <Button variant="outline" className="w-full h-12" size="lg">
              <QrCode className="w-5 h-5 mr-2" /> Scan QR Code
            </Button>

            {/* Walk-in */}
            <Button variant="ghost" className="w-full" onClick={() => toast.info('Please visit reception for walk-in registration')}>
              <UserPlus className="w-4 h-4 mr-2" /> Walk-in Patient? Register Here
            </Button>
          </CardContent>
        </Card>
      )}

      {mode === 'search' && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Search Results</h3>
              <Button variant="ghost" size="sm" onClick={reset}>Back</Button>
            </div>

            {searchResults.length > 0 ? (
              <div className="space-y-3">
                {searchResults.map(patient => (
                  <Card 
                    key={patient.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => selectPatient(patient)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-lg">{patient.name}</p>
                          <p className="text-sm text-gray-500">{patient.phone}</p>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-teal-100 text-teal-700">{patient.appointment}</Badge>
                          <p className="text-xs text-gray-500 mt-1">{patient.doctor}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No appointments found</p>
                <Button variant="link" onClick={reset}>Try again</Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {mode === 'checkin' && selectedPatient && (
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold">Confirm Check-in</h3>
            </div>

            <Card className="bg-teal-50 border-teal-200">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{selectedPatient.name}</p>
                <p className="text-gray-500">{selectedPatient.phone}</p>
                <div className="mt-4 flex justify-center gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Appointment</p>
                    <p className="font-semibold">{selectedPatient.appointment}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Doctor</p>
                    <p className="font-semibold">{selectedPatient.doctor}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={reset} className="flex-1">
                Not Me
              </Button>
              <Button onClick={confirmCheckin} className="flex-1" disabled={checkingIn}>
                {checkingIn ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking in...</>
                ) : (
                  <><CheckCircle className="w-4 h-4 mr-2" /> Yes, Check Me In</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {mode === 'success' && selectedPatient && (
        <Card>
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            
            <div>
              <h3 className="text-2xl font-bold text-green-600">Check-in Complete!</h3>
              <p className="text-gray-500 mt-2">Welcome, {selectedPatient.name}</p>
            </div>

            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-500">Your Token</p>
                    <p className="text-3xl font-bold text-teal-600">D003</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Estimated Wait</p>
                    <p className="text-3xl font-bold">15 min</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <p className="text-sm text-gray-500">
              Please have a seat in the waiting area. You will be called shortly.
            </p>

            <Button onClick={reset} variant="outline" className="w-full">
              Done
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PatientCheckinKiosk;

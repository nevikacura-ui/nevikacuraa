import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { QrCode, CheckCircle2, XCircle, Loader2, Camera, User, Calendar, Clock, Building2 } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL || '';

const QRScanner = ({ isOpen, onClose, onCheckInSuccess, staffToken }) => {
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    if (isOpen && !scanning) {
      startScanner();
    }
    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = () => {
    setScanning(true);
    setScannedData(null);
    setAppointment(null);
    setError(null);

    setTimeout(() => {
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        rememberLastUsedCamera: true,
      };

      scannerRef.current = new Html5QrcodeScanner("qr-reader", config, false);
      
      scannerRef.current.render(
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Ignore scan errors (happens continuously while scanning)
        }
      );
    }, 100);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
      } catch (e) {
        // Ignore cleanup errors
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleScanSuccess = async (decodedText) => {
    stopScanner();
    setScannedData(decodedText);
    
    // Parse the QR code data
    const lines = decodedText.split('\n');
    let bookingId = null;
    let bookingType = null;
    
    // Find booking ID from QR data
    for (const line of lines) {
      if (line.includes('ID:')) {
        bookingId = line.split('ID:')[1].trim();
      }
      if (line.includes('APPOINTMENT')) {
        bookingType = 'appointment';
      } else if (line.includes('LAB TEST')) {
        bookingType = 'lab_test';
      } else if (line.includes('MEDICINE ORDER')) {
        bookingType = 'medicine_order';
      }
    }

    if (!bookingId) {
      setError('Invalid QR code. No booking ID found.');
      return;
    }

    // Fetch appointment details
    setLoading(true);
    try {
      const response = await axios.get(`${API}/api/staff/appointments/by-booking-id/${bookingId}`, {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      
      if (response.data) {
        setAppointment(response.data);
      } else {
        setError(`No appointment found with ID: ${bookingId}`);
      }
    } catch (err) {
      console.error('Error fetching appointment:', err);
      setError(`Could not find booking: ${bookingId}`);
    }
    setLoading(false);
  };

  const handleCheckIn = async () => {
    if (!appointment) return;
    
    setLoading(true);
    try {
      await axios.put(`${API}/api/staff/appointments/${appointment.id}/check-in`, {}, {
        headers: { Authorization: `Bearer ${staffToken}` }
      });
      
      toast.success(`${appointment.patient_name} checked in successfully!`);
      onCheckInSuccess && onCheckInSuccess(appointment);
      onClose();
    } catch (err) {
      console.error('Check-in error:', err);
      toast.error('Failed to check in patient');
    }
    setLoading(false);
  };

  const resetScanner = () => {
    setScannedData(null);
    setAppointment(null);
    setError(null);
    startScanner();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="qr-scanner-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-teal-600" />
            QR Code Check-In
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Scanner Area */}
          {!scannedData && !error && (
            <div className="relative">
              <div id="qr-reader" className="w-full rounded-lg overflow-hidden"></div>
              <p className="text-center text-sm text-gray-500 mt-2">
                Point camera at patient's QR code
              </p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
              <p className="mt-2 text-gray-500">Looking up booking...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="text-center py-6">
              <XCircle className="w-12 h-12 text-red-500 mx-auto" />
              <p className="mt-2 text-red-600 font-medium">{error}</p>
              <Button onClick={resetScanner} variant="outline" className="mt-4">
                <Camera className="w-4 h-4 mr-2" />
                Scan Again
              </Button>
            </div>
          )}

          {/* Appointment Found - Ready to Check In */}
          {appointment && !loading && (
            <div className="space-y-4">
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge className="bg-teal-600 text-white">{appointment.booking_id}</Badge>
                  <Badge variant="outline" className={
                    appointment.status === 'Booked' ? 'border-blue-500 text-blue-600' :
                    appointment.status === 'In Clinic' ? 'border-green-500 text-green-600' :
                    'border-gray-500 text-gray-600'
                  }>
                    {appointment.status}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span className="font-semibold text-lg">{appointment.patient_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Building2 className="w-4 h-4" />
                    <span>{appointment.doctor}</span>
                  </div>
                  <div className="flex items-center gap-4 text-gray-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{appointment.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{appointment.time}</span>
                    </div>
                  </div>
                  {appointment.clinic && (
                    <div className="text-sm text-gray-500">{appointment.clinic}</div>
                  )}
                </div>
              </div>

              {/* Check In Button */}
              {appointment.status === 'Booked' ? (
                <Button 
                  onClick={handleCheckIn} 
                  className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-lg"
                  disabled={loading}
                  data-testid="confirm-checkin-btn"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                      Check In Patient
                    </>
                  )}
                </Button>
              ) : appointment.status === 'In Clinic' ? (
                <div className="text-center py-2">
                  <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto" />
                  <p className="text-green-600 font-medium mt-1">Already Checked In</p>
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className="text-gray-500">Status: {appointment.status}</p>
                </div>
              )}

              <Button onClick={resetScanner} variant="outline" className="w-full">
                <Camera className="w-4 h-4 mr-2" />
                Scan Another
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRScanner;

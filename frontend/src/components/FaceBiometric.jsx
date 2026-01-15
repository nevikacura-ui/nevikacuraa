import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  Camera, User, Clock, LogIn, LogOut, RefreshCw, 
  AlertCircle, CheckCircle2, Loader2, Users
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const FaceBiometric = ({ staffName = '', clinic = 'pushpa' }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  
  // Registration
  const [showRegister, setShowRegister] = useState(false);
  const [registerForm, setRegisterForm] = useState({ staff_name: staffName, staff_id: '' });
  const [registering, setRegistering] = useState(false);
  
  // Verification
  const [verifying, setVerifying] = useState(false);
  const [lastAction, setLastAction] = useState(null);
  
  // Attendance data
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [registeredStaff, setRegisteredStaff] = useState([]);

  // Fetch attendance data
  useEffect(() => {
    fetchTodayAttendance();
    fetchRegisteredStaff();
  }, [clinic]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const fetchTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`${API}/api/face-attendance/daily-report?clinic=${clinic}&date=${today}`);
      const data = await res.json();
      if (data.success) {
        setTodayAttendance(data.attendance || []);
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
    }
  };

  const fetchRegisteredStaff = async () => {
    try {
      const res = await fetch(`${API}/api/face-attendance/registered-staff?clinic=${clinic}`);
      const data = await res.json();
      if (data.success) {
        setRegisteredStaff(data.staff || []);
      }
    } catch (err) {
      console.error('Error fetching registered staff:', err);
    }
  };

  const startCamera = async () => {
    console.log('Starting camera...');
    setCameraStarting(true);
    setCameraError(null);
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const err = 'Camera API not supported on this browser';
      setCameraError(err);
      setCameraStarting(false);
      toast.error(err);
      return;
    }
    
    // Stop existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    try {
      console.log('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: false 
      });
      
      console.log('Camera stream obtained!');
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play()
            .then(() => {
              console.log('Video playing!');
              setCameraActive(true);
              setCameraStarting(false);
              toast.success('Camera started!');
            })
            .catch(e => {
              console.log('Play error:', e.message);
              setCameraActive(true);
              setCameraStarting(false);
            });
        };
      }
    } catch (err) {
      console.error('Camera error:', err.name, err.message);
      setCameraError(`${err.name}: ${err.message}`);
      setCameraStarting(false);
      toast.error(`Camera error: ${err.message}`);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraStarting(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return null;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  const handleRegister = async () => {
    if (!registerForm.staff_name.trim()) {
      toast.error('Please enter staff name');
      return;
    }
    
    const photo = capturePhoto();
    if (!photo) {
      toast.error('Could not capture photo');
      return;
    }
    
    setRegistering(true);
    
    try {
      const res = await fetch(`${API}/api/face-attendance/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_name: registerForm.staff_name,
          staff_id: registerForm.staff_id || registerForm.staff_name.toLowerCase().replace(/\s+/g, '_'),
          face_data: photo,
          clinic: clinic
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success(`${registerForm.staff_name} registered successfully!`);
        setRegisterForm({ staff_name: '', staff_id: '' });
        setShowRegister(false);
        fetchRegisteredStaff();
      } else {
        toast.error(data.error || data.detail || 'Registration failed');
      }
    } catch (err) {
      toast.error('Registration failed: ' + err.message);
    }
    
    setRegistering(false);
  };

  const handleAttendance = async (action) => {
    const photo = capturePhoto();
    if (!photo) {
      toast.error('Could not capture photo');
      return;
    }
    
    setVerifying(true);
    
    try {
      const res = await fetch(`${API}/api/face-attendance/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          face_data: photo,
          clinic: clinic,
          action: action
        })
      });
      
      const data = await res.json();
      
      if (data.verified) {
        const actionText = action === 'check_in' ? 'Checked In' : 'Checked Out';
        toast.success(`${actionText}: ${data.staff_name}`);
        setLastAction({ 
          action, 
          name: data.staff_name, 
          time: new Date().toLocaleTimeString(),
          message: data.message
        });
        fetchTodayAttendance();
      } else {
        toast.error(data.message || 'Face not recognized');
      }
    } catch (err) {
      toast.error('Verification failed: ' + err.message);
    }
    
    setVerifying(false);
  };

  return (
    <div className="space-y-4">
      {/* Main Camera Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Camera className="w-5 h-5 text-violet-600" />
            Face Attendance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Video Container */}
          <div 
            className="relative bg-black rounded-xl overflow-hidden aspect-video max-w-md mx-auto"
            onClick={() => {
              if (videoRef.current?.paused && streamRef.current) {
                videoRef.current.play();
              }
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            
            {!cameraActive && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <div className="text-center text-white p-4">
                  {cameraStarting ? (
                    <>
                      <Loader2 className="w-10 h-10 animate-spin mx-auto mb-2" />
                      <p>Starting camera...</p>
                    </>
                  ) : (
                    <>
                      <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm opacity-75">Camera preview</p>
                    </>
                  )}
                </div>
              </div>
            )}
            
            {cameraActive && (
              <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                LIVE
              </div>
            )}
          </div>

          {/* Camera Controls */}
          {!cameraActive ? (
            <Button 
              onClick={startCamera} 
              className="w-full bg-violet-600 hover:bg-violet-700"
              disabled={cameraStarting}
            >
              {cameraStarting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting...</>
              ) : (
                <><Camera className="w-4 h-4 mr-2" /> Start Camera</>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleAttendance('check_in')} 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={verifying}
                >
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4 mr-1" />}
                  Check In
                </Button>
                <Button 
                  onClick={() => handleAttendance('check_out')} 
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                  disabled={verifying}
                >
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4 mr-1" />}
                  Check Out
                </Button>
              </div>
              
              {/* Secondary Actions */}
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowRegister(!showRegister)}
                  className="flex-1"
                >
                  <User className="w-4 h-4 mr-1" />
                  {showRegister ? 'Cancel' : 'Register New'}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => { stopCamera(); setTimeout(startCamera, 300); }}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Camera Error */}
          {cameraError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Camera Error
              </p>
              <p className="text-red-600 text-sm mt-1">{cameraError}</p>
              <Button onClick={startCamera} size="sm" variant="outline" className="mt-2 text-red-600">
                Try Again
              </Button>
            </div>
          )}

          {/* Last Action */}
          {lastAction && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span className="font-medium">{lastAction.name}</span>
                <span className="text-sm">
                  {lastAction.action === 'check_in' ? 'checked in' : 'checked out'} at {lastAction.time}
                </span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registration Form */}
      {showRegister && cameraActive && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4" />
              Register New Staff
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Staff Name *"
              value={registerForm.staff_name}
              onChange={(e) => setRegisterForm(prev => ({ ...prev, staff_name: e.target.value }))}
            />
            <Input
              placeholder="Staff ID (optional)"
              value={registerForm.staff_id}
              onChange={(e) => setRegisterForm(prev => ({ ...prev, staff_id: e.target.value }))}
            />
            <Button 
              onClick={handleRegister}
              className="w-full bg-violet-600 hover:bg-violet-700"
              disabled={registering}
            >
              {registering ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Registering...</>
              ) : (
                <><Camera className="w-4 h-4 mr-2" /> Capture & Register</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Today's Attendance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Today's Attendance ({todayAttendance.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayAttendance.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No attendance records yet</p>
          ) : (
            <div className="space-y-2">
              {todayAttendance.map((record, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-sm">{record.staff_name}</span>
                  </div>
                  <div className="flex gap-3 text-xs">
                    {record.check_in && (
                      <span className="text-green-600">
                        <LogIn className="w-3 h-3 inline mr-1" />
                        {record.check_in}
                      </span>
                    )}
                    {record.check_out && (
                      <span className="text-orange-600">
                        <LogOut className="w-3 h-3 inline mr-1" />
                        {record.check_out}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registered Staff */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Registered Staff ({registeredStaff.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {registeredStaff.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No staff registered yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {registeredStaff.map((staff, idx) => (
                <span key={idx} className="px-3 py-1 bg-violet-100 text-violet-800 rounded-full text-sm">
                  {staff.staff_name}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FaceBiometric;

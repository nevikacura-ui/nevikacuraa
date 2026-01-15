import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Camera, CheckCircle2, Loader2, User, RefreshCw, AlertCircle, LogIn, LogOut } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function SimpleFaceAttendance() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [logs, setLogs] = useState([]);
  
  // Registration
  const [staffName, setStaffName] = useState('');
  const [staffId, setStaffId] = useState('');
  const [registering, setRegistering] = useState(false);
  
  // Attendance
  const [verifying, setVerifying] = useState(false);
  const [lastAction, setLastAction] = useState(null);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-20), { message, type, timestamp }]);
    console.log(`[SimpleFace] ${message}`);
  };

  const startCamera = async () => {
    addLog('Starting camera...');
    setCameraStarting(true);
    setCameraError(null);
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const err = 'Camera API not supported';
      setCameraError(err);
      setCameraStarting(false);
      addLog(err, 'error');
      return;
    }
    
    // Stop existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    try {
      addLog('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: false 
      });
      
      addLog('Camera stream obtained!', 'success');
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        videoRef.current.onloadedmetadata = () => {
          addLog('Video metadata loaded');
          videoRef.current.play()
            .then(() => {
              addLog('Video playing!', 'success');
              setCameraActive(true);
              setCameraStarting(false);
              toast.success('Camera started!');
            })
            .catch(e => {
              addLog(`Play error: ${e.message}`, 'error');
              setCameraActive(true); // Still try to show
              setCameraStarting(false);
            });
        };
      }
    } catch (err) {
      addLog(`Camera error: ${err.name} - ${err.message}`, 'error');
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
    addLog('Camera stopped');
  };

  // Capture photo and convert to base64
  const capturePhoto = () => {
    if (!videoRef.current) return null;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  };

  // Register face
  const handleRegister = async () => {
    if (!staffName.trim()) {
      toast.error('Please enter staff name');
      return;
    }
    
    const photo = capturePhoto();
    if (!photo) {
      toast.error('Could not capture photo');
      return;
    }
    
    setRegistering(true);
    addLog(`Registering ${staffName}...`);
    
    try {
      const res = await fetch(`${API}/api/face-attendance/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_name: staffName,
          staff_id: staffId || staffName.toLowerCase().replace(/\s+/g, '_'),
          face_data: photo,
          clinic: 'pushpa'
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        addLog('Registration successful!', 'success');
        toast.success(`${staffName} registered successfully!`);
        setStaffName('');
        setStaffId('');
      } else {
        addLog(`Registration failed: ${data.error}`, 'error');
        toast.error(data.error || 'Registration failed');
      }
    } catch (err) {
      addLog(`Registration error: ${err.message}`, 'error');
      toast.error('Registration failed');
    }
    
    setRegistering(false);
  };

  // Check-in or Check-out
  const handleAttendance = async (action) => {
    const photo = capturePhoto();
    if (!photo) {
      toast.error('Could not capture photo');
      return;
    }
    
    setVerifying(true);
    addLog(`Verifying for ${action}...`);
    
    try {
      const res = await fetch(`${API}/api/face-attendance/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          face_data: photo,
          clinic: 'pushpa',
          action: action
        })
      });
      
      const data = await res.json();
      
      if (data.verified) {
        addLog(`${action} successful for ${data.staff_name}!`, 'success');
        toast.success(`${action === 'check_in' ? 'Checked In' : 'Checked Out'}: ${data.staff_name}`);
        setLastAction({ action, name: data.staff_name, time: new Date().toLocaleTimeString() });
      } else {
        addLog(`Verification failed: ${data.message}`, 'error');
        toast.error(data.message || 'Face not recognized');
      }
    } catch (err) {
      addLog(`Verification error: ${err.message}`, 'error');
      toast.error('Verification failed');
    }
    
    setVerifying(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100 p-4">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl p-4 text-white">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Camera className="w-6 h-6" />
            Simple Face Attendance
          </h1>
          <p className="text-sm opacity-90">Simplified camera test with attendance</p>
        </div>

        {/* Camera Section */}
        <Card className="p-4">
          <div className="space-y-4">
            {/* Video Container */}
            <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
                onClick={() => {
                  if (videoRef.current?.paused) {
                    videoRef.current.play();
                  }
                }}
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
                        <Camera className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm opacity-75">Camera will appear here</p>
                      </>
                    )}
                  </div>
                </div>
              )}
              
              {cameraActive && (
                <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                  ● Live
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
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleAttendance('check_in')} 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={verifying}
                >
                  <LogIn className="w-4 h-4 mr-1" /> Check In
                </Button>
                <Button 
                  onClick={() => handleAttendance('check_out')} 
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                  disabled={verifying}
                >
                  <LogOut className="w-4 h-4 mr-1" /> Check Out
                </Button>
                <Button 
                  onClick={stopCamera} 
                  variant="outline"
                  size="icon"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Error Display */}
            {cameraError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Camera Error
                </p>
                <p className="text-red-600 text-sm mt-1">{cameraError}</p>
                <Button 
                  onClick={startCamera}
                  size="sm"
                  variant="outline"
                  className="mt-2 text-red-600"
                >
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
          </div>
        </Card>

        {/* Registration Section */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <User className="w-4 h-4" /> Register New Staff
          </h3>
          <div className="space-y-3">
            <Input
              placeholder="Staff Name"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
            />
            <Input
              placeholder="Staff ID (optional)"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
            />
            <Button 
              onClick={handleRegister}
              className="w-full"
              disabled={!cameraActive || registering}
            >
              {registering ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Registering...</>
              ) : (
                <><User className="w-4 h-4 mr-2" /> Register Face</>
              )}
            </Button>
          </div>
        </Card>

        {/* Debug Logs */}
        <Card className="p-4">
          <h3 className="font-semibold mb-2 text-sm">Debug Logs</h3>
          <div className="bg-gray-900 rounded-lg p-3 max-h-40 overflow-y-auto font-mono text-xs">
            {logs.map((log, i) => (
              <div key={i} className={`py-0.5 ${
                log.type === 'error' ? 'text-red-400' :
                log.type === 'success' ? 'text-green-400' :
                'text-gray-300'
              }`}>
                [{log.timestamp}] {log.message}
              </div>
            ))}
            {logs.length === 0 && (
              <div className="text-gray-500">Logs will appear here...</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

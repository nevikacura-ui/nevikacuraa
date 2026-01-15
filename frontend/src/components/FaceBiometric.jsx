import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { 
  Camera, CheckCircle2, XCircle, Loader2, User, 
  ScanFace, Clock, LogIn, LogOut, RefreshCw, AlertCircle
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function FaceBiometric({ clinic = 'pushpa', staffName = '' }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingModels, setLoadingModels] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  
  // Registration
  const [showRegister, setShowRegister] = useState(false);
  const [registerForm, setRegisterForm] = useState({ staff_name: staffName, staff_id: '' });
  const [registering, setRegistering] = useState(false);
  const [capturedDescriptor, setCapturedDescriptor] = useState(null);
  
  // Verification
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  
  // Attendance data
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [registeredStaff, setRegisteredStaff] = useState([]);

  // Load face-api.js models
  useEffect(() => {
    const loadModels = async () => {
      setLoadingModels(true);
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
        console.log('Face-api.js models loaded successfully');
      } catch (err) {
        console.error('Error loading face-api.js models:', err);
        toast.error('Failed to load face recognition models');
      }
      setLoadingModels(false);
    };
    
    loadModels();
  }, []);

  // Fetch attendance data
  useEffect(() => {
    fetchTodayAttendance();
    fetchRegisteredStaff();
  }, [clinic]);

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

  // Check and request camera permission first
  const checkCameraPermission = async () => {
    try {
      // Check if permissions API is available
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const result = await navigator.permissions.query({ name: 'camera' });
          console.log('Camera permission status:', result.state);
          return result.state;
        } catch (e) {
          // Some browsers don't support camera permission query
          console.log('Camera permission query not supported');
          return 'prompt';
        }
      }
      return 'prompt'; // Default to prompt if API not available
    } catch (err) {
      console.log('Permissions API not supported, will prompt directly');
      return 'prompt';
    }
  };

  // Start camera with better mobile handling
  const startCamera = async () => {
    console.log('=== START CAMERA CALLED ===');
    
    // Check if mediaDevices is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error('Camera not supported on this browser. Please use Chrome or Safari.');
      return;
    }
    
    try {
      // First check permission status
      const permissionStatus = await checkCameraPermission();
      console.log('Permission check result:', permissionStatus);
      
      if (permissionStatus === 'denied') {
        toast.error('Camera access is blocked. Please enable camera in your browser settings and refresh the page.', {
          duration: 5000
        });
        return;
      }

      // Stop any existing stream first
      if (streamRef.current) {
        console.log('Stopping existing stream...');
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log('Stopped track:', track.kind);
        });
        streamRef.current = null;
      }
      
      // Clear video source
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      // Small delay to ensure cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Request camera with multiple fallback constraints for better mobile compatibility
      let stream = null;
      const constraints = [
        // Try ideal settings first - front camera
        { 
          video: { 
            facingMode: 'user', 
            width: { ideal: 640, max: 1280 }, 
            height: { ideal: 480, max: 720 } 
          },
          audio: false
        },
        // Simpler front camera
        { video: { facingMode: 'user' }, audio: false },
        // Exact front camera (for some mobile browsers)
        { video: { facingMode: { exact: 'user' } }, audio: false },
        // Any front camera
        { video: { facingMode: { ideal: 'user' } }, audio: false },
        // Last resort - any camera
        { video: true, audio: false }
      ];
      
      let lastError = null;
      for (const constraint of constraints) {
        try {
          console.log('Trying camera constraint:', JSON.stringify(constraint));
          stream = await navigator.mediaDevices.getUserMedia(constraint);
          console.log('SUCCESS - Got stream with constraint:', JSON.stringify(constraint));
          console.log('Stream tracks:', stream.getTracks().map(t => ({ kind: t.kind, label: t.label, enabled: t.enabled })));
          break;
        } catch (e) {
          console.log('Constraint failed:', e.name, e.message);
          lastError = e;
          continue;
        }
      }
      
      if (!stream) {
        throw lastError || new Error('Could not access camera with any constraints');
      }
      
      // Verify we have video tracks
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0) {
        throw new Error('No video track in stream');
      }
      console.log('Video track settings:', videoTracks[0].getSettings());
      
      if (videoRef.current) {
        // Set stream to video element
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Set video attributes for mobile
        videoRef.current.setAttribute('autoplay', '');
        videoRef.current.setAttribute('playsinline', '');
        videoRef.current.setAttribute('muted', '');
        videoRef.current.muted = true;
        
        // Use a promise-based approach for loading
        await new Promise((resolve, reject) => {
          const video = videoRef.current;
          
          const handleCanPlay = () => {
            console.log('Video can play event fired');
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('error', handleError);
            resolve();
          };
          
          const handleError = (e) => {
            console.error('Video error event:', e);
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('error', handleError);
            reject(new Error('Video element error'));
          };
          
          video.addEventListener('canplay', handleCanPlay);
          video.addEventListener('error', handleError);
          
          // Also set a timeout in case events don't fire
          setTimeout(() => {
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('error', handleError);
            if (video.readyState >= 2) { // HAVE_CURRENT_DATA or more
              resolve();
            } else {
              console.log('Timeout - video readyState:', video.readyState);
              // Still try to resolve, video might work
              resolve();
            }
          }, 3000);
        });
        
        // Try to play the video
        try {
          console.log('Attempting to play video...');
          await videoRef.current.play();
          console.log('Video playing! Dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
          setCameraActive(true);
          toast.success('Camera started successfully!');
        } catch (playErr) {
          console.error('Video play error:', playErr);
          // On mobile, autoplay might be blocked - still set camera as active
          // The video might start playing on user interaction
          if (videoRef.current.readyState >= 2) {
            setCameraActive(true);
            toast.success('Camera ready - tap the video if not showing');
          } else {
            toast.error('Failed to start video. Please tap the camera area to start.');
          }
        }
      }
    } catch (err) {
      console.error('Camera error:', err.name, err.message, err);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast.error(
          'Camera permission denied. To enable: Open browser settings → Site settings → Camera → Allow for this site → Refresh page',
          { duration: 10000 }
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        toast.error('No camera found. Please ensure your device has a working camera.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        toast.error('Camera is busy. Please close other apps using the camera and try again.');
      } else if (err.name === 'OverconstrainedError') {
        toast.error('Camera settings issue. Please try again.');
      } else if (err.name === 'SecurityError') {
        toast.error('Camera blocked. Please use HTTPS and grant camera permission.');
      } else if (err.name === 'AbortError') {
        toast.error('Camera request was aborted. Please try again.');
      } else {
        toast.error('Camera error: ' + (err.message || 'Unknown error'));
      }
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setFaceDetected(false);
  };

  // Real-time face detection
  const detectFace = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !modelsLoaded || !cameraActive) return null;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Wait for video to have valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('Video not ready yet, waiting...');
      return null;
    }
    
    try {
      const displaySize = { width: video.videoWidth, height: video.videoHeight };
      faceapi.matchDimensions(canvas, displaySize);
      
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();
      
      // Clear canvas
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (detection) {
        setFaceDetected(true);
        
        // Draw face box
        const resizedDetection = faceapi.resizeResults(detection, displaySize);
        
        // Draw green box around face
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3;
        const box = resizedDetection.detection.box;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        
        // Draw landmarks
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetection);
        
        return detection.descriptor;
      } else {
        setFaceDetected(false);
        return null;
      }
    } catch (err) {
      console.error('Face detection error:', err);
      setFaceDetected(false);
      return null;
    }
  }, [modelsLoaded, cameraActive]);

  // Continuous face detection loop
  useEffect(() => {
    let animationId;
    
    const detectLoop = async () => {
      if (cameraActive && modelsLoaded && !detecting && !verifying && !registering) {
        await detectFace();
      }
      animationId = requestAnimationFrame(detectLoop);
    };
    
    if (cameraActive && modelsLoaded) {
      detectLoop();
    }
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [cameraActive, modelsLoaded, detecting, verifying, registering, detectFace]);

  // Capture face for registration
  const captureFaceForRegistration = async () => {
    if (!faceDetected) {
      toast.error('No face detected. Please position your face in the frame.');
      return;
    }
    
    setDetecting(true);
    try {
      const descriptor = await detectFace();
      if (descriptor) {
        const descriptorArray = Array.from(descriptor);
        console.log('Face descriptor captured:', descriptorArray.length, 'values');
        if (descriptorArray.length !== 128) {
          toast.error(`Invalid face descriptor: expected 128 values, got ${descriptorArray.length}`);
          setDetecting(false);
          return;
        }
        setCapturedDescriptor(descriptorArray);
        toast.success('Face captured! Click "Register" to save.');
      } else {
        toast.error('Could not capture face. Try again.');
      }
    } catch (err) {
      console.error('Face capture error:', err);
      toast.error('Error capturing face: ' + err.message);
    }
    setDetecting(false);
  };

  // Register face
  const handleRegister = async () => {
    if (!registerForm.staff_name || !registerForm.staff_id) {
      toast.error('Please fill in staff name and ID');
      return;
    }
    if (!capturedDescriptor) {
      toast.error('Please capture your face first');
      return;
    }
    if (capturedDescriptor.length !== 128) {
      toast.error(`Invalid face data. Please capture face again. (Got ${capturedDescriptor.length} values, expected 128)`);
      setCapturedDescriptor(null);
      return;
    }
    
    setRegistering(true);
    try {
      console.log('Registering face with descriptor length:', capturedDescriptor.length);
      const res = await fetch(`${API}/api/face-attendance/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: registerForm.staff_id,
          staff_name: registerForm.staff_name,
          clinic: clinic,
          face_descriptor: capturedDescriptor,
        })
      });
      
      const data = await res.json();
      console.log('Registration response:', data);
      
      if (data.success) {
        toast.success(`Face registered for ${registerForm.staff_name}!`);
        setShowRegister(false);
        setCapturedDescriptor(null);
        setRegisterForm({ staff_name: '', staff_id: '' });
        stopCamera();
        fetchRegisteredStaff();
      } else {
        toast.error(data.detail || data.message || 'Registration failed');
      }
    } catch (err) {
      console.error('Registration error:', err);
      toast.error('Registration failed: ' + err.message);
    }
    setRegistering(false);
  };

  // Verify face for check-in/check-out
  const handleVerification = async (type = 'check_in') => {
    if (!faceDetected) {
      toast.error('No face detected. Please position your face in the frame.');
      return;
    }
    
    setVerifying(true);
    setVerificationResult(null);
    
    try {
      const descriptor = await detectFace();
      if (!descriptor) {
        toast.error('Could not detect face. Try again.');
        setVerifying(false);
        return;
      }
      
      const res = await fetch(`${API}/api/face-attendance/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          face_descriptor: Array.from(descriptor),
          clinic: clinic,
          action_type: type,
        })
      });
      
      const data = await res.json();
      
      if (data.verified) {
        setVerificationResult({
          success: true,
          staff_name: data.staff_name,
          message: data.message,
          confidence: data.confidence,
        });
        toast.success(data.message);
        fetchTodayAttendance();
      } else {
        setVerificationResult({
          success: false,
          message: data.message || 'Face not recognized',
        });
        toast.error(data.message || 'Face not recognized');
      }
    } catch (err) {
      toast.error('Verification failed');
      setVerificationResult({ success: false, message: 'Verification error' });
    }
    setVerifying(false);
  };

  // Clinic display names
  const clinicNames = {
    'pushpa': 'Pushpa Clinic',
    'amnion': 'Amnion Clinic',
    'pharmacy': 'Orange Pharmacy'
  };

  if (loadingModels) {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-violet-600" />
          <p className="text-lg font-medium">Loading Face Recognition...</p>
          <p className="text-sm text-gray-500">Downloading AI models (first time only)</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`bg-gradient-to-r rounded-xl p-4 text-white ${
        clinic === 'pharmacy' ? 'from-orange-500 to-orange-600' : 
        clinic === 'pushpa' ? 'from-violet-600 to-purple-600' : 
        'from-blue-600 to-indigo-600'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ScanFace className="w-8 h-8" />
            <div>
              <h2 className="text-xl font-bold">Face Recognition Attendance</h2>
              <p className="text-sm opacity-90">{clinicNames[clinic] || clinic}</p>
            </div>
          </div>
          <Button 
            onClick={() => { setShowRegister(true); startCamera(); }} 
            className="bg-white text-gray-800 hover:bg-gray-100"
            size="sm"
          >
            <User className="w-4 h-4 mr-1" /> Register Staff
          </Button>
        </div>
      </div>

      {/* Camera View for Check-in/out */}
      {!showRegister && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Quick Check-in / Check-out
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!cameraActive ? (
              <div className="text-center py-8">
                <ScanFace className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-4">Start camera for face verification</p>
                <Button onClick={startCamera} className="bg-violet-600 hover:bg-violet-700">
                  <Camera className="w-4 h-4 mr-2" /> Start Camera
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Video Feed */}
                <div 
                  className="relative bg-black rounded-xl overflow-hidden aspect-video max-w-md mx-auto cursor-pointer"
                  onClick={() => {
                    // Fallback for mobile - tap to play
                    if (videoRef.current && videoRef.current.paused) {
                      videoRef.current.play().catch(e => console.log('Tap play error:', e));
                    }
                  }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    webkit-playsinline="true"
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                  
                  {/* Loading indicator when camera not ready */}
                  {!cameraActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                      <div className="text-center text-white">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                        <p className="text-sm">Starting camera...</p>
                        <p className="text-xs text-gray-400 mt-1">Tap here if camera doesn't start</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Face detection indicator */}
                  <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-sm font-medium ${
                    faceDetected ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                  }`}>
                    {faceDetected ? '✓ Face Detected' : '✗ No Face'}
                  </div>
                </div>

                {/* Verification Result */}
                {verificationResult && (
                  <div className={`p-4 rounded-xl ${
                    verificationResult.success 
                      ? 'bg-green-50 border-2 border-green-400' 
                      : 'bg-red-50 border-2 border-red-400'
                  }`}>
                    <div className="flex items-center gap-3">
                      {verificationResult.success ? (
                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                      ) : (
                        <XCircle className="w-10 h-10 text-red-600" />
                      )}
                      <div>
                        <p className={`font-bold text-lg ${verificationResult.success ? 'text-green-800' : 'text-red-800'}`}>
                          {verificationResult.success ? `Welcome, ${verificationResult.staff_name}!` : 'Not Recognized'}
                        </p>
                        <p className={`text-sm ${verificationResult.success ? 'text-green-600' : 'text-red-600'}`}>
                          {verificationResult.message}
                        </p>
                        {verificationResult.confidence && (
                          <p className="text-xs text-gray-500 mt-1">
                            Confidence: {verificationResult.confidence.toFixed(1)}%
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 justify-center">
                  <Button 
                    onClick={() => handleVerification('check_in')} 
                    disabled={verifying || !faceDetected}
                    className="bg-green-600 hover:bg-green-700 flex-1 max-w-[150px]"
                  >
                    {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
                    Check In
                  </Button>
                  <Button 
                    onClick={() => handleVerification('check_out')} 
                    disabled={verifying || !faceDetected}
                    className="bg-orange-600 hover:bg-orange-700 flex-1 max-w-[150px]"
                  >
                    {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LogOut className="w-4 h-4 mr-2" />}
                    Check Out
                  </Button>
                  <Button 
                    onClick={stopCamera} 
                    variant="outline"
                    className="flex-1 max-w-[100px]"
                  >
                    Stop
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Registration Form */}
      {showRegister && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center justify-between">
              <span className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Register Staff Face
              </span>
              <Button variant="ghost" size="sm" onClick={() => { setShowRegister(false); stopCamera(); setCapturedDescriptor(null); }}>
                ✕
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Staff Name</Label>
                <Input
                  value={registerForm.staff_name}
                  onChange={(e) => setRegisterForm({ ...registerForm, staff_name: e.target.value })}
                  placeholder="e.g., Dr. Neha"
                />
              </div>
              <div>
                <Label>Staff ID</Label>
                <Input
                  value={registerForm.staff_id}
                  onChange={(e) => setRegisterForm({ ...registerForm, staff_id: e.target.value })}
                  placeholder="e.g., staff_001"
                />
              </div>
            </div>

            {/* Camera for Registration */}
            {cameraActive && (
              <div className="space-y-3">
                <div className="relative bg-black rounded-xl overflow-hidden aspect-video max-w-sm mx-auto">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute top-0 left-0 w-full h-full"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                  <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${
                    faceDetected ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                  }`}>
                    {faceDetected ? '✓ Face OK' : '✗ No Face'}
                  </div>
                </div>

                {capturedDescriptor ? (
                  <div className="bg-green-50 border border-green-300 rounded-lg p-3 text-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-green-800 font-medium">Face Captured Successfully!</p>
                    <p className="text-xs text-green-600">Click Register to save</p>
                  </div>
                ) : (
                  <p className="text-center text-sm text-gray-500">
                    Position your face in the frame and click Capture
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              {!capturedDescriptor ? (
                <Button 
                  onClick={captureFaceForRegistration} 
                  disabled={!cameraActive || detecting || !faceDetected}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {detecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Camera className="w-4 h-4 mr-2" />}
                  Capture Face
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={() => setCapturedDescriptor(null)} 
                    variant="outline"
                    className="flex-1"
                  >
                    Retake
                  </Button>
                  <Button 
                    onClick={handleRegister} 
                    disabled={registering}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {registering ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                    Register
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Attendance */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Today&apos;s Attendance
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={fetchTodayAttendance}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {todayAttendance.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No attendance records today</p>
          ) : (
            <div className="space-y-2">
              {todayAttendance.map((record, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-violet-600" />
                    </div>
                    <div>
                      <p className="font-medium">{record.staff_name}</p>
                      <p className="text-xs text-gray-500">{record.staff_id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={record.check_out ? 'bg-gray-500' : 'bg-green-500'}>
                      {record.check_out ? 'Completed' : 'Present'}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      In: {record.check_in} {record.check_out && `| Out: ${record.check_out}`}
                    </p>
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
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5" />
            Registered Staff ({registeredStaff.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {registeredStaff.length === 0 ? (
            <div className="text-center py-4">
              <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No staff registered yet</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => { setShowRegister(true); startCamera(); }}
              >
                Register First Staff
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {registeredStaff.map((staff, idx) => (
                <Badge key={idx} variant="secondary" className="py-1 px-3">
                  <User className="w-3 h-3 mr-1" />
                  {staff.staff_name}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Generate unique device ID
const getDeviceId = () => {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
};

// Get device name
const getDeviceName = () => {
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Android/i.test(ua)) return 'Android Device';
  if (/Mac/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua)) return 'Windows PC';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Unknown Device';
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [patientToken, setPatientToken] = useState(localStorage.getItem('patientToken'));
  const [loading, setLoading] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    // First check for staff/admin token
    if (token) {
      fetchUser();
    } 
    // Then check for patient token
    else if (patientToken) {
      fetchPatientUser();
    }
    else {
      setLoading(false);
    }
    // Check biometric availability
    checkBiometricAvailability();
  }, [token, patientToken]);

  // Fetch patient user from patient portal API
  const fetchPatientUser = async () => {
    try {
      const response = await axios.get(`${API}/patients/portal/me`, {
        headers: { Authorization: `Bearer ${patientToken}` }
      });
      // Convert patient data to user format
      setUser({
        id: response.data.patient_id,
        name: response.data.name,
        email: response.data.email,
        phone: response.data.mobile,
        role: 'patient',
        patient_id: response.data.patient_id,
        ...response.data
      });
    } catch (error) {
      console.error('Failed to fetch patient user:', error);
      // Clear invalid patient token
      localStorage.removeItem('patientToken');
      setPatientToken(null);
    } finally {
      setLoading(false);
    }
  };

  // Set patient token (called from patient portal login)
  const setPatientAuth = (newToken, patientData) => {
    setPatientToken(newToken);
    localStorage.setItem('patientToken', newToken);
    setUser({
      id: patientData.patient_id,
      name: patientData.name,
      email: patientData.email,
      phone: patientData.mobile,
      role: 'patient',
      patient_id: patientData.patient_id,
      ...patientData
    });
  };

  const checkBiometricAvailability = async () => {
    // Check if Web Authentication API is available (for browsers)
    if (window.PublicKeyCredential) {
      try {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setBiometricAvailable(available);
      } catch (e) {
        setBiometricAvailable(false);
      }
    }
    // For Capacitor mobile apps, check native biometric
    if (window.Capacitor?.isNativePlatform()) {
      setBiometricAvailable(true);
    }
  };

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
      // Check if biometric is enabled for this user
      if (biometricAvailable) {
        checkBiometricStatus();
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const checkBiometricStatus = async () => {
    try {
      const response = await axios.get(`${API}/auth/biometric/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBiometricEnabled(response.data.biometric_enabled);
    } catch (e) {
      setBiometricEnabled(false);
    }
  };

  // Legacy login (password-based)
  const login = async (email, password, rememberMe = true) => {
    const response = await axios.post(`${API}/auth/login/remember`, { 
      email, 
      password,
      remember_me: rememberMe,
      device_id: getDeviceId(),
      device_name: getDeviceName()
    });
    setToken(response.data.token);
    setUser(response.data.user);
    localStorage.setItem('token', response.data.token);
    if (rememberMe) {
      localStorage.setItem('remember_me', 'true');
    }
    return response.data;
  };

  // Legacy register (password-based)
  const register = async (email, password, phone, name) => {
    const response = await axios.post(`${API}/auth/register`, { email, password, phone, name });
    setToken(response.data.token);
    setUser(response.data.user);
    localStorage.setItem('token', response.data.token);
    return response.data;
  };

  // OTP-based auth methods
  const sendAuthOtp = async (phone) => {
    const response = await axios.post(`${API}/auth/otp/send`, { phone });
    return response.data;
  };

  const verifyAuthOtp = async (phone, otp) => {
    const response = await axios.post(`${API}/auth/otp/verify`, { phone, otp });
    return response.data;
  };

  const loginWithOtp = async (phone, otp) => {
    const response = await axios.post(`${API}/auth/login/otp`, { phone, otp });
    setToken(response.data.token);
    setUser(response.data.user);
    localStorage.setItem('token', response.data.token);
    return response.data;
  };

  const registerWithOtp = async (phone, otp, email, password, name, verification_token = '') => {
    const response = await axios.post(`${API}/auth/register/otp`, { 
      phone, otp, email, password, name, verification_token 
    });
    setToken(response.data.token);
    setUser(response.data.user);
    localStorage.setItem('token', response.data.token);
    return response.data;
  };

  // Email OTP authentication methods
  const sendEmailOtp = async (email) => {
    const response = await axios.post(`${API}/auth/email-otp/send`, { email: email.toLowerCase() });
    return response.data;
  };

  const verifyEmailOtp = async (email, otp) => {
    const response = await axios.post(`${API}/auth/email-otp/verify`, { email: email.toLowerCase(), otp });
    return response.data;
  };

  const loginWithEmailOtp = async (email, verification_token) => {
    const response = await axios.post(`${API}/auth/email-otp/login`, { 
      email: email.toLowerCase(), 
      verification_token 
    });
    setToken(response.data.token);
    setUser(response.data.user);
    localStorage.setItem('token', response.data.token);
    return response.data;
  };

  const registerWithEmailOtp = async (email, verification_token, name, phone = '', password) => {
    const response = await axios.post(`${API}/auth/register`, { 
      email: email.toLowerCase(),
      verification_token,
      name,
      phone,
      password
    });
    setToken(response.data.token);
    setUser(response.data.user);
    localStorage.setItem('token', response.data.token);
    return response.data;
  };

  // Biometric authentication
  const registerBiometric = async () => {
    if (!token) throw new Error('Must be logged in to register biometric');
    
    const deviceId = getDeviceId();
    const deviceName = getDeviceName();
    
    // For web, use WebAuthn
    if (window.PublicKeyCredential) {
      try {
        // Create credential
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        
        const credential = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: 'Nevika Cura', id: window.location.hostname },
            user: {
              id: new TextEncoder().encode(user.id),
              name: user.email,
              displayName: user.name
            },
            pubKeyCredParams: [
              { alg: -7, type: 'public-key' },  // ES256
              { alg: -257, type: 'public-key' } // RS256
            ],
            authenticatorSelection: {
              authenticatorAttachment: 'platform',
              userVerification: 'required'
            },
            timeout: 60000
          }
        });
        
        // Register with backend
        const response = await axios.post(`${API}/auth/biometric/register`, {
          credential_id: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
          public_key: btoa(String.fromCharCode(...new Uint8Array(credential.response.getPublicKey()))),
          device_id: deviceId,
          device_name: deviceName
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setBiometricEnabled(true);
        return response.data;
      } catch (e) {
        console.error('Biometric registration failed:', e);
        throw e;
      }
    }
    
    throw new Error('Biometric not supported on this device');
  };

  const loginWithBiometric = async () => {
    const deviceId = getDeviceId();
    
    if (window.PublicKeyCredential) {
      try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        
        const credential = await navigator.credentials.get({
          publicKey: {
            challenge,
            rpId: window.location.hostname,
            userVerification: 'required',
            timeout: 60000
          }
        });
        
        const response = await axios.post(`${API}/auth/biometric/login`, {
          credential_id: btoa(String.fromCharCode(...new Uint8Array(credential.rawId))),
          signature: btoa(String.fromCharCode(...new Uint8Array(credential.response.signature))),
          device_id: deviceId
        });
        
        setToken(response.data.token);
        setUser(response.data.user);
        localStorage.setItem('token', response.data.token);
        
        return response.data;
      } catch (e) {
        console.error('Biometric login failed:', e);
        throw e;
      }
    }
    
    throw new Error('Biometric not supported');
  };

  const removeBiometric = async (credentialId) => {
    const response = await axios.delete(`${API}/auth/biometric/${credentialId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    await checkBiometricStatus();
    return response.data;
  };

  const logout = () => {
    setToken(null);
    setPatientToken(null);
    setUser(null);
    setBiometricEnabled(false);
    localStorage.removeItem('token');
    localStorage.removeItem('patientToken');
    localStorage.removeItem('remember_me');
  };
  
  // Google OAuth login
  const loginWithGoogle = () => {
    const redirectUrl = window.location.origin + '/auth/callback';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };
  
  // Process Google OAuth callback
  const processGoogleCallback = async (sessionId) => {
    try {
      const response = await axios.get('https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data', {
        headers: { 'X-Session-ID': sessionId }
      });
      
      const googleUser = response.data;
      
      const backendResponse = await axios.post(`${API}/auth/google`, {
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
        google_id: googleUser.id,
        session_token: googleUser.session_token
      });
      
      setToken(backendResponse.data.token);
      setUser(backendResponse.data.user);
      localStorage.setItem('token', backendResponse.data.token);
      
      return backendResponse.data;
    } catch (error) {
      console.error('Google login failed:', error);
      throw error;
    }
  };
  
  // Get trusted devices
  const getTrustedDevices = async () => {
    const response = await axios.get(`${API}/auth/trusted-devices`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.devices;
  };

  const removeTrustedDevice = async (deviceId) => {
    const response = await axios.delete(`${API}/auth/trusted-devices/${deviceId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  };
  
  const refreshUser = token ? fetchUser : patientToken ? fetchPatientUser : () => {};

  return (
    <AuthContext.Provider value={{ 
      user, token, patientToken, loading, 
      biometricAvailable, biometricEnabled,
      login, register, logout,
      sendAuthOtp, verifyAuthOtp, loginWithOtp, registerWithOtp,
      setPatientAuth, // New: for patient portal login sync
      fetchUser: refreshUser,
      registerBiometric, loginWithBiometric, removeBiometric,
      getTrustedDevices, removeTrustedDevice
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
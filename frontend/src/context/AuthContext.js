import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  // Legacy login (password-based)
  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    setToken(response.data.token);
    setUser(response.data.user);
    localStorage.setItem('token', response.data.token);
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

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };
  
  // Google OAuth login
  const loginWithGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/auth/callback';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };
  
  // Process Google OAuth callback
  const processGoogleCallback = async (sessionId) => {
    try {
      // Exchange session_id for user data
      const response = await axios.get('https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data', {
        headers: { 'X-Session-ID': sessionId }
      });
      
      const googleUser = response.data;
      
      // Register/login user in our backend
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
  
  // Expose fetchUser for external use
  const refreshUser = fetchUser;

  return (
    <AuthContext.Provider value={{ 
      user, token, loading, 
      login, register, logout,
      sendAuthOtp, verifyAuthOtp, loginWithOtp, registerWithOtp,
      loginWithGoogle, processGoogleCallback, fetchUser: refreshUser
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
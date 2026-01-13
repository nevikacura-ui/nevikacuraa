import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { fetchUser } = useAuth();
  const hasProcessed = useRef(false);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      try {
        // Extract session_id from URL hash
        const hash = location.hash;
        console.log('Auth callback hash:', hash);
        
        const sessionIdMatch = hash.match(/session_id=([^&]+)/);
        
        if (!sessionIdMatch) {
          setError('No session ID found in callback. Please try again.');
          setProcessing(false);
          return;
        }

        const sessionId = sessionIdMatch[1];
        console.log('Session ID:', sessionId);
        
        // Exchange session_id for user data from Emergent Auth
        const authResponse = await axios.get('https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data', {
          headers: { 'X-Session-ID': sessionId }
        });
        
        console.log('Emergent Auth response:', authResponse.data);
        
        const googleUser = authResponse.data;
        
        if (!googleUser || !googleUser.email) {
          setError('Failed to get user data from Google. Please try again.');
          setProcessing(false);
          return;
        }
        
        // Register/login user in our backend
        const backendResponse = await axios.post(`${API}/auth/google`, {
          email: googleUser.email,
          name: googleUser.name || googleUser.email.split('@')[0],
          picture: googleUser.picture,
          google_id: googleUser.id,
          session_token: googleUser.session_token
        });
        
        if (backendResponse.data.token) {
          localStorage.setItem('token', backendResponse.data.token);
          
          // Fetch user to update context
          if (fetchUser) {
            await fetchUser();
          }
          
          toast.success('Logged in with Google successfully!');
          
          // Clear the hash and redirect to home
          window.history.replaceState(null, '', '/');
          navigate('/', { replace: true });
        } else {
          setError('Login failed. Please try again.');
          setProcessing(false);
        }
        
      } catch (error) {
        console.error('Auth callback error:', error);
        setError(error.response?.data?.detail || error.message || 'Google login failed. Please try again.');
        setProcessing(false);
      }
    };

    processAuth();
  }, [location.hash, fetchUser, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-red-50 to-white">
        <div className="text-center max-w-md p-6">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Login Failed</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <Button 
              onClick={() => navigate('/')}
              className="w-full"
            >
              Back to Home
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                // Try Google login again
                const redirectUrl = window.location.origin + '/auth/callback';
                window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
              }}
              className="w-full"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-teal-50 to-white">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-teal-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Completing Sign In...</h2>
        <p className="text-gray-500">Please wait while we verify your account</p>
      </div>
    </div>
  );
};

export default AuthCallback;

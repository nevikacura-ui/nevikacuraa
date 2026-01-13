import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { processGoogleCallback } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      try {
        // Extract session_id from URL hash
        const hash = location.hash;
        const sessionIdMatch = hash.match(/session_id=([^&]+)/);
        
        if (!sessionIdMatch) {
          toast.error('Invalid authentication response');
          navigate('/');
          return;
        }

        const sessionId = sessionIdMatch[1];
        
        // Process the Google OAuth callback
        await processGoogleCallback(sessionId);
        
        toast.success('Logged in with Google successfully!');
        
        // Clear the hash and redirect to home
        window.history.replaceState(null, '', window.location.pathname);
        navigate('/', { replace: true });
        
      } catch (error) {
        console.error('Auth callback error:', error);
        toast.error('Google login failed. Please try again.');
        navigate('/');
      }
    };

    processAuth();
  }, [location.hash, processGoogleCallback, navigate]);

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

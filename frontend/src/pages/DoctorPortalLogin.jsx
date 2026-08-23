import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';
import { User, Lock, Loader2, Eye, EyeOff, Stethoscope } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const DoctorPortalLogin = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('doctorToken') || localStorage.getItem('staffToken');
    const storedDoctor = localStorage.getItem('doctorInfo') || localStorage.getItem('staffInfo');
    const expiry = localStorage.getItem('doctorLoginExpiry');
    
    // Check if token is expired
    if (expiry && new Date().getTime() > parseInt(expiry)) {
      localStorage.removeItem('doctorToken');
      localStorage.removeItem('doctorInfo');
      localStorage.removeItem('doctorLoginExpiry');
      setCheckingAuth(false);
      return;
    }
    
    if (token && storedDoctor) {
      try {
        const doctor = JSON.parse(storedDoctor);
        if (doctor.role?.toLowerCase() === 'doctor') {
          navigate('/doctor-portal', { replace: true });
          return;
        }
      } catch (e) {
        // Invalid JSON, clear storage
        localStorage.removeItem('doctorToken');
        localStorage.removeItem('doctorInfo');
      }
    }
    setCheckingAuth(false);
  }, [navigate]);

  const handleLogin = async () => {
    if (!username || !password) {
      toast.error('Enter username and password');
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/staff/login`, { username, password });
      const { token, staff } = res.data;
      
      // Only allow doctor role on this portal
      if (staff.role && !staff.role.toLowerCase().includes('doctor')) {
        toast.error('This is the Doctor Portal. Please use the Staff Portal for staff login.');
        setLoading(false);
        return;
      }
      
      localStorage.setItem('doctorToken', token);
      localStorage.setItem('staffToken', token);
      localStorage.setItem('doctorInfo', JSON.stringify(staff));
      localStorage.setItem('staffInfo', JSON.stringify(staff));
      // Set 30-day login expiry for persistent doctor sessions
      localStorage.setItem('staffLoginExpiry', (Date.now() + 30 * 24 * 60 * 60 * 1000).toString());
      
      // Avoid "Dr. Dr." duplication
      const displayName = staff.name?.startsWith('Dr.') ? staff.name : `Dr. ${staff.name}`;
      toast.success(`Welcome, ${displayName}!`);
      navigate('/doctor-portal', { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed. Check credentials.');
    }
    setLoading(false);
  };

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#FAFAF8' }}>
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 50%, #DDD6FE 100%)' }}>
      <div className="relative w-full max-w-md">
        <div className="relative bg-white rounded-3xl p-8 shadow-xl border border-violet-100">
          <div className="relative z-10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/30" style={{ animation: 'stethoscope-pulse 2s ease-in-out infinite' }}>
                <Stethoscope className="w-7 h-7 text-white" />
              </div>
              <style>{`@keyframes stethoscope-pulse { 0%,100% { transform: scale(1); box-shadow: 0 10px 15px -3px rgba(139,92,246,0.3); } 50% { transform: scale(1.05); box-shadow: 0 10px 20px -3px rgba(139,92,246,0.45); } }`}</style>
              <h1 className="text-3xl font-semibold text-gray-800 mb-2 tracking-tight">
                Welcome, Doctor
              </h1>
              <p className="text-gray-500 text-sm leading-relaxed max-w-xs mx-auto">
                Sign in to manage your patients, appointments, and clinical records.
              </p>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-violet-400" />
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full h-14 bg-gray-50 border-gray-200 rounded-2xl text-gray-800 placeholder:text-gray-400 pl-12 pr-4 focus:border-violet-400 focus:ring-violet-200"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  data-testid="doctor-portal-username"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-violet-400" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full h-14 bg-gray-50 border-gray-200 rounded-2xl text-gray-800 placeholder:text-gray-400 pl-12 pr-12 focus:border-violet-400 focus:ring-violet-200"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  data-testid="doctor-portal-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-violet-400 hover:text-violet-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full h-14 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 rounded-2xl text-white font-semibold text-lg transition-all disabled:opacity-50 shadow-lg shadow-violet-500/25 mt-2"
                data-testid="doctor-portal-login-btn"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Log in'}
              </button>
            </div>

            <p className="text-center text-sm text-gray-500 mt-8">
              Not a doctor?{' '}
              <button 
                onClick={() => navigate('/login')}
                className="text-violet-500 font-medium hover:text-violet-700 transition-colors"
              >
                Patient Login
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorPortalLogin;

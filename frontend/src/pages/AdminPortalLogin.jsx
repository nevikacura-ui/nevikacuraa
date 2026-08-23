import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';
import { User, Lock, Loader2, Eye, EyeOff, Shield } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const AdminPortalLogin = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('staffToken');
    const storedAdmin = localStorage.getItem('staffInfo');
    if (token && storedAdmin) {
      const admin = JSON.parse(storedAdmin);
      const role = admin.role?.toLowerCase() || '';
      if (role === 'admin' || role === 'super_admin') {
        navigate('/admin');
      }
    }
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
      
      localStorage.setItem('staffToken', token);
      localStorage.setItem('staffInfo', JSON.stringify(staff));
      // Set 30-day login expiry for persistent admin sessions
      localStorage.setItem('staffLoginExpiry', (Date.now() + 30 * 24 * 60 * 60 * 1000).toString());
      
      toast.success(`Welcome, ${staff.name}!`);
      navigate('/admin');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed. Check credentials.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#050510] flex items-center justify-center p-4">
      {/* Glassmorphism Card */}
      <div className="relative w-full max-w-md">
        {/* Purple glow effect at bottom */}
        <div className="absolute left-1/4 -bottom-8 w-40 h-40 bg-violet-500/20 rounded-full blur-3xl" />
        <div className="absolute right-1/4 -bottom-4 w-32 h-32 bg-purple-400/15 rounded-full blur-2xl" />
        
        {/* Main Card */}
        <div className="relative backdrop-blur-xl bg-gradient-to-b from-white/10 via-white/5 to-white/[0.02] border border-white/10 rounded-3xl p-8 shadow-2xl">
          {/* Subtle top highlight */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          
          <div className="relative z-10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/30">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-3xl font-semibold text-white mb-2 tracking-tight">
                Welcome back
              </h1>
              <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">
                Log in to your admin account and seamlessly continue managing the platform, users, and system settings.
              </p>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* Username Input */}
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="w-full h-14 bg-[#1a1a1a]/60 border-white/10 rounded-2xl text-white placeholder:text-gray-500 pl-12 pr-4 focus:border-violet-500/50 focus:ring-violet-500/20"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  data-testid="admin-portal-username"
                />
              </div>

              {/* Password Input */}
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full h-14 bg-[#1a1a1a]/60 border-white/10 rounded-2xl text-white placeholder:text-gray-500 pl-12 pr-12 focus:border-violet-500/50 focus:ring-violet-500/20"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  data-testid="admin-portal-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Login Button */}
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full h-14 bg-[#2a2a2a] hover:bg-[#333] border border-white/5 rounded-2xl text-white font-semibold text-lg transition-all disabled:opacity-50 shadow-lg mt-2"
                data-testid="admin-portal-login-btn"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Log in'}
              </button>
            </div>

            {/* Back Link */}
            <p className="text-center text-sm text-gray-500 mt-8">
              Not an administrator?{' '}
              <button 
                onClick={() => navigate('/')}
                className="text-violet-400 font-medium hover:text-violet-300 transition-colors"
              >
                Go to Home
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPortalLogin;

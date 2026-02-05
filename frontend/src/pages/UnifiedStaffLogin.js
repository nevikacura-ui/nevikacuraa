import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';
import { User, Lock, Loader2, ArrowLeft, Stethoscope, Pill, FlaskConical, Building2 } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

// Portal configurations based on staff role
const PORTAL_CONFIG = {
  pharmacy_staff: {
    path: '/orange-staff',
    name: 'Orange Pharmacy',
    icon: Pill,
    color: '#f97316'
  },
  lab_staff: {
    path: '/mango-staff',
    name: 'Mango Health Labs',
    icon: FlaskConical,
    color: '#facc15'
  },
  diagnostics_staff: {
    path: '/mango-staff',
    name: 'Mango Health Labs',
    icon: FlaskConical,
    color: '#facc15'
  },
  diagyn_staff: {
    path: '/diagyn-staff',
    name: 'DiaGyn Clinic',
    icon: Stethoscope,
    color: '#1a4d3f'
  },
  clinic_staff_pushpa: {
    path: '/diagyn-staff',
    name: 'Pushpa Clinic',
    icon: Building2,
    color: '#1a4d3f'
  },
  clinic_staff_amnion: {
    path: '/diagyn-staff',
    name: 'Amnion Clinic',
    icon: Building2,
    color: '#1a4d3f'
  },
  doctor: {
    path: '/doctor-portal',
    name: 'Doctor Portal',
    icon: Stethoscope,
    color: '#2563eb'
  },
  admin: {
    path: '/admin',
    name: 'Admin Portal',
    icon: Building2,
    color: '#7c3aed'
  },
  super_admin: {
    path: '/admin',
    name: 'Admin Portal',
    icon: Building2,
    color: '#7c3aed'
  }
};

const UnifiedStaffLogin = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Check existing auth
  useEffect(() => {
    const token = localStorage.getItem('staffToken');
    const storedStaff = localStorage.getItem('staffInfo');
    if (token && storedStaff) {
      const staff = JSON.parse(storedStaff);
      const portal = PORTAL_CONFIG[staff.role];
      if (portal) {
        navigate(portal.path);
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
      
      // Store credentials
      localStorage.setItem('staffToken', token);
      localStorage.setItem('staffInfo', JSON.stringify(staff));
      
      // Get portal configuration based on role
      const portal = PORTAL_CONFIG[staff.role];
      
      if (portal) {
        toast.success(`Welcome to ${portal.name}!`);
        navigate(portal.path);
      } else {
        // Default to diagyn-staff for unknown roles
        toast.success(`Welcome, ${staff.name}!`);
        navigate('/diagyn-staff');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed. Check credentials.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" 
         style={{ background: 'linear-gradient(135deg, #1a4d3f 0%, #0f3129 100%)' }}>
      <Card className="w-full max-w-sm p-6 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
               style={{ background: '#1a4d3f' }}>
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold" style={{ color: '#1a4d3f' }}>Nevika Cura</h1>
          <p className="text-sm text-gray-500">Staff Portal Login</p>
        </div>
        
        <div className="space-y-3">
          <div className="relative">
            <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <Input 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Staff Username" 
              className="pl-10 h-11" 
              data-testid="staff-username" 
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <Input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password" 
              className="pl-10 h-11" 
              data-testid="staff-password"
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()} 
            />
          </div>
          <Button 
            onClick={handleLogin} 
            disabled={loading}
            className="w-full h-12 text-base font-bold" 
            data-testid="staff-login-btn"
            style={{ background: '#7ed957' }}
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'LOGIN'}
          </Button>
        </div>
        
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')} 
          className="w-full mt-4 text-gray-500"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
        </Button>
        
        {/* Staff Portal Info */}
        <div className="mt-6 pt-4 border-t">
          <p className="text-xs text-gray-400 text-center mb-3">Available Staff Portals</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center p-2 rounded-lg bg-orange-50">
              <Pill className="w-5 h-5 text-orange-500 mb-1" />
              <span className="text-xs text-orange-600">Pharmacy</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-yellow-50">
              <FlaskConical className="w-5 h-5 text-yellow-600 mb-1" />
              <span className="text-xs text-yellow-700">Labs</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-lg bg-teal-50">
              <Stethoscope className="w-5 h-5 text-teal-600 mb-1" />
              <span className="text-xs text-teal-700">Clinic</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default UnifiedStaffLogin;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';
import { User, Lock, Loader2, ArrowLeft, Stethoscope, Building2 } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const StaffPortalLogin = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('staffToken');
    const storedStaff = localStorage.getItem('staffInfo');
    if (token && storedStaff) {
      const staff = JSON.parse(storedStaff);
      const role = staff.role?.toLowerCase() || '';
      if (role.includes('staff') || role === 'diagyn_staff' || role === 'clinic_staff_pushpa' || role === 'clinic_staff_amnion') {
        navigate('/diagyn-staff');
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
      
      toast.success(`Welcome, ${staff.name}!`);
      navigate('/diagyn-staff');
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
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 bg-teal-600">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-teal-700">Staff Portal</h1>
          <p className="text-sm text-gray-500">DiaGyn Clinic Staff Login</p>
        </div>
        
        <div className="space-y-3">
          <div className="relative">
            <User className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <Input 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username" 
              className="pl-10 h-11" 
              data-testid="staff-portal-username" 
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
              data-testid="staff-portal-password"
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()} 
            />
          </div>
          <Button 
            onClick={handleLogin} 
            disabled={loading}
            className="w-full h-12 text-base font-bold bg-teal-600 hover:bg-teal-700" 
            data-testid="staff-portal-login-btn"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'LOGIN'}
          </Button>
        </div>
        
        <Button 
          variant="ghost" 
          onClick={() => navigate('/login')} 
          className="w-full mt-4 text-gray-500"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Patient Login
        </Button>
      </Card>
    </div>
  );
};

export default StaffPortalLogin;

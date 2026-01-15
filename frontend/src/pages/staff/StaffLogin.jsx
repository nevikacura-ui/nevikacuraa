/**
 * Staff Login Component
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import axios from 'axios';
import { User, Lock, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API } from './staffUtils';

const StaffLogin = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error('Please enter username and password');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/staff/login`, { username, password });
      localStorage.setItem('staffToken', response.data.token);
      localStorage.setItem('staffInfo', JSON.stringify(response.data.staff));
      toast.success(`Welcome, ${response.data.staff.name}!`);
      onLoginSuccess(response.data.staff);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 shadow-xl">
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          <div className="text-center">
            <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Staff Portal</h1>
            <p className="text-gray-500 mt-1">Login to manage clinic operations</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="username">Username</Label>
            <div className="relative mt-1">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="username"
                type="text"
                placeholder="staff_username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-10"
                data-testid="staff-username"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                data-testid="staff-password"
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-teal-600 hover:bg-teal-700"
            disabled={loading}
            data-testid="staff-login-btn"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Logging in...
              </>
            ) : (
              'Login'
            )}
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t">
          <p className="text-xs text-gray-500 text-center">
            Staff accounts are managed by clinic administrators.
            <br />
            Contact admin for login credentials.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default StaffLogin;

import React from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { User, Lock, FlaskConical, Loader2 } from 'lucide-react';

const MangoStaffLogin = ({ username, setUsername, password, setPassword, rememberMe, setRememberMe, handleLogin, loading }) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0A0A1A' }}>
      <Card className="w-full max-w-md bg-[#141428] border border-white/10 shadow-xl relative rounded-3xl">
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl shadow-lg flex items-center justify-center">
              <FlaskConical className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Mango Health Labs</h1>
            <p className="text-gray-500 mt-1">Staff Portal</p>
            <p className="text-xs text-amber-400 italic mt-1">Aam logon ki, Khaas Lab.</p>
          </div>
          
          <div className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input 
                type="text" 
                placeholder="Username" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                className="pl-10 h-12 bg-[#1E1E36] border-white/10 text-white placeholder:text-gray-500 rounded-xl" 
                data-testid="mango-username" 
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <Input 
                type="password" 
                placeholder="Password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()} 
                className="pl-10 h-12 bg-[#1E1E36] border-white/10 text-white placeholder:text-gray-500 rounded-xl" 
                data-testid="mango-password" 
              />
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="rememberMe" 
                checked={rememberMe} 
                onChange={(e) => setRememberMe(e.target.checked)} 
                className="w-4 h-4 rounded accent-amber-500" 
                data-testid="mango-remember-me" 
              />
              <label htmlFor="rememberMe" className="text-sm text-gray-500 cursor-pointer">Remember me for 30 days</label>
            </div>
            <Button 
              onClick={handleLogin} 
              disabled={loading} 
              className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold rounded-xl shadow-lg shadow-amber-500/25" 
              data-testid="mango-login-btn"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MangoStaffLogin;

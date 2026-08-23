import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';
import { User, Lock, Loader2, Eye, EyeOff, ArrowLeft, Pill, FlaskConical } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

// Custom DiaGyn logo component using the SVG file
const DiaGynLogo = ({ className }) => (
  <img src="/diagyn_logo.svg" alt="DiaGyn" className={className} style={{ width: '28px', height: '28px' }} />
);

const PORTALS = [
  {
    id: 'orange',
    name: 'Orange Pharmacy',
    subtitle: 'Inventory & Order Management',
    icon: Pill,
    route: '/pharmacy-staff',
    gradient: 'linear-gradient(135deg, #FFEDD5 0%, #FED7AA 100%)',
    iconGradient: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
    border: '#FDBA74',
    shadow: 'rgba(249,115,22,0.15)',
    textColor: '#9A3412',
    subtitleColor: '#C2410C',
  },
  {
    id: 'mango',
    name: 'Mango Health Labs',
    subtitle: 'Lab Tests & Reports',
    icon: FlaskConical,
    route: '/mango-staff',
    gradient: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)',
    iconGradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    border: '#6EE7B7',
    shadow: 'rgba(16,185,129,0.15)',
    textColor: '#065F46',
    subtitleColor: '#047857',
  },
  {
    id: 'diagyn',
    name: 'DiaGyn Healthcare',
    subtitle: 'Appointments & Patient Care',
    icon: DiaGynLogo,
    isCustomIcon: true,
    route: '/diagyn-staff',
    gradient: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)',
    iconGradient: 'linear-gradient(135deg, #0F766E 0%, #115E59 100%)',
    border: '#5EEAD4',
    shadow: 'rgba(15,118,110,0.15)',
    textColor: '#115E59',
    subtitleColor: '#0F766E',
  },
];

const StaffPortalLogin = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) { toast.error('Enter username and password'); return; }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/staff/login`, { username, password });
      const { token, staff } = res.data;
      localStorage.setItem('staffToken', token);
      localStorage.setItem('staffInfo', JSON.stringify(staff));
      // Set 30-day login expiry for persistent staff sessions
      localStorage.setItem('staffLoginExpiry', (Date.now() + 30 * 24 * 60 * 60 * 1000).toString());
      toast.success(`Welcome, ${staff.name}!`);
      navigate(selected.route);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed. Check credentials.');
    }
    setLoading(false);
  };

  // Portal Selector
  if (!selected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(180deg, #FAFAF9 0%, #F5F5F4 40%, #E7E5E4 100%)' }}>
        <div className="w-full max-w-lg">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-stone-800 tracking-tight">Staff Portals</h1>
            <p className="text-stone-500 text-sm mt-2">Select your portal to continue</p>
          </div>
          <div className="space-y-4">
            {PORTALS.map((portal) => {
              const Icon = portal.icon;
              return (
                <button
                  key={portal.id}
                  onClick={() => setSelected(portal)}
                  className="w-full group relative rounded-2xl p-5 text-left transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] hover:shadow-xl"
                  style={{
                    background: portal.gradient,
                    border: `1.5px solid ${portal.border}`,
                    boxShadow: `0 4px 20px ${portal.shadow}`,
                  }}
                  data-testid={`portal-select-${portal.id}`}
                >
                  <div className="relative flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0" style={{ background: portal.iconGradient }}>
                      {portal.isCustomIcon ? <Icon className="w-7 h-7" /> : <Icon className="w-7 h-7 text-white" />}
                    </div>
                    <div className="flex-1">
                      <h2 className="font-bold text-lg" style={{ color: portal.textColor }}>{portal.name}</h2>
                      <p className="text-sm" style={{ color: portal.subtitleColor, opacity: 0.75 }}>{portal.subtitle}</p>
                    </div>
                    <ArrowLeft className="w-5 h-5 rotate-180 opacity-40 group-hover:translate-x-1 transition-transform" style={{ color: portal.textColor }} />
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-center text-sm text-stone-400 mt-8">
            <button onClick={() => navigate('/')} className="text-stone-500 hover:text-stone-700 transition-colors">
              Back to Home
            </button>
          </p>
        </div>
      </div>
    );
  }

  // Login Form
  const Icon = selected.icon;
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(180deg, #FAFAF9 0%, #F5F5F4 40%, #E7E5E4 100%)' }}>
      <div className="relative w-full max-w-md">
        <div className="relative rounded-3xl overflow-hidden p-8 shadow-xl" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: `1.5px solid ${selected.border}` }}>
          <div className="relative z-10">
            <button
              onClick={() => { setSelected(null); setUsername(''); setPassword(''); }}
              className="mb-6 flex items-center gap-2 text-stone-500 hover:text-stone-700 transition-colors text-sm"
              data-testid="back-to-portals"
            >
              <ArrowLeft className="w-4 h-4" /> Back to portals
            </button>
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg" style={{ background: selected.iconGradient }}>
                {selected.isCustomIcon ? <Icon className="w-7 h-7" /> : <Icon className="w-7 h-7 text-white" />}
              </div>
              <h1 className="text-2xl font-bold mb-1" style={{ color: selected.textColor }}>{selected.name}</h1>
              <p className="text-sm" style={{ color: selected.subtitleColor, opacity: 0.7 }}>{selected.subtitle}</p>
            </div>
            <div className="space-y-4">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <Input
                  type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  className="w-full h-14 bg-white/80 border-stone-200 rounded-2xl text-stone-800 placeholder:text-stone-400 pl-12 pr-4 focus:border-stone-300"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  data-testid="staff-login-username"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                <Input
                  type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full h-14 bg-white/80 border-stone-200 rounded-2xl text-stone-800 placeholder:text-stone-400 pl-12 pr-12 focus:border-stone-300"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  data-testid="staff-login-password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <button
                onClick={handleLogin} disabled={loading}
                className="w-full h-14 rounded-2xl text-white font-semibold text-lg transition-all disabled:opacity-50 shadow-lg mt-2 active:scale-[0.98]"
                style={{ background: selected.iconGradient }}
                data-testid="staff-login-submit"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Log In'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffPortalLogin;

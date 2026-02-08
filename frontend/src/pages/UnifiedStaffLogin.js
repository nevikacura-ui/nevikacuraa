import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Stethoscope, Building2, Shield, Pill, FlaskConical } from 'lucide-react';

const UnifiedStaffLogin = () => {
  const navigate = useNavigate();

  // Check existing auth and redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem('staffToken');
    const storedStaff = localStorage.getItem('staffInfo');
    if (token && storedStaff) {
      try {
        const staff = JSON.parse(storedStaff);
        const role = staff.role?.toLowerCase() || '';
        
        // Redirect based on role
        if (role === 'doctor') {
          navigate('/doctor-portal');
        } else if (role === 'admin' || role === 'super_admin') {
          navigate('/admin');
        } else if (role.includes('pharmacy')) {
          navigate('/orange-staff');
        } else if (role.includes('lab') || role.includes('mango')) {
          navigate('/mango-staff');
        } else {
          navigate('/diagyn-staff');
        }
      } catch (e) {
        // Invalid stored data, clear and show selector
        localStorage.removeItem('staffToken');
        localStorage.removeItem('staffInfo');
      }
    }
  }, [navigate]);

  const portals = [
    {
      id: 'staff',
      name: 'Staff Portal',
      description: 'DiaGyn Clinic Staff',
      icon: Building2,
      color: 'bg-teal-600',
      hoverColor: 'hover:bg-teal-700',
      bgGradient: 'from-teal-50 to-cyan-50',
      borderColor: 'border-teal-200',
      path: '/staff-portal-login'
    },
    {
      id: 'doctor',
      name: 'Doctor Portal',
      description: 'For Physicians',
      icon: Stethoscope,
      color: 'bg-blue-600',
      hoverColor: 'hover:bg-blue-700',
      bgGradient: 'from-blue-50 to-indigo-50',
      borderColor: 'border-blue-200',
      path: '/doctor-login'
    }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-100 via-teal-50 to-cyan-50">
      <Card className="w-full max-w-md p-6 shadow-2xl">
        <div className="text-center mb-8">
          <img 
            src="https://customer-assets.emergentagent.com/job_ac8a9ff5-aa40-4353-a699-dcb3a3af111e/artifacts/3jh0hyis_Blue%20White%20Minimal%20Marketing%20Agency%20Business%20Card%20%28Business%20Card%20%28US%29%29%20%28Cir_20260110_233820_0000%20%281%29.jpg" 
            alt="Nevika Cura" 
            className="h-14 mx-auto mb-4 object-contain"
          />
          <h1 className="text-2xl font-bold text-slate-800">Staff & Doctor Login</h1>
          <p className="text-sm text-gray-500 mt-1">Select your portal to continue</p>
        </div>
        
        <div className="space-y-4">
          {portals.map((portal) => {
            const Icon = portal.icon;
            return (
              <button
                key={portal.id}
                onClick={() => navigate(portal.path)}
                className={`w-full p-4 rounded-xl border-2 ${portal.borderColor} bg-gradient-to-r ${portal.bgGradient} hover:shadow-lg transition-all duration-200 flex items-center gap-4 group`}
                data-testid={`select-${portal.id}-portal`}
              >
                <div className={`w-14 h-14 rounded-xl ${portal.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-bold text-lg text-slate-800">{portal.name}</h3>
                  <p className="text-sm text-gray-500">{portal.description}</p>
                </div>
                <div className="text-gray-400 group-hover:text-gray-600 transition-colors">
                  →
                </div>
              </button>
            );
          })}
        </div>
        
        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gray-200"></div>
          <span className="text-xs text-gray-400 uppercase tracking-wide">Other Portals</span>
          <div className="flex-1 h-px bg-gray-200"></div>
        </div>
        
        {/* Quick links to other staff portals */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/orange-staff')}
            className="p-3 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors flex flex-col items-center gap-2"
            data-testid="quick-pharmacy-staff"
          >
            <Pill className="w-6 h-6 text-orange-500" />
            <span className="text-xs font-medium text-orange-700">Pharmacy Staff</span>
          </button>
          <button
            onClick={() => navigate('/mango-staff')}
            className="p-3 rounded-lg border border-yellow-200 bg-yellow-50 hover:bg-yellow-100 transition-colors flex flex-col items-center gap-2"
            data-testid="quick-lab-staff"
          >
            <FlaskConical className="w-6 h-6 text-yellow-600" />
            <span className="text-xs font-medium text-yellow-700">Lab Staff</span>
          </button>
        </div>
        
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')} 
          className="w-full mt-6 text-gray-500"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
        </Button>
      </Card>
    </div>
  );
};

export default UnifiedStaffLogin;

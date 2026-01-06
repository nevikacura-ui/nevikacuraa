import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { User, Menu, X } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const services = [
    {
      id: 'diagyn',
      name: 'DiaGyn Healthcare',
      logo: 'https://customer-assets.emergentagent.com/job_healthcare-trio/artifacts/b0voru9m_8_20260102_012214_0004.png',
      description: 'Book appointments with our expert doctors',
      bgColor: 'bg-blue-50',
      accentColor: 'border-brand-blue',
      path: '/diagyn'
    },
    {
      id: 'proton',
      name: 'Proton Diagnostics',
      logo: 'https://customer-assets.emergentagent.com/job_healthcare-trio/artifacts/9na5ps29_7_20260102_012214_0003.png',
      description: 'Comprehensive diagnostic tests and health checkups',
      bgColor: 'bg-indigo-50',
      accentColor: 'border-brand-indigo',
      path: '/proton'
    },
    {
      id: 'pharmacy',
      name: 'Orange Pharmacy',
      logo: 'https://customer-assets.emergentagent.com/job_healthcare-trio/artifacts/dvlg3alh_6_20260102_012214_0002.png',
      description: 'Order medicines with doorstep delivery',
      bgColor: 'bg-orange-50',
      accentColor: 'border-brand-orange',
      path: '/pharmacy'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-white/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <p className="text-xs text-muted-foreground mb-1">Registered: 24215 Kuykendal Road, Tomball, Texas 77375, United States</p>
              <img 
                src="https://customer-assets.emergentagent.com/job_healthcare-trio/artifacts/l2eqmibw_4_20260102_011840_0001.png" 
                alt="Nevika Cura" 
                className="h-20 w-auto"
                data-testid="main-logo"
              />
            </div>
            
            <div className="hidden md:flex items-center gap-6">
              {user ? (
                <>
                  <Button 
                    variant="ghost" 
                    onClick={() => navigate('/profile')}
                    data-testid="profile-button"
                    className="font-heading"
                  >
                    <User className="w-4 h-4 mr-2" />
                    {user.name}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={logout}
                    data-testid="logout-button"
                    className="rounded-full"
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={() => setShowAuth(true)} 
                  data-testid="login-button"
                  className="rounded-full bg-brand-teal hover:bg-brand-teal/90"
                >
                  Login / Sign Up
                </Button>
              )}
            </div>

            <button
              className="md:hidden"
              onClick={() => setShowMenu(!showMenu)}
              data-testid="mobile-menu-button"
            >
              {showMenu ? <X /> : <Menu />}
            </button>
          </div>

          {showMenu && (
            <div className="md:hidden mt-4 pb-4 space-y-3" data-testid="mobile-menu">
              {user ? (
                <>
                  <Button 
                    variant="ghost" 
                    onClick={() => navigate('/profile')}
                    className="w-full justify-start"
                  >
                    <User className="w-4 h-4 mr-2" />
                    {user.name}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={logout}
                    className="w-full"
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <Button 
                  onClick={() => setShowAuth(true)}
                  className="w-full"
                >
                  Login / Sign Up
                </Button>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="text-center mb-16">
          <h1 className="font-heading font-bold text-4xl md:text-6xl tracking-tight mb-6 text-foreground">
            Complete Healthcare Solutions
          </h1>
          <p className="font-body text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            From doctor appointments to diagnostics and pharmacy - all your healthcare needs in one place
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {services.map((service) => (
            <div
              key={service.id}
              className={`col-span-1 h-full min-h-[320px] flex flex-col justify-between p-8 rounded-3xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border-2 ${service.accentColor} ${service.bgColor}`}
              data-testid={`service-card-${service.id}`}
            >
              <div className="flex items-center justify-center flex-1">
                <img 
                  src={service.logo} 
                  alt={service.name} 
                  className="max-h-32 w-auto object-contain"
                  data-testid={`service-logo-${service.id}`}
                />
              </div>
              <Button
                onClick={() => navigate(service.path)}
                data-testid={`service-button-${service.id}`}
                className="mt-6 rounded-full px-8 py-6 text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-brand-teal hover:bg-brand-teal/90"
              >
                Get Started
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-xl border border-border/50 rounded-full px-6 py-3">
            <span className="font-body text-muted-foreground">Need Help?</span>
            <a 
              href="https://wa.me/919403890429" 
              target="_blank" 
              rel="noopener noreferrer"
              data-testid="whatsapp-link"
              className="font-heading font-medium text-brand-teal hover:underline"
            >
              Contact us on WhatsApp
            </a>
          </div>
        </div>
      </main>

      <AuthModal open={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
};

const AuthModal = ({ open, onClose }) => {
  const { login, register } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    try {
      await login(formData.get('email'), formData.get('password'));
      toast.success('Logged in successfully!');
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    try {
      await register(
        formData.get('email'),
        formData.get('password'),
        formData.get('phone'),
        formData.get('name')
      );
      toast.success('Account created successfully!');
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="auth-modal">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">Welcome to Nevika Cura</DialogTitle>
          <DialogDescription className="font-body">
            Login or create an account to manage your bookings
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login" data-testid="login-tab">Login</TabsTrigger>
            <TabsTrigger value="register" data-testid="register-tab">Sign Up</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="login-email">Email</Label>
                <Input 
                  id="login-email" 
                  name="email" 
                  type="email" 
                  required 
                  data-testid="login-email-input"
                  className="h-12 rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="login-password">Password</Label>
                <Input 
                  id="login-password" 
                  name="password" 
                  type="password" 
                  required 
                  data-testid="login-password-input"
                  className="h-12 rounded-xl"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full rounded-full" 
                disabled={loading}
                data-testid="login-submit-button"
              >
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          </TabsContent>
          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <Label htmlFor="register-name">Full Name</Label>
                <Input 
                  id="register-name" 
                  name="name" 
                  required 
                  data-testid="register-name-input"
                  className="h-12 rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="register-email">Email</Label>
                <Input 
                  id="register-email" 
                  name="email" 
                  type="email" 
                  required 
                  data-testid="register-email-input"
                  className="h-12 rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="register-phone">Phone Number</Label>
                <Input 
                  id="register-phone" 
                  name="phone" 
                  required 
                  data-testid="register-phone-input"
                  className="h-12 rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="register-password">Password</Label>
                <Input 
                  id="register-password" 
                  name="password" 
                  type="password" 
                  required 
                  data-testid="register-password-input"
                  className="h-12 rounded-xl"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full rounded-full" 
                disabled={loading}
                data-testid="register-submit-button"
              >
                {loading ? 'Creating Account...' : 'Sign Up'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default Home;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  ArrowLeft, Shield, Leaf, Scale, Apple, Users, Building2,
  Calendar, CheckCircle2, Clock, Award, Sparkles, Heart, RefreshCw
} from 'lucide-react';
import { AnimatedPage } from '@/components/PageTransition';

const Reneu = () => {
  const navigate = useNavigate();

  const services = [
    { icon: Shield, title: 'Smart Health Checkups', desc: 'Age & gender based preventive packages' },
    { icon: Scale, title: 'Weight & Metabolism', desc: 'Nutrition & metabolic health programs' },
    { icon: Heart, title: 'Pre-Disease Reversal', desc: 'Prediabetes & pre-BP reversal programs' },
    { icon: Leaf, title: 'Lifestyle Correction', desc: 'Fatty liver, PCOS & lifestyle diseases' },
    { icon: Building2, title: 'Corporate Wellness', desc: 'Employee health & wellness programs' },
    { icon: Users, title: 'Family Health Plans', desc: 'Comprehensive family wellness packages' }
  ];

  const features = [
    { icon: Shield, text: 'Preventive Focus' },
    { icon: Award, text: 'Expert Guidance' },
    { icon: Clock, text: 'Annual Plans' },
    { icon: CheckCircle2, text: 'Personalized Care' }
  ];

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#F5F5F4]" data-testid="reneu-page">
        {/* Header with Reneu Branding - Teal/Blue theme */}
        <header className="bg-gradient-to-r from-slate-700 to-teal-700 text-white sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/')}
                className="rounded-full bg-white/20 hover:bg-white/30 text-white"
                data-testid="reneu-back-btn"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center bg-slate-100">
                  <img 
                    src="https://customer-assets.emergentagent.com/job_healthhub-231/artifacts/uy8wpc27_file_00000000caf871fdae54ae4c4854bbd4.png" 
                    alt="Reneu" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-wide lowercase">reneu</h1>
                  <p className="text-sm opacity-90">Renew Health, Stay Ahead.</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Trust Badges */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center gap-4 overflow-x-auto">
              {features.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                    <feature.icon className="w-4 h-4 text-teal-700" />
                  </div>
                  <span className="text-xs font-medium text-slate-700 whitespace-nowrap">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-5xl mx-auto px-4 py-6">
          {/* Hero Section */}
          <Card className="p-6 mb-6 bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Preventive & Lifestyle Medicine</h2>
            <p className="text-slate-600 mb-4">
              Don't wait to get sick. Our preventive health programs help you stay healthy, 
              reverse pre-disease conditions, and build lifelong wellness habits.
            </p>
            <div className="flex gap-3">
              <Button className="bg-teal-700 hover:bg-teal-800 rounded-xl" data-testid="reneu-book-btn">
                <Calendar className="w-4 h-4 mr-2" />
                Book Health Checkup
              </Button>
              <Button variant="outline" className="rounded-xl border-teal-300 text-teal-700">
                <Apple className="w-4 h-4 mr-2" />
                View Packages
              </Button>
            </div>
          </Card>

          {/* Why Preventive Care */}
          <Card className="p-4 mb-6 bg-teal-50 border-teal-200">
            <div className="flex items-start gap-3">
              <RefreshCw className="w-6 h-6 text-teal-700 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-teal-800">Renew Your Health</h4>
                <p className="text-sm text-teal-700">
                  80% of chronic diseases are preventable. Early detection and lifestyle changes can add years to your life.
                </p>
              </div>
            </div>
          </Card>

          {/* Services Grid */}
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Our Programs</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {services.map((service, idx) => (
              <Card key={idx} className="p-4 hover:shadow-lg transition-all cursor-pointer group" data-testid={`reneu-service-${idx}`}>
                <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-teal-700 transition-colors">
                  <service.icon className="w-6 h-6 text-teal-700 group-hover:text-white transition-colors" />
                </div>
                <h4 className="font-semibold text-slate-800 mb-1">{service.title}</h4>
                <p className="text-sm text-slate-500">{service.desc}</p>
              </Card>
            ))}
          </div>

          {/* Coming Soon Banner */}
          <Card className="p-6 bg-gradient-to-r from-slate-700 to-teal-700 text-white text-center">
            <RefreshCw className="w-10 h-10 mx-auto mb-3 opacity-80" />
            <h3 className="text-xl font-bold mb-2">Full Platform Coming Soon</h3>
            <p className="opacity-90">Complete preventive health management launching soon!</p>
          </Card>
        </main>
      </div>
    </AnimatedPage>
  );
};

export default Reneu;

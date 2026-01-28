import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  ArrowLeft, HeartPulse, Activity, Pill, Stethoscope, AlertTriangle,
  Calendar, Phone, CheckCircle2, Shield, Clock, TrendingUp, Target, Heart
} from 'lucide-react';
import { AnimatedPage } from '@/components/PageTransition';

const Corvia = () => {
  const navigate = useNavigate();

  const services = [
    { icon: HeartPulse, title: 'Hypertension Clinic', desc: 'BP monitoring & management programs' },
    { icon: Activity, title: 'Cholesterol Care', desc: 'Lipid profile management & diet plans' },
    { icon: Target, title: 'Cardiac Risk Profiling', desc: 'Heart-age & vascular assessment' },
    { icon: Pill, title: 'Medication Optimization', desc: 'Personalized treatment plans' },
    { icon: TrendingUp, title: 'Lifestyle Programs', desc: 'Diet, exercise & stress management' },
    { icon: Stethoscope, title: 'Post-Event Care', desc: 'Long-term follow-up after cardiac events' }
  ];

  const features = [
    { icon: Shield, text: 'Expert Cardiologists' },
    { icon: Clock, text: '24/7 Emergency' },
    { icon: Activity, text: 'Advanced Diagnostics' },
    { icon: CheckCircle2, text: 'Personalized Care' }
  ];

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#F5F5F4]" data-testid="corvia-page">
        {/* Header with Corvia Branding - Lime green theme */}
        <header className="bg-gradient-to-r from-[#6b1f54] to-[#7a2560] text-white sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/')}
                className="rounded-full bg-white/20 hover:bg-white/30 text-white"
                data-testid="corvia-back-btn"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center bg-[#c8f56a]">
                  <img 
                    src="https://customer-assets.emergentagent.com/job_healthhub-231/artifacts/nz0rdwvp_file_000000000dfc7230a4605006a1e3131a.png" 
                    alt="Corvia" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-wide">Corvia</h1>
                  <p className="text-sm opacity-90">Healthy Heart & Prevention</p>
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
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <feature.icon className="w-4 h-4 text-purple-700" />
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
          <Card className="p-6 mb-6 bg-gradient-to-br from-lime-50 to-green-50 border-lime-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Hypertension, Cholesterol & Heart Care</h2>
            <p className="text-slate-600 mb-4">
              Comprehensive cardiac care including blood pressure management, cholesterol control, 
              and heart disease prevention. Expert cardiologists at your service.
            </p>
            <div className="flex gap-3">
              <Button className="bg-[#6b1f54] hover:bg-[#5a1946] rounded-xl" data-testid="corvia-book-btn">
                <Calendar className="w-4 h-4 mr-2" />
                Book Heart Checkup
              </Button>
              <Button variant="outline" className="rounded-xl border-purple-300 text-purple-700">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Emergency: 108
              </Button>
            </div>
          </Card>

          {/* Risk Factors Banner */}
          <Card className="p-4 mb-6 bg-amber-50 border-amber-200">
            <div className="flex items-start gap-3">
              <Heart className="w-6 h-6 text-[#6b1f54] flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-amber-800">Know Your Heart</h4>
                <p className="text-sm text-amber-700">
                  High BP, cholesterol & heart disease are silent killers. Regular checkups after 35+ or with family history are crucial.
                </p>
              </div>
            </div>
          </Card>

          {/* Services Grid */}
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Our Services</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {services.map((service, idx) => (
              <Card key={idx} className="p-4 hover:shadow-lg transition-all cursor-pointer group" data-testid={`corvia-service-${idx}`}>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-[#6b1f54] transition-colors">
                  <service.icon className="w-6 h-6 text-purple-700 group-hover:text-white transition-colors" />
                </div>
                <h4 className="font-semibold text-slate-800 mb-1">{service.title}</h4>
                <p className="text-sm text-slate-500">{service.desc}</p>
              </Card>
            ))}
          </div>

          {/* Coming Soon Banner */}
          <Card className="p-6 bg-gradient-to-r from-[#6b1f54] to-[#7a2560] text-white text-center">
            <HeartPulse className="w-10 h-10 mx-auto mb-3 opacity-80" />
            <h3 className="text-xl font-bold mb-2">Full Platform Coming Soon</h3>
            <p className="opacity-90">Complete cardiac care management launching soon!</p>
          </Card>
        </main>
      </div>
    </AnimatedPage>
  );
};

export default Corvia;

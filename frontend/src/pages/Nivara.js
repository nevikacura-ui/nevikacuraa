import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  ArrowLeft, Users, Heart, Brain, Pill, Home, Activity,
  Calendar, CheckCircle2, Clock, Phone, Shield, Stethoscope
} from 'lucide-react';
import { AnimatedPage } from '@/components/PageTransition';

const Nivara = () => {
  const navigate = useNavigate();

  const services = [
    { icon: Stethoscope, title: 'Geriatric Consultations', desc: 'Specialized care for elderly health' },
    { icon: Heart, title: 'Chronic Disease Care', desc: 'Diabetes, BP & heart monitoring' },
    { icon: Brain, title: 'Memory & Cognitive', desc: 'Dementia screening & cognitive care' },
    { icon: Activity, title: 'Mobility & Arthritis', desc: 'Joint pain & fall-risk assessment' },
    { icon: Pill, title: 'Medication Review', desc: 'Optimize medicines, reduce side effects' },
    { icon: Home, title: 'Home Care Coordination', desc: 'Nursing & caregiver support' }
  ];

  const features = [
    { icon: Shield, text: 'Compassionate Care' },
    { icon: Clock, text: 'Home Visits Available' },
    { icon: Phone, text: 'Family Support Line' },
    { icon: CheckCircle2, text: 'Holistic Approach' }
  ];

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#F5F5F4]">
        {/* Header */}
        <header className="bg-gradient-to-r from-cyan-600 to-teal-600 text-white sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/')}
                className="rounded-full bg-white/20 hover:bg-white/30 text-white"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Users className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Nivara</h1>
                  <p className="text-sm opacity-90">Comfort. Care. Dignity.</p>
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
                  <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center">
                    <feature.icon className="w-4 h-4 text-cyan-600" />
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
          <Card className="p-6 mb-6 bg-gradient-to-br from-cyan-50 to-teal-50 border-cyan-100">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Senior Care & Elderly Wellness</h2>
            <p className="text-slate-600 mb-4">
              Comprehensive care for our elders. From geriatric consultations to home care coordination, 
              we ensure comfort, dignity, and quality of life.
            </p>
            <div className="flex gap-3">
              <Button className="bg-cyan-600 hover:bg-cyan-700 rounded-xl">
                <Calendar className="w-4 h-4 mr-2" />
                Book Consultation
              </Button>
              <Button variant="outline" className="rounded-xl border-cyan-300 text-cyan-600">
                <Home className="w-4 h-4 mr-2" />
                Home Visit
              </Button>
            </div>
          </Card>

          {/* Family Support Banner */}
          <Card className="p-4 mb-6 bg-cyan-50 border-cyan-200">
            <div className="flex items-start gap-3">
              <Heart className="w-6 h-6 text-cyan-600 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-cyan-800">For Families & Caregivers</h4>
                <p className="text-sm text-cyan-700">
                  We support the entire family. Caregiver guidance, family counseling, and 24/7 helpline available.
                </p>
              </div>
            </div>
          </Card>

          {/* Services Grid */}
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Our Services</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {services.map((service, idx) => (
              <Card key={idx} className="p-4 hover:shadow-lg transition-all cursor-pointer group">
                <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-cyan-600 transition-colors">
                  <service.icon className="w-6 h-6 text-cyan-600 group-hover:text-white transition-colors" />
                </div>
                <h4 className="font-semibold text-slate-800 mb-1">{service.title}</h4>
                <p className="text-sm text-slate-500">{service.desc}</p>
              </Card>
            ))}
          </div>

          {/* Coming Soon Banner */}
          <Card className="p-6 bg-gradient-to-r from-cyan-600 to-teal-600 text-white text-center">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-80" />
            <h3 className="text-xl font-bold mb-2">Coming Soon</h3>
            <p className="opacity-90">Full senior care platform launching soon. Stay tuned!</p>
          </Card>
        </main>
      </div>
    </AnimatedPage>
  );
};

export default Nivara;

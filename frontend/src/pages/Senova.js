import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  ArrowLeft, Users, Heart, Brain, Pill, Home, Activity,
  Calendar, CheckCircle2, Clock, Phone, Shield, Stethoscope, HandHeart
} from 'lucide-react';
import { AnimatedPage } from '@/components/PageTransition';

const Senova = () => {
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
    { icon: Clock, text: 'Home Visits' },
    { icon: Phone, text: 'Family Support' },
    { icon: CheckCircle2, text: 'Holistic Approach' }
  ];

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#F5F5F4]" data-testid="senova-page">
        {/* Header with Senova Branding - Blue theme */}
        <header className="bg-gradient-to-r from-[#3b5998] to-[#4a69ad] text-white sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/')}
                className="rounded-full bg-white/20 hover:bg-white/30 text-white"
                data-testid="senova-back-btn"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center bg-white/90">
                  <img 
                    src="https://customer-assets.emergentagent.com/job_healthhub-231/artifacts/p3zt5ovj_Pink%20Simple%20Charity%20Logo_20260128_183244_0000.png" 
                    alt="Senova" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-wide">SENOVA</h1>
                  <p className="text-sm opacity-90">Care for Life's Next Chapter</p>
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
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <feature.icon className="w-4 h-4 text-blue-700" />
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
          <Card className="p-6 mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Senior Care & Elderly Wellness</h2>
            <p className="text-slate-600 mb-4">
              Comprehensive care for our elders. From geriatric consultations to home care coordination, 
              we ensure comfort, dignity, and quality of life.
            </p>
            <div className="flex gap-3">
              <Button className="bg-[#3b5998] hover:bg-[#4a69ad] rounded-xl" data-testid="senova-book-btn">
                <Calendar className="w-4 h-4 mr-2" />
                Book Consultation
              </Button>
              <Button variant="outline" className="rounded-xl border-blue-300 text-blue-700">
                <Home className="w-4 h-4 mr-2" />
                Home Visit
              </Button>
            </div>
          </Card>

          {/* Family Support Banner */}
          <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
            <div className="flex items-start gap-3">
              <HandHeart className="w-6 h-6 text-blue-700 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-blue-800">For Families & Caregivers</h4>
                <p className="text-sm text-blue-700">
                  We support the entire family. Caregiver guidance, family counseling, and 24/7 helpline available.
                </p>
              </div>
            </div>
          </Card>

          {/* Services Grid */}
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Our Services</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {services.map((service, idx) => (
              <Card key={idx} className="p-4 hover:shadow-lg transition-all cursor-pointer group" data-testid={`senova-service-${idx}`}>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-[#3b5998] transition-colors">
                  <service.icon className="w-6 h-6 text-blue-700 group-hover:text-white transition-colors" />
                </div>
                <h4 className="font-semibold text-slate-800 mb-1">{service.title}</h4>
                <p className="text-sm text-slate-500">{service.desc}</p>
              </Card>
            ))}
          </div>

          {/* Coming Soon Banner */}
          <Card className="p-6 bg-gradient-to-r from-[#3b5998] to-[#4a69ad] text-white text-center">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-80" />
            <h3 className="text-xl font-bold mb-2">Full Platform Coming Soon</h3>
            <p className="opacity-90">Complete senior care management launching soon!</p>
          </Card>
        </main>
      </div>
    </AnimatedPage>
  );
};

export default Senova;

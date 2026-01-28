import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  ArrowLeft, Shield, Leaf, Scale, Apple, Users, Building2,
  Calendar, CheckCircle2, Clock, Award, Sparkles, Heart
} from 'lucide-react';
import { AnimatedPage } from '@/components/PageTransition';

const Vireya = () => {
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
    { icon: Clock, text: 'Annual Plans Available' },
    { icon: CheckCircle2, text: 'Personalized Programs' }
  ];

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#F5F5F4]">
        {/* Header */}
        <header className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white sticky top-0 z-50">
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
                  <Shield className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Vireya</h1>
                  <p className="text-sm opacity-90">Prevent. Protect. Prosper.</p>
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
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <feature.icon className="w-4 h-4 text-emerald-600" />
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
          <Card className="p-6 mb-6 bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Preventive & Lifestyle Medicine</h2>
            <p className="text-slate-600 mb-4">
              Don't wait to get sick. Our preventive health programs help you stay healthy, 
              reverse pre-disease conditions, and build lifelong wellness habits.
            </p>
            <div className="flex gap-3">
              <Button className="bg-emerald-600 hover:bg-emerald-700 rounded-xl">
                <Calendar className="w-4 h-4 mr-2" />
                Book Health Checkup
              </Button>
              <Button variant="outline" className="rounded-xl border-emerald-300 text-emerald-600">
                <Apple className="w-4 h-4 mr-2" />
                View Packages
              </Button>
            </div>
          </Card>

          {/* Why Preventive Care */}
          <Card className="p-4 mb-6 bg-emerald-50 border-emerald-200">
            <div className="flex items-start gap-3">
              <Sparkles className="w-6 h-6 text-emerald-600 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-emerald-800">Why Preventive Health?</h4>
                <p className="text-sm text-emerald-700">
                  80% of chronic diseases are preventable. Early detection and lifestyle changes can add years to your life.
                </p>
              </div>
            </div>
          </Card>

          {/* Services Grid */}
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Our Programs</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {services.map((service, idx) => (
              <Card key={idx} className="p-4 hover:shadow-lg transition-all cursor-pointer group">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-emerald-600 transition-colors">
                  <service.icon className="w-6 h-6 text-emerald-600 group-hover:text-white transition-colors" />
                </div>
                <h4 className="font-semibold text-slate-800 mb-1">{service.title}</h4>
                <p className="text-sm text-slate-500">{service.desc}</p>
              </Card>
            ))}
          </div>

          {/* Coming Soon Banner */}
          <Card className="p-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-center">
            <Shield className="w-10 h-10 mx-auto mb-3 opacity-80" />
            <h3 className="text-xl font-bold mb-2">Coming Soon</h3>
            <p className="opacity-90">Full preventive health platform launching soon. Stay tuned!</p>
          </Card>
        </main>
      </div>
    </AnimatedPage>
  );
};

export default Vireya;

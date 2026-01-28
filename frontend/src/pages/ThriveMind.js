import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  ArrowLeft, Brain, MessageCircle, Moon, Heart, Users, Sparkles, 
  Calendar, Phone, CheckCircle2, Shield, Clock, Star
} from 'lucide-react';
import { AnimatedPage } from '@/components/PageTransition';

const ThriveMind = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('services');

  const services = [
    { icon: Brain, title: 'Stress & Anxiety Care', desc: 'Expert counseling for stress, anxiety & panic disorders' },
    { icon: Moon, title: 'Sleep Disorders', desc: 'Insomnia, sleep apnea & circadian rhythm issues' },
    { icon: Heart, title: 'Depression Support', desc: 'Compassionate care for mood disorders' },
    { icon: Users, title: 'Teen & Adolescent', desc: 'Specialized counseling for young minds' },
    { icon: Sparkles, title: 'Mindfulness Programs', desc: 'Meditation, yoga & resilience building' },
    { icon: MessageCircle, title: 'Corporate Wellness', desc: 'Mental health programs for workplaces' }
  ];

  const features = [
    { icon: Shield, text: '100% Confidential Sessions' },
    { icon: Clock, text: 'Same-day Appointments Available' },
    { icon: Star, text: 'Certified Psychologists & Psychiatrists' },
    { icon: Phone, text: '24/7 Crisis Helpline' }
  ];

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#F5F5F4]">
        {/* Header */}
        <header className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white sticky top-0 z-50">
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
                  <Brain className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Thrive Mind</h1>
                  <p className="text-sm opacity-90">Strong Minds. Balanced Lives.</p>
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
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <feature.icon className="w-4 h-4 text-indigo-600" />
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
          <Card className="p-6 mb-6 bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-100">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Mental Health & Emotional Wellbeing</h2>
            <p className="text-slate-600 mb-4">
              Expert care for stress, anxiety, depression, and emotional wellness. 
              Our certified professionals provide compassionate, confidential support.
            </p>
            <div className="flex gap-3">
              <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl">
                <Calendar className="w-4 h-4 mr-2" />
                Book Consultation
              </Button>
              <Button variant="outline" className="rounded-xl border-indigo-300 text-indigo-600">
                <Phone className="w-4 h-4 mr-2" />
                Crisis Helpline
              </Button>
            </div>
          </Card>

          {/* Services Grid */}
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Our Services</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {services.map((service, idx) => (
              <Card key={idx} className="p-4 hover:shadow-lg transition-all cursor-pointer group">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-indigo-600 transition-colors">
                  <service.icon className="w-6 h-6 text-indigo-600 group-hover:text-white transition-colors" />
                </div>
                <h4 className="font-semibold text-slate-800 mb-1">{service.title}</h4>
                <p className="text-sm text-slate-500">{service.desc}</p>
              </Card>
            ))}
          </div>

          {/* Coming Soon Banner */}
          <Card className="p-6 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-center">
            <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-80" />
            <h3 className="text-xl font-bold mb-2">Coming Soon</h3>
            <p className="opacity-90">Full mental wellness platform launching soon. Stay tuned!</p>
          </Card>
        </main>
      </div>
    </AnimatedPage>
  );
};

export default ThriveMind;

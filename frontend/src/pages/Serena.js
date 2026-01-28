import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  ArrowLeft, Brain, MessageCircle, Moon, Heart, Users, Sparkles, 
  Calendar, Phone, CheckCircle2, Shield, Clock, Star, TreePine, Wind
} from 'lucide-react';
import { AnimatedPage } from '@/components/PageTransition';

const Serena = () => {
  const navigate = useNavigate();

  const services = [
    { icon: Brain, title: 'Stress & Anxiety Care', desc: 'Expert counseling for stress, anxiety & panic disorders' },
    { icon: Moon, title: 'Sleep Wellness', desc: 'Insomnia, sleep hygiene & circadian rhythm guidance' },
    { icon: Heart, title: 'Depression Support', desc: 'Compassionate care for mood disorders' },
    { icon: TreePine, title: 'Guided Meditation', desc: 'Daily meditation sessions & mindfulness programs' },
    { icon: Wind, title: 'Breathwork & Yoga', desc: 'Breathing exercises & calming yoga practices' },
    { icon: MessageCircle, title: 'Therapy Sessions', desc: 'One-on-one counseling with certified therapists' }
  ];

  const features = [
    { icon: Shield, text: '100% Confidential' },
    { icon: Clock, text: 'Same-day Sessions' },
    { icon: Star, text: 'Certified Therapists' },
    { icon: Phone, text: '24/7 Support Line' }
  ];

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#F5F5F4]" data-testid="serena-page">
        {/* Header with Serena Branding */}
        <header className="bg-gradient-to-r from-slate-800 to-slate-700 text-white sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/')}
                className="rounded-full bg-white/20 hover:bg-white/30 text-white"
                data-testid="serena-back-btn"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center bg-white/10">
                  <img 
                    src="https://customer-assets.emergentagent.com/job_healthhub-231/artifacts/9lxbdskl_90.png" 
                    alt="Serena" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-wide">SERENA</h1>
                  <p className="text-sm opacity-90">Find Your Calm</p>
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
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                    <feature.icon className="w-4 h-4 text-slate-700" />
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
          <Card className="p-6 mb-6 bg-gradient-to-br from-slate-50 to-stone-100 border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Mental Wellness & Meditation</h2>
            <p className="text-slate-600 mb-4">
              Find your inner peace with expert guidance. From stress management to meditation, 
              our certified professionals help you achieve mental balance and emotional wellbeing.
            </p>
            <div className="flex gap-3">
              <Button className="bg-slate-800 hover:bg-slate-900 rounded-xl" data-testid="serena-book-btn">
                <Calendar className="w-4 h-4 mr-2" />
                Book Session
              </Button>
              <Button variant="outline" className="rounded-xl border-slate-300 text-slate-700">
                <Phone className="w-4 h-4 mr-2" />
                Talk to Someone
              </Button>
            </div>
          </Card>

          {/* Wellness Tip Banner */}
          <Card className="p-4 mb-6 bg-slate-50 border-slate-200">
            <div className="flex items-start gap-3">
              <TreePine className="w-6 h-6 text-slate-700 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-slate-800">Daily Calm</h4>
                <p className="text-sm text-slate-600">
                  "Breathe in peace, breathe out stress. Start with just 5 minutes of mindfulness today."
                </p>
              </div>
            </div>
          </Card>

          {/* Services Grid */}
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Our Services</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {services.map((service, idx) => (
              <Card key={idx} className="p-4 hover:shadow-lg transition-all cursor-pointer group" data-testid={`serena-service-${idx}`}>
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-slate-800 transition-colors">
                  <service.icon className="w-6 h-6 text-slate-700 group-hover:text-white transition-colors" />
                </div>
                <h4 className="font-semibold text-slate-800 mb-1">{service.title}</h4>
                <p className="text-sm text-slate-500">{service.desc}</p>
              </Card>
            ))}
          </div>

          {/* Coming Soon Banner */}
          <Card className="p-6 bg-gradient-to-r from-slate-800 to-slate-700 text-white text-center">
            <TreePine className="w-10 h-10 mx-auto mb-3 opacity-80" />
            <h3 className="text-xl font-bold mb-2">Full Platform Coming Soon</h3>
            <p className="opacity-90">Guided meditations, therapy booking, and more. Stay tuned!</p>
          </Card>
        </main>
      </div>
    </AnimatedPage>
  );
};

export default Serena;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  ArrowLeft, Dumbbell, Activity, Heart, Footprints, Flame,
  Calendar, CheckCircle2, Clock, Award, Play, Target, Zap
} from 'lucide-react';
import { AnimatedPage } from '@/components/PageTransition';

const Thrive360New = () => {
  const navigate = useNavigate();

  const services = [
    { icon: Dumbbell, title: 'Strength Training', desc: 'Personalized workout plans & guidance' },
    { icon: Activity, title: 'Yoga & Meditation', desc: 'Mind-body wellness programs' },
    { icon: Footprints, title: 'Physiotherapy', desc: 'Injury recovery & mobility improvement' },
    { icon: Flame, title: 'Weight Management', desc: 'Fat loss & muscle building programs' },
    { icon: Heart, title: 'Cardio Fitness', desc: 'Heart-healthy exercise routines' },
    { icon: Target, title: 'Sports Rehab', desc: 'Athletic performance & recovery' }
  ];

  const features = [
    { icon: Award, text: 'Certified Trainers' },
    { icon: Clock, text: 'Flexible Timings' },
    { icon: Play, text: 'Video Guidance' },
    { icon: CheckCircle2, text: 'Progress Tracking' }
  ];

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#F5F5F4]" data-testid="thrive360-page">
        {/* Header with Thrive360 Branding - Dark blue/purple theme */}
        <header className="bg-gradient-to-r from-[#1a1a3e] to-[#2d2d5a] text-white sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/')}
                className="rounded-full bg-white/20 hover:bg-white/30 text-white"
                data-testid="thrive360-back-btn"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center bg-[#1a1a3e]">
                  <img 
                    src="https://customer-assets.emergentagent.com/job_healthhub-231/artifacts/tx5fggdz_91.png" 
                    alt="Thrive360" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-wide">THRIVE360</h1>
                  <p className="text-sm opacity-90">Health in Motion</p>
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
                    <feature.icon className="w-4 h-4 text-indigo-700" />
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
          <Card className="p-6 mb-6 bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Fitness, Yoga & Physical Wellness</h2>
            <p className="text-slate-600 mb-4">
              Transform your body and mind with expert-guided fitness programs. 
              From yoga to strength training, we have something for everyone.
            </p>
            <div className="flex gap-3">
              <Button className="bg-[#1a1a3e] hover:bg-[#2d2d5a] rounded-xl" data-testid="thrive360-book-btn">
                <Calendar className="w-4 h-4 mr-2" />
                Book Session
              </Button>
              <Button variant="outline" className="rounded-xl border-indigo-300 text-indigo-700">
                <Play className="w-4 h-4 mr-2" />
                Watch Demo
              </Button>
            </div>
          </Card>

          {/* Motivation Banner */}
          <Card className="p-4 mb-6 bg-gradient-to-r from-indigo-100 to-violet-100 border-indigo-200">
            <div className="flex items-start gap-3">
              <Zap className="w-6 h-6 text-indigo-700 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-indigo-800">Start Your Journey</h4>
                <p className="text-sm text-indigo-700">
                  "The only bad workout is the one that didn't happen." Begin today!
                </p>
              </div>
            </div>
          </Card>

          {/* Services Grid */}
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Our Programs</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {services.map((service, idx) => (
              <Card key={idx} className="p-4 hover:shadow-lg transition-all cursor-pointer group" data-testid={`thrive360-service-${idx}`}>
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-[#1a1a3e] transition-colors">
                  <service.icon className="w-6 h-6 text-indigo-700 group-hover:text-white transition-colors" />
                </div>
                <h4 className="font-semibold text-slate-800 mb-1">{service.title}</h4>
                <p className="text-sm text-slate-500">{service.desc}</p>
              </Card>
            ))}
          </div>

          {/* Coming Soon Banner */}
          <Card className="p-6 bg-gradient-to-r from-[#1a1a3e] to-[#2d2d5a] text-white text-center">
            <Dumbbell className="w-10 h-10 mx-auto mb-3 opacity-80" />
            <h3 className="text-xl font-bold mb-2">Full Platform Coming Soon</h3>
            <p className="opacity-90">Complete fitness management platform launching soon!</p>
          </Card>
        </main>
      </div>
    </AnimatedPage>
  );
};

export default Thrive360New;

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  ArrowLeft, Dumbbell, Activity, Heart, Footprints, Flame,
  Calendar, CheckCircle2, Clock, Award, Play, Target
} from 'lucide-react';
import { AnimatedPage } from '@/components/PageTransition';

const FitLife = () => {
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
      <div className="min-h-screen bg-[#F5F5F4]">
        {/* Header */}
        <header className="bg-gradient-to-r from-orange-500 to-amber-500 text-white sticky top-0 z-50">
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
                  <Dumbbell className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">FitLife</h1>
                  <p className="text-sm opacity-90">Move. Strengthen. Thrive.</p>
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
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <feature.icon className="w-4 h-4 text-orange-600" />
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
          <Card className="p-6 mb-6 bg-gradient-to-br from-orange-50 to-amber-50 border-orange-100">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Physical Health, Yoga & Physiotherapy</h2>
            <p className="text-slate-600 mb-4">
              Transform your body and mind with expert-guided fitness programs. 
              From yoga to strength training, we have something for everyone.
            </p>
            <div className="flex gap-3">
              <Button className="bg-orange-600 hover:bg-orange-700 rounded-xl">
                <Calendar className="w-4 h-4 mr-2" />
                Book Session
              </Button>
              <Button variant="outline" className="rounded-xl border-orange-300 text-orange-600">
                <Play className="w-4 h-4 mr-2" />
                Watch Demo
              </Button>
            </div>
          </Card>

          {/* Motivation Banner */}
          <Card className="p-4 mb-6 bg-orange-50 border-orange-200">
            <div className="flex items-start gap-3">
              <Flame className="w-6 h-6 text-orange-600 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-orange-800">Start Your Journey</h4>
                <p className="text-sm text-orange-700">
                  "The only bad workout is the one that didn't happen." Begin today!
                </p>
              </div>
            </div>
          </Card>

          {/* Services Grid */}
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Our Programs</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {services.map((service, idx) => (
              <Card key={idx} className="p-4 hover:shadow-lg transition-all cursor-pointer group">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-orange-600 transition-colors">
                  <service.icon className="w-6 h-6 text-orange-600 group-hover:text-white transition-colors" />
                </div>
                <h4 className="font-semibold text-slate-800 mb-1">{service.title}</h4>
                <p className="text-sm text-slate-500">{service.desc}</p>
              </Card>
            ))}
          </div>

          {/* Coming Soon Banner */}
          <Card className="p-6 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-center">
            <Dumbbell className="w-10 h-10 mx-auto mb-3 opacity-80" />
            <h3 className="text-xl font-bold mb-2">Coming Soon</h3>
            <p className="opacity-90">Full fitness platform launching soon. Stay tuned!</p>
          </Card>
        </main>
      </div>
    </AnimatedPage>
  );
};

export default FitLife;

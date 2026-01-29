import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Brain, MessageCircle, Moon, Heart, Users, Sparkles, 
  Calendar, Phone, CheckCircle2, Shield, Clock, Star, TreePine, Wind,
  Play, AlertTriangle, Headphones, Flower2, Sun, Coffee, Leaf, 
  Music, Eye, Hand, ChevronRight
} from 'lucide-react';
import { AnimatedPage } from '@/components/PageTransition';

const Serena = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('meditation');

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

  // Crisis Helpline Numbers (India)
  const helplines = [
    { name: 'iCall', number: '9152987821', desc: 'TISS Mumbai Helpline (Mon-Sat 8am-10pm)', type: 'call' },
    { name: 'Vandrevala Foundation', number: '1860-2662-345', desc: '24/7 Free Mental Health Support', type: 'call' },
    { name: 'AASRA', number: '9820466726', desc: '24/7 Crisis Intervention', type: 'call' },
    { name: 'iCall WhatsApp', number: '9152987821', desc: 'Chat support available', type: 'whatsapp' }
  ];

  // Meditation Content
  const meditations = [
    { id: 1, title: 'Morning Calm', duration: '10 min', icon: Sun, desc: 'Start your day with peace', level: 'Beginner' },
    { id: 2, title: 'Stress Relief', duration: '15 min', icon: Wind, desc: 'Release tension & anxiety', level: 'All Levels' },
    { id: 3, title: 'Deep Sleep', duration: '20 min', icon: Moon, desc: 'Drift into restful sleep', level: 'All Levels' },
    { id: 4, title: 'Body Scan', duration: '12 min', icon: Eye, desc: 'Full body relaxation', level: 'Intermediate' },
    { id: 5, title: 'Gratitude Practice', duration: '8 min', icon: Heart, desc: 'Cultivate thankfulness', level: 'Beginner' },
    { id: 6, title: 'Mindful Eating', duration: '5 min', icon: Coffee, desc: 'Present moment awareness', level: 'Beginner' }
  ];

  // Yoga Exercises
  const yogaExercises = [
    { id: 1, title: 'Sun Salutation', duration: '15 min', icon: Sun, desc: 'Energizing morning flow', level: 'Beginner', poses: 12 },
    { id: 2, title: 'Stress Relief Yoga', duration: '20 min', icon: Wind, desc: 'Gentle stretches for calm', level: 'All Levels', poses: 8 },
    { id: 3, title: "Child's Pose Flow", duration: '10 min', icon: Flower2, desc: 'Restorative sequence', level: 'Beginner', poses: 5 },
    { id: 4, title: 'Anxiety Relief', duration: '15 min', icon: Heart, desc: 'Calming forward folds', level: 'Beginner', poses: 7 },
    { id: 5, title: 'Sleep Yoga', duration: '12 min', icon: Moon, desc: 'Before bed stretches', level: 'All Levels', poses: 6 },
    { id: 6, title: 'Desk Yoga', duration: '8 min', icon: Hand, desc: 'Office-friendly stretches', level: 'Beginner', poses: 5 }
  ];

  // Breathing Exercises
  const breathingExercises = [
    { id: 1, title: '4-7-8 Breathing', duration: '5 min', pattern: 'Inhale 4s, Hold 7s, Exhale 8s', benefit: 'Reduces anxiety & helps sleep' },
    { id: 2, title: 'Box Breathing', duration: '5 min', pattern: 'Inhale 4s, Hold 4s, Exhale 4s, Hold 4s', benefit: 'Calms nervous system' },
    { id: 3, title: 'Alternate Nostril', duration: '8 min', pattern: 'Nadi Shodhana pranayama', benefit: 'Balances mind & body' },
    { id: 4, title: 'Belly Breathing', duration: '5 min', pattern: 'Deep diaphragmatic breathing', benefit: 'Reduces stress hormones' }
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
                    src="https://customer-assets.emergentagent.com/job_medportal-nevika/artifacts/rnobb9t9_90.png" 
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

        {/* CRISIS HELPLINE BANNER - Always Visible */}
        <div className="bg-gradient-to-r from-red-600 to-red-500 text-white">
          <div className="max-w-5xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 flex-shrink-0 animate-pulse" />
                <div>
                  <p className="font-semibold text-sm">Need immediate help? You're not alone.</p>
                  <p className="text-xs opacity-90">24/7 Crisis Support Available</p>
                </div>
              </div>
              <a 
                href="tel:9820466726" 
                className="flex items-center gap-2 bg-white text-red-600 px-4 py-2 rounded-full font-bold text-sm hover:bg-red-50 transition-colors"
                data-testid="crisis-helpline-btn"
              >
                <Phone className="w-4 h-4" />
                AASRA: 9820466726
              </a>
            </div>
          </div>
        </div>

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
            <div className="flex gap-3 flex-wrap">
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

          {/* Helpline Numbers Section */}
          <Card className="p-4 mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Headphones className="w-5 h-5 text-amber-600" />
              Mental Health Helplines (India)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {helplines.map((helpline, idx) => (
                <a
                  key={idx}
                  href={helpline.type === 'whatsapp' ? `https://wa.me/91${helpline.number.replace(/-/g, '')}` : `tel:${helpline.number.replace(/-/g, '')}`}
                  className="flex items-center gap-3 p-3 bg-white rounded-xl hover:shadow-md transition-all"
                  data-testid={`helpline-${idx}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${helpline.type === 'whatsapp' ? 'bg-green-100' : 'bg-blue-100'}`}>
                    <Phone className={`w-5 h-5 ${helpline.type === 'whatsapp' ? 'text-green-600' : 'text-blue-600'}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800 text-sm">{helpline.name}</p>
                    <p className="text-xs text-slate-500">{helpline.desc}</p>
                    <p className="text-sm font-bold text-slate-700">{helpline.number}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </a>
              ))}
            </div>
          </Card>

          {/* Tabs for Meditation, Yoga, Breathing */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {['meditation', 'yoga', 'breathing'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab 
                    ? 'bg-slate-800 text-white' 
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
                data-testid={`tab-${tab}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Meditation Content */}
          {activeTab === 'meditation' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">Guided Meditations</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {meditations.map((med) => (
                  <Card 
                    key={med.id} 
                    className="p-4 hover:shadow-lg transition-all cursor-pointer group"
                    data-testid={`meditation-${med.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-slate-800 transition-colors">
                        <med.icon className="w-6 h-6 text-slate-700 group-hover:text-white transition-colors" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-800">{med.title}</h4>
                          <Badge variant="outline" className="text-xs">{med.level}</Badge>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">{med.desc}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span className="text-xs text-slate-500">{med.duration}</span>
                          <Button size="sm" variant="ghost" className="ml-auto p-1">
                            <Play className="w-4 h-4 text-slate-600" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Yoga Content */}
          {activeTab === 'yoga' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">Yoga for Mental Wellness</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {yogaExercises.map((yoga) => (
                  <Card 
                    key={yoga.id} 
                    className="p-4 hover:shadow-lg transition-all cursor-pointer group"
                    data-testid={`yoga-${yoga.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-600 transition-colors">
                        <yoga.icon className="w-6 h-6 text-green-700 group-hover:text-white transition-colors" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-800">{yoga.title}</h4>
                          <Badge className="bg-green-100 text-green-700 text-xs">{yoga.poses} poses</Badge>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">{yoga.desc}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span className="text-xs text-slate-500">{yoga.duration}</span>
                          <Badge variant="outline" className="text-xs ml-auto">{yoga.level}</Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Breathing Content */}
          {activeTab === 'breathing' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">Breathing Exercises</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {breathingExercises.map((breath) => (
                  <Card 
                    key={breath.id} 
                    className="p-4 hover:shadow-lg transition-all cursor-pointer group"
                    data-testid={`breathing-${breath.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                        <Wind className="w-6 h-6 text-blue-700 group-hover:text-white transition-colors" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-800">{breath.title}</h4>
                        <p className="text-sm text-blue-600 font-medium mt-1">{breath.pattern}</p>
                        <p className="text-xs text-slate-500 mt-1">{breath.benefit}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span className="text-xs text-slate-500">{breath.duration}</span>
                          <Button size="sm" variant="ghost" className="ml-auto p-1">
                            <Play className="w-4 h-4 text-blue-600" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Services Grid */}
          <h3 className="text-lg font-semibold text-slate-800 mt-8 mb-4">Professional Services</h3>
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

          {/* Remember Card */}
          <Card className="p-6 bg-gradient-to-r from-slate-800 to-slate-700 text-white text-center">
            <Heart className="w-10 h-10 mx-auto mb-3 opacity-80" />
            <h3 className="text-xl font-bold mb-2">Remember: It's Okay to Ask for Help</h3>
            <p className="opacity-90 mb-4">Your mental health matters. Reach out whenever you need support.</p>
            <p className="text-sm opacity-75">National Suicide Prevention Helpline: 9820466726 (AASRA)</p>
          </Card>
        </main>
      </div>
    </AnimatedPage>
  );
};

export default Serena;

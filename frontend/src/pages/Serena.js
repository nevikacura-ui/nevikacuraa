import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Brain, MessageCircle, Moon, Heart, Sparkles, 
  Calendar, Phone, CheckCircle2, Shield, Clock, Star,
  Play, AlertTriangle, Headphones, ChevronRight, Leaf
} from 'lucide-react';
import { AnimatedPage } from '@/components/PageTransition';

const Serena = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('meditation');

  // Calming imagery
  const images = {
    hero: 'https://images.unsplash.com/photo-1758274526584-7f42956db4b5?w=800',
    meditation: 'https://images.unsplash.com/photo-3094215/pexels-photo-3094215.jpeg',
    yoga: 'https://images.unsplash.com/photo-1758274530259-9a3b144acc9e?w=400',
    breathing: 'https://images.unsplash.com/photo-1732998377326-e5c542a2f690?w=400',
    therapy: 'https://images.pexels.com/photos/7925558/pexels-photo-7925558.jpeg'
  };

  // Services with calming themes
  const services = [
    { emoji: '🧠', title: 'Stress & Anxiety Care', desc: 'Expert counseling for stress, anxiety & panic disorders', color: 'bg-purple-100' },
    { emoji: '🌙', title: 'Sleep Wellness', desc: 'Insomnia, sleep hygiene & circadian rhythm guidance', color: 'bg-indigo-100' },
    { emoji: '💜', title: 'Depression Support', desc: 'Compassionate care for mood disorders', color: 'bg-pink-100' },
    { emoji: '🌳', title: 'Guided Meditation', desc: 'Daily meditation sessions & mindfulness programs', color: 'bg-green-100' },
    { emoji: '🌬️', title: 'Breathwork & Yoga', desc: 'Breathing exercises & calming yoga practices', color: 'bg-teal-100' },
    { emoji: '💬', title: 'Therapy Sessions', desc: 'One-on-one counseling with certified therapists', color: 'bg-blue-100' }
  ];

  // Crisis Helpline Numbers
  const helplines = [
    { name: 'iCall', number: '9152987821', desc: 'TISS Mumbai (Mon-Sat 8am-10pm)', type: 'call', emoji: '📞' },
    { name: 'Vandrevala Foundation', number: '1860-2662-345', desc: '24/7 Free Mental Health Support', type: 'call', emoji: '🆘' },
    { name: 'AASRA', number: '9820466726', desc: '24/7 Crisis Intervention', type: 'call', emoji: '❤️' },
    { name: 'iCall WhatsApp', number: '9152987821', desc: 'Chat support available', type: 'whatsapp', emoji: '💬' }
  ];

  // Meditation content with calming visuals
  const meditations = [
    { id: 1, title: 'Morning Calm', duration: '10 min', emoji: '🌅', desc: 'Start your day with peace', level: 'Beginner', color: 'from-amber-200 to-orange-300' },
    { id: 2, title: 'Stress Relief', duration: '15 min', emoji: '🌿', desc: 'Release tension & anxiety', level: 'All Levels', color: 'from-green-200 to-teal-300' },
    { id: 3, title: 'Deep Sleep', duration: '20 min', emoji: '🌙', desc: 'Drift into restful sleep', level: 'All Levels', color: 'from-indigo-200 to-purple-300' },
    { id: 4, title: 'Body Scan', duration: '12 min', emoji: '✨', desc: 'Full body relaxation', level: 'Intermediate', color: 'from-blue-200 to-cyan-300' },
    { id: 5, title: 'Gratitude Practice', duration: '8 min', emoji: '🙏', desc: 'Cultivate thankfulness', level: 'Beginner', color: 'from-pink-200 to-rose-300' },
    { id: 6, title: 'Mindful Eating', duration: '5 min', emoji: '🍃', desc: 'Present moment awareness', level: 'Beginner', color: 'from-lime-200 to-green-300' }
  ];

  // Yoga exercises
  const yogaExercises = [
    { id: 1, title: 'Sun Salutation', duration: '15 min', emoji: '☀️', desc: 'Energizing morning flow', level: 'Beginner', poses: 12, color: 'from-yellow-200 to-amber-300' },
    { id: 2, title: 'Stress Relief Yoga', duration: '20 min', emoji: '🧘', desc: 'Gentle stretches for calm', level: 'All Levels', poses: 8, color: 'from-teal-200 to-cyan-300' },
    { id: 3, title: "Child's Pose Flow", duration: '10 min', emoji: '🌸', desc: 'Restorative sequence', level: 'Beginner', poses: 5, color: 'from-pink-200 to-rose-300' },
    { id: 4, title: 'Anxiety Relief', duration: '15 min', emoji: '💜', desc: 'Calming forward folds', level: 'Beginner', poses: 7, color: 'from-purple-200 to-violet-300' },
    { id: 5, title: 'Sleep Yoga', duration: '12 min', emoji: '🌜', desc: 'Before bed stretches', level: 'All Levels', poses: 6, color: 'from-indigo-200 to-blue-300' },
    { id: 6, title: 'Desk Yoga', duration: '8 min', emoji: '💻', desc: 'Office-friendly stretches', level: 'Beginner', poses: 5, color: 'from-gray-200 to-slate-300' }
  ];

  // Breathing exercises
  const breathingExercises = [
    { id: 1, title: '4-7-8 Breathing', duration: '5 min', pattern: 'Inhale 4s, Hold 7s, Exhale 8s', benefit: 'Reduces anxiety & helps sleep', emoji: '🌊', color: 'from-blue-300 to-cyan-400' },
    { id: 2, title: 'Box Breathing', duration: '5 min', pattern: 'Inhale 4s, Hold 4s, Exhale 4s, Hold 4s', benefit: 'Calms nervous system', emoji: '📦', color: 'from-purple-300 to-violet-400' },
    { id: 3, title: 'Alternate Nostril', duration: '8 min', pattern: 'Nadi Shodhana pranayama', benefit: 'Balances mind & body', emoji: '🔄', color: 'from-teal-300 to-emerald-400' },
    { id: 4, title: 'Belly Breathing', duration: '5 min', pattern: 'Deep diaphragmatic breathing', benefit: 'Reduces stress hormones', emoji: '🎈', color: 'from-amber-300 to-yellow-400' }
  ];

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-gradient-to-b from-violet-50 via-purple-50 to-white" data-testid="serena-page">
        {/* Header - Calming Purple Gradient */}
        <header className="bg-gradient-to-r from-violet-600 to-purple-600 text-white sticky top-0 z-50">
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
                <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center bg-white/20 backdrop-blur-sm">
                  <img 
                    src="https://customer-assets.emergentagent.com/job_medportal-nevika/artifacts/rnobb9t9_90.png" 
                    alt="Serena" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-wide flex items-center gap-2">
                    SERENA <Leaf className="w-5 h-5 text-green-300" />
                  </h1>
                  <p className="text-sm text-purple-200">Find Your Inner Peace</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* CRISIS HELPLINE BANNER */}
        <div className="bg-gradient-to-r from-rose-500 to-red-500 text-white">
          <div className="max-w-5xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Need immediate help? You're not alone.</p>
                  <p className="text-xs opacity-90">24/7 Crisis Support Available</p>
                </div>
              </div>
              <a 
                href="tel:9820466726" 
                className="flex items-center gap-2 bg-white text-red-600 px-5 py-2.5 rounded-full font-bold text-sm hover:bg-red-50 transition-all shadow-lg"
                data-testid="crisis-helpline-btn"
              >
                <Phone className="w-4 h-4" />
                AASRA: 9820466726
              </a>
            </div>
          </div>
        </div>

        {/* Trust Badges - Calming Colors */}
        <div className="bg-white/80 backdrop-blur-sm border-b border-purple-100">
          <div className="max-w-5xl mx-auto px-4 py-3">
            <div className="flex justify-between items-center gap-3 overflow-x-auto">
              {[
                { emoji: '🔒', text: '100% Confidential', bg: 'bg-purple-50 text-purple-700' },
                { emoji: '⚡', text: 'Same-day Sessions', bg: 'bg-blue-50 text-blue-700' },
                { emoji: '⭐', text: 'Certified Therapists', bg: 'bg-amber-50 text-amber-700' },
                { emoji: '📞', text: '24/7 Support Line', bg: 'bg-green-50 text-green-700' }
              ].map((feature, idx) => (
                <div key={idx} className={`flex items-center gap-2 px-3 py-1.5 rounded-full flex-shrink-0 ${feature.bg}`}>
                  <span className="text-lg">{feature.emoji}</span>
                  <span className="text-xs font-semibold whitespace-nowrap">{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-5xl mx-auto px-4 py-6">
          {/* Hero Section with Calming Image */}
          <Card className="overflow-hidden mb-6 border-0 shadow-xl">
            <div className="relative h-56 sm:h-64">
              <img 
                src={images.hero}
                alt="Peaceful meditation"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-violet-900/80 via-purple-900/60 to-transparent" />
              <div className="absolute inset-0 p-6 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-3xl">🧘</span>
                  <span className="text-3xl">🌿</span>
                  <span className="text-3xl">✨</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  Mental Wellness & Meditation
                </h2>
                <p className="text-purple-100 text-sm sm:text-base max-w-md mb-4">
                  Find your inner peace with expert guidance. Meditation, therapy, and mindfulness programs for emotional wellbeing.
                </p>
                <div className="flex gap-3 flex-wrap">
                  <Button className="bg-white text-purple-700 hover:bg-purple-50 rounded-full shadow-lg" data-testid="serena-book-btn">
                    <Calendar className="w-4 h-4 mr-2" />
                    Book Session
                  </Button>
                  <Button variant="outline" className="rounded-full border-white/50 text-white hover:bg-white/20">
                    <Phone className="w-4 h-4 mr-2" />
                    Talk to Someone
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Helpline Numbers - Soft Card */}
          <Card className="p-5 mb-6 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 shadow-md">
            <h3 className="font-bold text-amber-800 mb-4 flex items-center gap-2 text-lg">
              <span className="text-2xl">🆘</span>
              Mental Health Helplines (India)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {helplines.map((helpline, idx) => (
                <a
                  key={idx}
                  href={helpline.type === 'whatsapp' ? `https://wa.me/91${helpline.number.replace(/-/g, '')}` : `tel:${helpline.number.replace(/-/g, '')}`}
                  className="flex items-center gap-3 p-4 bg-white rounded-2xl hover:shadow-lg transition-all group"
                  data-testid={`helpline-${idx}`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${helpline.type === 'whatsapp' ? 'bg-green-100' : 'bg-blue-100'} group-hover:scale-110 transition-transform`}>
                    <span className="text-2xl">{helpline.emoji}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-800">{helpline.name}</p>
                    <p className="text-xs text-gray-500">{helpline.desc}</p>
                    <p className="text-sm font-bold text-purple-700 mt-1">{helpline.number}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-purple-500 transition-colors" />
                </a>
              ))}
            </div>
          </Card>

          {/* Tabs - Calming Style */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {[
              { id: 'meditation', label: 'Meditation', emoji: '🧘' },
              { id: 'yoga', label: 'Yoga', emoji: '🌸' },
              { id: 'breathing', label: 'Breathing', emoji: '🌬️' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab.id 
                    ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg shadow-purple-200' 
                    : 'bg-white text-gray-600 hover:bg-purple-50 border border-purple-100'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <span className="text-lg">{tab.emoji}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Meditation Content */}
          {activeTab === 'meditation' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">🧘</span>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Guided Meditations</h3>
                  <p className="text-sm text-gray-500">Find calm with our curated sessions</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {meditations.map((med) => (
                  <Card 
                    key={med.id} 
                    className="overflow-hidden hover:shadow-xl transition-all cursor-pointer group"
                    data-testid={`meditation-${med.id}`}
                  >
                    <div className={`h-20 bg-gradient-to-r ${med.color} flex items-center justify-center`}>
                      <span className="text-5xl group-hover:scale-110 transition-transform">{med.emoji}</span>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-gray-800">{med.title}</h4>
                        <Badge variant="outline" className="text-xs">{med.level}</Badge>
                      </div>
                      <p className="text-sm text-gray-500 mb-3">{med.desc}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-gray-400">
                          <Clock className="w-4 h-4" />
                          <span className="text-xs">{med.duration}</span>
                        </div>
                        <Button size="sm" className="rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200">
                          <Play className="w-4 h-4 mr-1" /> Play
                        </Button>
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
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">🌸</span>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Yoga for Mental Wellness</h3>
                  <p className="text-sm text-gray-500">Gentle practices for mind-body balance</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {yogaExercises.map((yoga) => (
                  <Card 
                    key={yoga.id} 
                    className="overflow-hidden hover:shadow-xl transition-all cursor-pointer group"
                    data-testid={`yoga-${yoga.id}`}
                  >
                    <div className={`h-20 bg-gradient-to-r ${yoga.color} flex items-center justify-center`}>
                      <span className="text-5xl group-hover:scale-110 transition-transform">{yoga.emoji}</span>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-gray-800">{yoga.title}</h4>
                        <Badge className="bg-green-100 text-green-700 text-xs">{yoga.poses} poses</Badge>
                      </div>
                      <p className="text-sm text-gray-500 mb-3">{yoga.desc}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-gray-400">
                            <Clock className="w-4 h-4" />
                            <span className="text-xs">{yoga.duration}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">{yoga.level}</Badge>
                        </div>
                        <Button size="sm" className="rounded-full bg-teal-100 text-teal-700 hover:bg-teal-200">
                          Start
                        </Button>
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
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">🌬️</span>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Breathing Exercises</h3>
                  <p className="text-sm text-gray-500">Simple techniques for instant calm</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {breathingExercises.map((breath) => (
                  <Card 
                    key={breath.id} 
                    className="overflow-hidden hover:shadow-xl transition-all cursor-pointer group"
                    data-testid={`breathing-${breath.id}`}
                  >
                    <div className={`h-24 bg-gradient-to-r ${breath.color} flex items-center justify-center relative`}>
                      <span className="text-5xl group-hover:scale-110 transition-transform">{breath.emoji}</span>
                      <div className="absolute bottom-2 right-3">
                        <Badge className="bg-white/80 text-gray-700">{breath.duration}</Badge>
                      </div>
                    </div>
                    <div className="p-4">
                      <h4 className="font-bold text-gray-800 mb-1">{breath.title}</h4>
                      <p className="text-sm text-purple-600 font-medium mb-2">{breath.pattern}</p>
                      <p className="text-xs text-gray-500 mb-3">{breath.benefit}</p>
                      <Button size="sm" className="w-full rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200">
                        <Play className="w-4 h-4 mr-1" /> Start Exercise
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Services Grid */}
          <h3 className="text-xl font-bold text-gray-800 mt-10 mb-4 flex items-center gap-2">
            <span className="text-2xl">💼</span>
            Professional Services
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            {services.map((service, idx) => (
              <Card key={idx} className={`p-4 hover:shadow-xl transition-all cursor-pointer group ${service.color}`} data-testid={`serena-service-${idx}`}>
                <span className="text-4xl mb-3 block group-hover:scale-110 transition-transform">{service.emoji}</span>
                <h4 className="font-bold text-gray-800 mb-1">{service.title}</h4>
                <p className="text-sm text-gray-600">{service.desc}</p>
              </Card>
            ))}
          </div>

          {/* Remember Card - Calming */}
          <Card className="p-6 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-center overflow-hidden relative">
            <div className="absolute top-0 right-0 opacity-10">
              <Heart className="w-40 h-40" />
            </div>
            <span className="text-5xl mb-4 block">💜</span>
            <h3 className="text-xl font-bold mb-2 relative z-10">Remember: It's Okay to Ask for Help</h3>
            <p className="opacity-90 mb-4 relative z-10">Your mental health matters. Reach out whenever you need support.</p>
            <div className="bg-white/20 rounded-2xl p-3 inline-block relative z-10">
              <p className="text-sm font-medium">National Suicide Prevention Helpline</p>
              <p className="text-lg font-bold">9820466726 (AASRA)</p>
            </div>
          </Card>
        </main>
      </div>
    </AnimatedPage>
  );
};

export default Serena;

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  ArrowLeft, Dumbbell, Activity, Heart, Footprints, Flame,
  Calendar, CheckCircle2, Clock, Award, Play, Target, Zap,
  Home, User, ChevronRight, Timer, RotateCcw, Pause, Volume2,
  AlertTriangle, Stethoscope, TestTube, Plus, Minus, X,
  Sun, Moon, Wind, Brain, Bike, PersonStanding, Trophy,
  TrendingUp, Ruler, Scale, Droplets, Apple, Pill
} from 'lucide-react';
import { AnimatedPage } from '@/components/PageTransition';
import BottomNav from '@/components/BottomNav';

const API = process.env.REACT_APP_BACKEND_URL;

const Thrive360New = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('programs');
  const [activeMode, setActiveMode] = useState('gym');
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [showWorkoutDialog, setShowWorkoutDialog] = useState(false);
  const [showTimerDialog, setShowTimerDialog] = useState(false);
  const [showInjuryDialog, setShowInjuryDialog] = useState(false);
  const [showVitaminDialog, setShowVitaminDialog] = useState(false);
  
  // Timer state
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [currentSet, setCurrentSet] = useState(1);
  const [currentRep, setCurrentRep] = useState(0);
  const timerRef = useRef(null);

  // Core programs with fitness images
  const programs = [
    { 
      id: 'strength',
      title: 'Strength Training', 
      desc: 'Build muscle & get stronger',
      color: '#FF6B6B',
      bgColor: '#FFE8E8',
      emoji: '💪',
      levels: ['Beginner', 'Intermediate', 'Advanced'],
      duration: '45-60 min'
    },
    { 
      id: 'yoga',
      title: 'Yoga & Meditation', 
      desc: 'Mind-body wellness',
      color: '#9B59B6',
      bgColor: '#F3E5F5',
      emoji: '🧘',
      levels: ['Morning', 'Evening', 'Stress Relief'],
      duration: '20-45 min'
    },
    { 
      id: 'physio',
      title: 'Physiotherapy', 
      desc: 'Injury recovery & rehab',
      color: '#00BCD4',
      bgColor: '#E0F7FA',
      emoji: '🏥',
      levels: ['Knee', 'Back', 'Shoulder'],
      duration: '30-40 min'
    },
    { 
      id: 'weight',
      title: 'Weight Loss', 
      desc: 'Burn fat effectively',
      color: '#4CAF50',
      bgColor: '#E8F5E9',
      emoji: '🔥',
      levels: ['Fat Loss', 'Toning', 'Maintenance'],
      duration: '45 min'
    },
    { 
      id: 'cardio',
      title: 'Cardio & HIIT', 
      desc: 'Heart-pumping workouts',
      color: '#FF9800',
      bgColor: '#FFF3E0',
      emoji: '❤️',
      levels: ['Low', 'Medium', 'High Intensity'],
      duration: '30-45 min'
    },
    { 
      id: 'sports',
      title: 'Sports Training', 
      desc: 'Athletic performance',
      color: '#3F51B5',
      bgColor: '#E8EAF6',
      emoji: '🏆',
      levels: ['Cricket', 'Football', 'Badminton'],
      duration: '45-60 min'
    }
  ];

  // Running plans
  const runningPlans = [
    { name: 'Couch to 5K', weeks: 8, level: 'Beginner', goal: '5 km', color: '#FF6B6B', emoji: '🏃' },
    { name: '10K Training', weeks: 10, level: 'Intermediate', goal: '10 km', color: '#FF9800', emoji: '🏃‍♂️' },
    { name: 'Half Marathon', weeks: 12, level: 'Advanced', goal: '21.1 km', color: '#9B59B6', emoji: '🏅' },
    { name: 'Speed Builder', weeks: 6, level: 'Intermediate', goal: 'Faster pace', color: '#4CAF50', emoji: '⚡' }
  ];

  // Gym schedules
  const gymSchedules = {
    '3day': {
      name: '3-Day Split',
      desc: 'Perfect for beginners',
      color: '#FF6B6B',
      days: [
        { day: 'Day 1', focus: 'Chest + Triceps', exercises: ['Bench Press', 'Incline Dumbbell', 'Tricep Dips', 'Pushdowns'] },
        { day: 'Day 2', focus: 'Back + Biceps', exercises: ['Deadlift', 'Lat Pulldown', 'Barbell Rows', 'Bicep Curls'] },
        { day: 'Day 3', focus: 'Legs + Core', exercises: ['Squats', 'Leg Press', 'Lunges', 'Planks'] }
      ]
    },
    '6day': {
      name: '6-Day PPL',
      desc: 'Push/Pull/Legs x 2',
      color: '#9B59B6',
      days: [
        { day: 'Day 1', focus: 'Push', exercises: ['Bench Press', 'Shoulder Press', 'Lateral Raises', 'Tricep Extensions'] },
        { day: 'Day 2', focus: 'Pull', exercises: ['Pull-ups', 'Barbell Rows', 'Face Pulls', 'Hammer Curls'] },
        { day: 'Day 3', focus: 'Legs', exercises: ['Squats', 'Romanian Deadlift', 'Leg Curls', 'Calf Raises'] },
        { day: 'Day 4', focus: 'Push', exercises: ['Incline Press', 'Arnold Press', 'Cable Flyes', 'Overhead Extensions'] },
        { day: 'Day 5', focus: 'Pull', exercises: ['Deadlift', 'Cable Rows', 'Rear Delt Flyes', 'Preacher Curls'] },
        { day: 'Day 6', focus: 'Legs', exercises: ['Front Squats', 'Leg Press', 'Walking Lunges', 'Leg Extensions'] }
      ]
    }
  };

  // Vitamin tests
  const vitaminTests = [
    { name: 'Vitamin D', symptoms: ['Fatigue', 'Bone pain'], price: 599 },
    { name: 'Vitamin B12', symptoms: ['Tiredness', 'Numbness'], price: 499 },
    { name: 'Iron Profile', symptoms: ['Hair fall', 'Weakness'], price: 699 },
    { name: 'Complete Panel', symptoms: ['Full check'], price: 1499 }
  ];

  // Timer functions
  useEffect(() => {
    if (isTimerRunning && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            if (navigator.vibrate) navigator.vibrate(500);
            setIsTimerRunning(false);
            toast.success('⏰ Rest complete! Go again!');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerRunning, timerSeconds]);

  const startTimer = (seconds) => {
    setTimerSeconds(seconds);
    setIsTimerRunning(true);
  };

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#FAFAFA] pb-20" data-testid="thrive360-page">
        {/* Vibrant Header */}
        <header className="bg-[#FF6B6B] text-white sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
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
                <div>
                  <h1 className="text-2xl font-black tracking-tight">THRIVE360</h1>
                  <p className="text-sm text-white/90 font-medium">Health in Motion 💪</p>
                </div>
              </div>
              
              <Button 
                onClick={() => setShowTimerDialog(true)}
                className="bg-white text-[#FF6B6B] hover:bg-white/90 rounded-full font-bold"
                data-testid="timer-btn"
              >
                <Timer className="w-5 h-5 mr-1" />
                Timer
              </Button>
            </div>
          </div>
        </header>

        {/* Trust Badges - Colorful Pills */}
        <div className="bg-white border-b shadow-sm py-3 overflow-x-auto">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex gap-3">
              {[
                { icon: '🏆', text: 'Certified Trainers', bg: 'bg-amber-100', color: 'text-amber-700' },
                { icon: '⏰', text: 'Flexible Timings', bg: 'bg-blue-100', color: 'text-blue-700' },
                { icon: '▶️', text: 'Video Guided', bg: 'bg-purple-100', color: 'text-purple-700' },
                { icon: '📊', text: 'Track Progress', bg: 'bg-green-100', color: 'text-green-700' }
              ].map((feature, idx) => (
                <div key={idx} className={`flex items-center gap-2 px-4 py-2 rounded-full ${feature.bg} flex-shrink-0`}>
                  <span className="text-lg">{feature.icon}</span>
                  <span className={`text-sm font-semibold ${feature.color} whitespace-nowrap`}>{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hero Section - Vibrant */}
        <div className="bg-gradient-to-br from-[#FF6B6B] via-[#FF8E53] to-[#FFA726] text-white py-8 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <h2 className="text-3xl sm:text-4xl font-black mb-2">
                  Transform Your Body 🔥
                </h2>
                <p className="text-white/90 mb-6 text-lg">
                  From yoga to HIIT, strength to cardio. Expert-guided programs for everyone.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button 
                    onClick={() => setShowWorkoutDialog(true)}
                    className="bg-white text-[#FF6B6B] hover:bg-white/90 rounded-full px-6 font-bold shadow-lg"
                    data-testid="book-session-btn"
                  >
                    <Calendar className="w-5 h-5 mr-2" />
                    Book Session
                  </Button>
                  <Button 
                    variant="outline"
                    className="border-2 border-white text-white hover:bg-white/20 rounded-full px-6 font-bold"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Watch Demo
                  </Button>
                </div>
              </div>
              {/* Decorative circles */}
              <div className="hidden md:block relative">
                <div className="w-32 h-32 bg-white/20 rounded-full absolute -top-4 -right-4"></div>
                <div className="w-24 h-24 bg-white/30 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Mode Toggle - Pill Style */}
        <div className="bg-white shadow-sm py-4">
          <div className="max-w-5xl mx-auto px-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-slate-700">MODE:</span>
              <div className="flex gap-2 bg-slate-100 p-1 rounded-full">
                <button
                  onClick={() => setActiveMode('gym')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
                    activeMode === 'gym'
                      ? 'bg-[#FF6B6B] text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                  data-testid="mode-gym"
                >
                  <Dumbbell className="w-4 h-4" />
                  Gym
                </button>
                <button
                  onClick={() => setActiveMode('home')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
                    activeMode === 'home'
                      ? 'bg-[#4CAF50] text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                  data-testid="mode-home"
                >
                  <Home className="w-4 h-4" />
                  Home
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section Tabs - Colorful */}
        <div className="bg-white border-b shadow-sm sticky top-[72px] z-40">
          <div className="max-w-5xl mx-auto px-4 py-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                { id: 'programs', label: 'Programs', icon: '🎯', color: '#FF6B6B' },
                { id: 'running', label: 'Running', icon: '🏃', color: '#FF9800' },
                { id: 'schedules', label: 'Schedules', icon: '📅', color: '#9B59B6' },
                { id: 'medical', label: 'Medical', icon: '🏥', color: '#00BCD4' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  style={{ 
                    backgroundColor: activeSection === tab.id ? tab.color : '#F1F5F9',
                    color: activeSection === tab.id ? 'white' : '#475569'
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap shadow-sm"
                  data-testid={`tab-${tab.id}`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">

          {/* PROGRAMS SECTION */}
          {activeSection === 'programs' && (
            <div className="space-y-6">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                🎯 Core Programs
                {activeMode === 'home' && <Badge className="bg-green-100 text-green-700 font-bold">No Equipment</Badge>}
              </h3>
              
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {programs.map((program) => (
                  <Card 
                    key={program.id}
                    className="overflow-hidden hover:shadow-xl transition-all cursor-pointer group border-0 shadow-md"
                    onClick={() => {
                      setSelectedProgram(program);
                      setShowWorkoutDialog(true);
                    }}
                    data-testid={`program-${program.id}`}
                  >
                    <div className="relative">
                      {/* Circular Image */}
                      <div className="absolute top-4 right-4 z-10">
                        <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-white shadow-lg">
                          <img 
                            src={program.image} 
                            alt={program.title}
                            className="w-full h-full object-cover"
                            onError={(e) => e.target.src = `https://via.placeholder.com/100/${program.color.slice(1)}/ffffff?text=${program.title[0]}`}
                          />
                        </div>
                      </div>
                      
                      {/* Colored Header */}
                      <div 
                        className="h-24 flex items-end p-4"
                        style={{ backgroundColor: program.bgColor }}
                      >
                        <h4 
                          className="font-black text-lg"
                          style={{ color: program.color }}
                        >
                          {program.title}
                        </h4>
                      </div>
                    </div>
                    
                    <CardContent className="p-4 pt-2">
                      <p className="text-sm text-slate-500 mb-3">{program.desc}</p>
                      
                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                        <Clock className="w-3 h-3" />
                        {program.duration}
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mb-3">
                        {program.levels.slice(0, 2).map((level, idx) => (
                          <Badge 
                            key={idx} 
                            className="text-xs font-medium"
                            style={{ backgroundColor: program.bgColor, color: program.color }}
                          >
                            {level}
                          </Badge>
                        ))}
                      </div>
                      
                      <Button 
                        className="w-full rounded-full font-bold"
                        style={{ backgroundColor: program.color }}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Start
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* RUNNING SECTION */}
          {activeSection === 'running' && (
            <div className="space-y-6">
              <h3 className="text-xl font-black text-slate-800">🏃 Running Plans</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {runningPlans.map((plan, idx) => (
                  <Card key={idx} className="overflow-hidden hover:shadow-xl transition-all border-0 shadow-md" data-testid={`running-${idx}`}>
                    <div className="flex">
                      {/* Circular Image */}
                      <div className="w-28 flex items-center justify-center p-4" style={{ backgroundColor: `${plan.color}20` }}>
                        <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg">
                          <img 
                            src={plan.image} 
                            alt={plan.name}
                            className="w-full h-full object-cover"
                            onError={(e) => e.target.src = `https://via.placeholder.com/100/${plan.color.slice(1)}/ffffff?text=🏃`}
                          />
                        </div>
                      </div>
                      
                      <div className="flex-1 p-4">
                        <h4 className="font-black text-lg text-slate-800">{plan.name}</h4>
                        <Badge 
                          className="mt-1 font-bold"
                          style={{ backgroundColor: `${plan.color}20`, color: plan.color }}
                        >
                          {plan.level}
                        </Badge>
                        <p className="text-sm text-slate-500 mt-2">Goal: {plan.goal}</p>
                        <p className="text-xs text-slate-400">{plan.weeks} weeks program</p>
                        
                        <Button 
                          className="mt-3 rounded-full font-bold"
                          style={{ backgroundColor: plan.color }}
                        >
                          Start Plan
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Tips Card */}
              <Card className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200 border-2">
                <h4 className="font-black text-orange-700 mb-2 flex items-center gap-2">
                  💡 Pro Tips
                </h4>
                <ul className="text-sm text-orange-600 space-y-1 font-medium">
                  <li>• Warm up 5-10 minutes before running</li>
                  <li>• Stay hydrated - drink before and after</li>
                  <li>• Cool down with stretching</li>
                </ul>
              </Card>
            </div>
          )}

          {/* GYM SCHEDULES SECTION */}
          {activeSection === 'schedules' && (
            <div className="space-y-6">
              <h3 className="text-xl font-black text-slate-800">📅 Gym Schedules</h3>
              
              {Object.entries(gymSchedules).map(([key, schedule]) => (
                <Card key={key} className="overflow-hidden border-0 shadow-lg" data-testid={`schedule-${key}`}>
                  <div 
                    className="py-4 px-5 flex items-center justify-between"
                    style={{ backgroundColor: schedule.color }}
                  >
                    <div>
                      <h4 className="text-xl font-black text-white">{schedule.name}</h4>
                      <p className="text-white/80 text-sm">{schedule.desc}</p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                      <Dumbbell className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {schedule.days.map((day, idx) => (
                        <div 
                          key={idx} 
                          className="rounded-2xl p-4"
                          style={{ backgroundColor: `${schedule.color}10` }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-black text-slate-800">{day.day}</span>
                            <Badge 
                              className="font-bold text-xs"
                              style={{ backgroundColor: `${schedule.color}20`, color: schedule.color }}
                            >
                              {day.focus}
                            </Badge>
                          </div>
                          <ul className="space-y-1">
                            {day.exercises.map((ex, exIdx) => (
                              <li key={exIdx} className="text-sm text-slate-600 flex items-center gap-2">
                                <CheckCircle2 className="w-3 h-3" style={{ color: schedule.color }} />
                                {ex}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                    
                    <Button 
                      className="w-full mt-4 rounded-full font-bold"
                      style={{ backgroundColor: schedule.color }}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Start This Schedule
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* MEDICAL SUPPORT SECTION */}
          {activeSection === 'medical' && (
            <div className="space-y-6">
              <h3 className="text-xl font-black text-slate-800">🏥 Medical Support</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Injury Report */}
                <Card className="p-6 border-2 border-red-100 hover:border-red-300 transition-all shadow-md">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl">🤕</span>
                  </div>
                  <h4 className="font-black text-slate-800 text-xl text-center mb-2">Report Injury</h4>
                  <p className="text-sm text-slate-500 text-center mb-4">
                    Pain during workouts? Get professional guidance.
                  </p>
                  <Button 
                    onClick={() => setShowInjuryDialog(true)}
                    className="w-full bg-[#FF6B6B] hover:bg-red-500 rounded-full font-bold"
                    data-testid="report-injury-btn"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Report Now
                  </Button>
                </Card>

                {/* Vitamin Check */}
                <Card className="p-6 border-2 border-green-100 hover:border-green-300 transition-all shadow-md">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl">💊</span>
                  </div>
                  <h4 className="font-black text-slate-800 text-xl text-center mb-2">Vitamin Check</h4>
                  <p className="text-sm text-slate-500 text-center mb-4">
                    Fatigue? Cramps? Check your vitamin levels.
                  </p>
                  <Button 
                    onClick={() => setShowVitaminDialog(true)}
                    className="w-full bg-[#4CAF50] hover:bg-green-600 rounded-full font-bold"
                    data-testid="vitamin-check-btn"
                  >
                    <TestTube className="w-4 h-4 mr-2" />
                    Check Now
                  </Button>
                </Card>
              </div>

              {/* Doctor Card */}
              <Card className="p-5 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-3xl">👨‍⚕️</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-black text-blue-800 text-lg">Sports Medicine</h4>
                    <p className="text-sm text-blue-600">Dr. Vikas - Orthopedic Specialist</p>
                    <Button 
                      onClick={() => navigate('/diagyn?doctor=vikas')}
                      className="mt-2 bg-blue-500 hover:bg-blue-600 rounded-full font-bold"
                    >
                      Book Consult
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}

        </main>

        {/* Timer Dialog - Vibrant */}
        <Dialog open={showTimerDialog} onOpenChange={setShowTimerDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-black">
                ⏱️ Workout Timer
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-center py-8 bg-gradient-to-br from-[#FF6B6B] to-[#FF8E53] rounded-3xl">
                <div className="text-7xl font-black text-white font-mono">
                  {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
                </div>
                <p className="text-white/80 mt-2 font-bold">
                  {isTimerRunning ? '💪 GO GO GO!' : 'Ready to rest?'}
                </p>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[30, 45, 60, 90].map((sec) => (
                  <Button
                    key={sec}
                    onClick={() => startTimer(sec)}
                    className="rounded-full bg-slate-100 text-slate-700 hover:bg-[#FF6B6B] hover:text-white font-bold"
                  >
                    {sec}s
                  </Button>
                ))}
              </div>

              <div className="flex gap-2">
                {!isTimerRunning ? (
                  <Button onClick={() => startTimer(timerSeconds)} className="flex-1 bg-[#4CAF50] hover:bg-green-600 rounded-full font-bold">
                    <Play className="w-5 h-5 mr-2" />
                    Start
                  </Button>
                ) : (
                  <Button onClick={() => setIsTimerRunning(false)} className="flex-1 bg-[#FF9800] hover:bg-orange-600 rounded-full font-bold">
                    <Pause className="w-5 h-5 mr-2" />
                    Pause
                  </Button>
                )}
                <Button onClick={() => { setIsTimerRunning(false); setTimerSeconds(60); }} variant="outline" className="rounded-full">
                  <RotateCcw className="w-5 h-5" />
                </Button>
              </div>

              {/* Set/Rep Counter */}
              <div className="bg-slate-100 rounded-2xl p-4">
                <div className="flex items-center justify-around">
                  <div className="text-center">
                    <p className="text-xs text-slate-500 font-bold">SET</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Button size="icon" variant="outline" onClick={() => setCurrentSet(Math.max(1, currentSet - 1))} className="h-8 w-8 rounded-full">
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="text-3xl font-black text-[#FF6B6B] w-10 text-center">{currentSet}</span>
                      <Button size="icon" variant="outline" onClick={() => setCurrentSet(currentSet + 1)} className="h-8 w-8 rounded-full">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500 font-bold">REPS</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Button size="icon" variant="outline" onClick={() => setCurrentRep(Math.max(0, currentRep - 1))} className="h-8 w-8 rounded-full">
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="text-3xl font-black text-[#4CAF50] w-10 text-center">{currentRep}</span>
                      <Button size="icon" variant="outline" onClick={() => setCurrentRep(currentRep + 1)} className="h-8 w-8 rounded-full">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Injury Dialog */}
        <Dialog open={showInjuryDialog} onOpenChange={setShowInjuryDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-black text-red-600">
                🤕 Report Injury
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="font-bold">Where does it hurt?</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {['Knee', 'Back', 'Shoulder', 'Ankle', 'Wrist', 'Neck'].map((area) => (
                    <Button key={area} variant="outline" className="rounded-full font-bold">
                      {area}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="font-bold">Pain Level (1-10)</Label>
                <div className="flex gap-1 mt-2">
                  {[1,2,3,4,5,6,7,8,9,10].map((level) => (
                    <button
                      key={level}
                      className={`w-8 h-8 rounded-full text-sm font-bold ${
                        level <= 3 ? 'bg-green-100 text-green-700' :
                        level <= 6 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      } hover:scale-110 transition-transform`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-full font-bold" onClick={() => setShowInjuryDialog(false)}>
                  Start Physio
                </Button>
                <Button className="flex-1 bg-[#FF6B6B] rounded-full font-bold" onClick={() => { navigate('/diagyn?doctor=vikas'); setShowInjuryDialog(false); }}>
                  See Doctor
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Vitamin Dialog */}
        <Dialog open={showVitaminDialog} onOpenChange={setShowVitaminDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-black text-green-600">
                💊 Vitamin Tests
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {vitaminTests.map((test, idx) => (
                <Card 
                  key={idx} 
                  className="p-4 hover:shadow-lg cursor-pointer transition-all border-2 hover:border-green-300"
                  onClick={() => { toast.success(`${test.name} booked! Lab will call you.`); setShowVitaminDialog(false); }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-800">{test.name}</h4>
                      <div className="flex gap-1 mt-1">
                        {test.symptoms.map((s, sIdx) => (
                          <Badge key={sIdx} variant="outline" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-green-600 text-lg">₹{test.price}</span>
                      <p className="text-xs text-slate-400">Home Collection</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Workout Booking Dialog */}
        <Dialog open={showWorkoutDialog} onOpenChange={setShowWorkoutDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-black">
                📅 Book {selectedProgram?.title || 'Session'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="font-bold">Session Type</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button variant="outline" className="rounded-full font-bold">
                    <Play className="w-4 h-4 mr-2" />
                    Video
                  </Button>
                  <Button variant="outline" className="rounded-full font-bold">
                    <User className="w-4 h-4 mr-2" />
                    In-Person
                  </Button>
                </div>
              </div>
              <div>
                <Label className="font-bold">Date</Label>
                <Input type="date" className="mt-2 rounded-xl" />
              </div>
              <div>
                <Label className="font-bold">Time</Label>
                <select className="w-full border rounded-xl px-3 py-2 mt-2">
                  <option>🌅 Morning (6-9 AM)</option>
                  <option>☀️ Mid-Day (9-12 PM)</option>
                  <option>🌆 Evening (5-8 PM)</option>
                </select>
              </div>
              <Button 
                className="w-full rounded-full font-bold text-lg py-6"
                style={{ backgroundColor: selectedProgram?.color || '#FF6B6B' }}
                onClick={() => {
                  toast.success('🎉 Session booked! Trainer will contact you.');
                  setShowWorkoutDialog(false);
                }}
              >
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Confirm Booking
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <BottomNav />
      </div>
    </AnimatedPage>
  );
};

export default Thrive360New;

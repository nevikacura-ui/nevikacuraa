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
  const [activeMode, setActiveMode] = useState('gym'); // 'gym' or 'home'
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [showWorkoutDialog, setShowWorkoutDialog] = useState(false);
  const [showTimerDialog, setShowTimerDialog] = useState(false);
  const [showInjuryDialog, setShowInjuryDialog] = useState(false);
  const [showVitaminDialog, setShowVitaminDialog] = useState(false);
  
  // Timer state
  const [timerMode, setTimerMode] = useState('rest'); // 'rest', 'hiit', 'rep'
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [currentSet, setCurrentSet] = useState(1);
  const [currentRep, setCurrentRep] = useState(0);
  const timerRef = useRef(null);
  
  // User profile
  const [userProfile, setUserProfile] = useState({
    name: '',
    goal: 'fitness', // 'fitness', 'weight_loss', 'muscle_gain', 'rehab'
    fitnessLevel: 'beginner',
    injuries: []
  });

  // Core programs
  const programs = [
    { 
      id: 'strength',
      icon: Dumbbell, 
      title: 'Strength Training', 
      desc: 'Personalized workout plans & guidance',
      color: 'from-red-500 to-orange-600',
      levels: ['Beginner', 'Intermediate', 'Advanced'],
      duration: '45-60 min'
    },
    { 
      id: 'yoga',
      icon: PersonStanding, 
      title: 'Yoga & Meditation', 
      desc: 'Mind-body wellness programs',
      color: 'from-purple-500 to-violet-600',
      levels: ['Morning Routine', 'Evening Calm', 'Stress Relief'],
      duration: '20-45 min'
    },
    { 
      id: 'physio',
      icon: Footprints, 
      title: 'Physiotherapy', 
      desc: 'Injury recovery & mobility improvement',
      color: 'from-teal-500 to-cyan-600',
      levels: ['Knee Pain', 'Back Pain', 'Shoulder'],
      duration: '30-40 min'
    },
    { 
      id: 'weight',
      icon: Scale, 
      title: 'Weight Management', 
      desc: 'Fat loss & muscle building programs',
      color: 'from-green-500 to-emerald-600',
      levels: ['Fat Loss', 'Muscle Gain', 'Maintenance'],
      duration: '45 min'
    },
    { 
      id: 'cardio',
      icon: Heart, 
      title: 'Cardio Fitness', 
      desc: 'Heart-healthy exercise routines',
      color: 'from-pink-500 to-rose-600',
      levels: ['Walking', 'Running', 'Cycling'],
      duration: '30-60 min'
    },
    { 
      id: 'sports',
      icon: Trophy, 
      title: 'Sports Rehab', 
      desc: 'Athletic performance & recovery',
      color: 'from-amber-500 to-yellow-600',
      levels: ['Cricket', 'Football', 'Badminton'],
      duration: '45-60 min'
    }
  ];

  // Running plans
  const runningPlans = [
    { name: 'Couch to 5K', weeks: 8, level: 'Beginner', goal: '5 km in 8 weeks' },
    { name: '10K Training', weeks: 10, level: 'Intermediate', goal: '10 km comfortably' },
    { name: 'Half Marathon', weeks: 12, level: 'Advanced', goal: '21.1 km race ready' },
    { name: 'Speed Builder', weeks: 6, level: 'Intermediate', goal: 'Improve pace' }
  ];

  // Gym schedules
  const gymSchedules = {
    '3day': {
      name: '3-Day Split',
      desc: 'Perfect for beginners',
      days: [
        { day: 'Day 1', focus: 'Chest + Triceps', exercises: ['Bench Press', 'Incline Dumbbell', 'Tricep Dips', 'Pushdowns'] },
        { day: 'Day 2', focus: 'Back + Biceps', exercises: ['Deadlift', 'Lat Pulldown', 'Barbell Rows', 'Bicep Curls'] },
        { day: 'Day 3', focus: 'Legs + Core', exercises: ['Squats', 'Leg Press', 'Lunges', 'Planks'] }
      ]
    },
    '6day': {
      name: '6-Day PPL Split',
      desc: 'Push/Pull/Legs x 2',
      days: [
        { day: 'Day 1', focus: 'Push (Chest/Shoulder/Tri)', exercises: ['Bench Press', 'Shoulder Press', 'Lateral Raises', 'Tricep Extensions'] },
        { day: 'Day 2', focus: 'Pull (Back/Biceps)', exercises: ['Pull-ups', 'Barbell Rows', 'Face Pulls', 'Hammer Curls'] },
        { day: 'Day 3', focus: 'Legs', exercises: ['Squats', 'Romanian Deadlift', 'Leg Curls', 'Calf Raises'] },
        { day: 'Day 4', focus: 'Push', exercises: ['Incline Press', 'Arnold Press', 'Cable Flyes', 'Overhead Extensions'] },
        { day: 'Day 5', focus: 'Pull', exercises: ['Deadlift', 'Cable Rows', 'Rear Delt Flyes', 'Preacher Curls'] },
        { day: 'Day 6', focus: 'Legs', exercises: ['Front Squats', 'Leg Press', 'Walking Lunges', 'Leg Extensions'] }
      ]
    }
  };

  // Vitamin checks
  const vitaminTests = [
    { name: 'Vitamin D', symptoms: ['Fatigue', 'Bone pain', 'Muscle weakness'], price: 599 },
    { name: 'Vitamin B12', symptoms: ['Tiredness', 'Weakness', 'Numbness'], price: 499 },
    { name: 'Iron Profile', symptoms: ['Hair fall', 'Pale skin', 'Breathlessness'], price: 699 },
    { name: 'Complete Vitamin Panel', symptoms: ['Overall health check'], price: 1499 }
  ];

  // Timer functions
  useEffect(() => {
    if (isTimerRunning && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            // Play sound or vibrate
            if (navigator.vibrate) navigator.vibrate(500);
            setIsTimerRunning(false);
            toast.success('Timer Complete! Rest over.');
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

  const pauseTimer = () => {
    setIsTimerRunning(false);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimerSeconds(60);
  };

  const handleInjuryReport = () => {
    setShowInjuryDialog(true);
  };

  const handleVitaminCheck = () => {
    setShowVitaminDialog(true);
  };

  const bookDoctorConsult = () => {
    toast.success('Redirecting to orthopedic consultation...');
    navigate('/diagyn?doctor=vikas&type=ortho');
  };

  const bookVitaminTest = (test) => {
    toast.success(`${test.name} test booked! Proton Diagnostics will call you.`);
    setShowVitaminDialog(false);
  };

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#F5F5F4] pb-20" data-testid="thrive360-page">
        {/* Header */}
        <header className="bg-gradient-to-r from-[#1a1a3e] to-[#2d2d5a] text-white sticky top-0 z-50">
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
              
              {/* Quick Timer Button */}
              <Button 
                onClick={() => setShowTimerDialog(true)}
                variant="ghost"
                className="rounded-full bg-white/20 hover:bg-white/30"
                data-testid="timer-btn"
              >
                <Timer className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Trust Badges */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 py-3">
            <div className="flex justify-between items-center gap-4 overflow-x-auto">
              {[
                { icon: Award, text: 'Certified Trainers' },
                { icon: Clock, text: 'Flexible Timings' },
                { icon: Play, text: 'Video Guided' },
                { icon: CheckCircle2, text: 'Progress Tracking' }
              ].map((feature, idx) => (
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

        {/* Hero Section */}
        <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 text-white py-8 px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Fitness, Yoga & Physical Wellness</h2>
            <p className="text-white/80 mb-6 max-w-xl">
              Transform your body and mind with expert-guided fitness programs. From yoga to strength training, we have something for everyone.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={() => setShowWorkoutDialog(true)}
                className="bg-white text-indigo-900 hover:bg-white/90 rounded-xl"
                data-testid="book-session-btn"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Book Session
              </Button>
              <Button 
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 rounded-xl"
              >
                <Play className="w-4 h-4 mr-2" />
                Watch Demo
              </Button>
            </div>
          </div>
        </div>

        {/* Mode Selector: Gym vs Home */}
        <div className="bg-white border-b shadow-sm">
          <div className="max-w-5xl mx-auto px-4 py-3">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-slate-600">Workout Mode:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveMode('gym')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activeMode === 'gym'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  data-testid="mode-gym"
                >
                  <Dumbbell className="w-4 h-4" />
                  Gym Workout
                </button>
                <button
                  onClick={() => setActiveMode('home')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activeMode === 'home'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  data-testid="mode-home"
                >
                  <Home className="w-4 h-4" />
                  Home Exercise
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="bg-white border-b shadow-sm">
          <div className="max-w-5xl mx-auto px-4 py-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {[
                { id: 'programs', label: 'Programs', icon: Target },
                { id: 'running', label: 'Running', icon: Footprints },
                { id: 'schedules', label: 'Gym Schedules', icon: Calendar },
                { id: 'medical', label: 'Medical Support', icon: Stethoscope }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                    activeSection === tab.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  data-testid={`tab-${tab.id}`}
                >
                  <tab.icon className="w-4 h-4" />
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
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-600" />
                Core Programs {activeMode === 'home' && <Badge variant="outline">Home Exercises</Badge>}
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {programs.map((program) => (
                  <Card 
                    key={program.id}
                    className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
                    onClick={() => {
                      setSelectedProgram(program);
                      setShowWorkoutDialog(true);
                    }}
                    data-testid={`program-${program.id}`}
                  >
                    <div className={`h-2 bg-gradient-to-r ${program.color}`} />
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${program.color} flex items-center justify-center flex-shrink-0`}>
                          <program.icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                            {program.title}
                          </h4>
                          <p className="text-sm text-slate-500 mb-2">{program.desc}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Clock className="w-3 h-3" />
                            {program.duration}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-3">
                        {program.levels.map((level, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">{level}</Badge>
                        ))}
                      </div>
                      <Button className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 rounded-xl">
                        <Play className="w-4 h-4 mr-2" />
                        Start Program
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
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Footprints className="w-5 h-5 text-indigo-600" />
                Running Plans
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {runningPlans.map((plan, idx) => (
                  <Card key={idx} className="p-4 hover:shadow-lg transition-all" data-testid={`running-${idx}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-slate-800 text-lg">{plan.name}</h4>
                        <Badge className="mt-1 bg-indigo-100 text-indigo-700">{plan.level}</Badge>
                        <p className="text-sm text-slate-500 mt-2">{plan.goal}</p>
                        <p className="text-xs text-slate-400 mt-1">{plan.weeks} weeks program</p>
                      </div>
                      <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center">
                        <Footprints className="w-7 h-7 text-white" />
                      </div>
                    </div>
                    <Button className="w-full mt-4 bg-pink-500 hover:bg-pink-600 rounded-xl">
                      Start Plan
                    </Button>
                  </Card>
                ))}
              </div>

              {/* Running Tips */}
              <Card className="p-4 bg-rose-50 border-rose-200">
                <h4 className="font-medium text-rose-800 mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Running Tips
                </h4>
                <ul className="text-sm text-rose-700 space-y-1">
                  <li>• Always warm up 5-10 minutes before running</li>
                  <li>• Stay hydrated - drink water before and after</li>
                  <li>• Cool down with stretching to prevent injury</li>
                  <li>• Listen to your body - rest when needed</li>
                </ul>
              </Card>
            </div>
          )}

          {/* GYM SCHEDULES SECTION */}
          {activeSection === 'schedules' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Structured Gym Schedules
              </h3>
              
              {Object.entries(gymSchedules).map(([key, schedule]) => (
                <Card key={key} className="overflow-hidden" data-testid={`schedule-${key}`}>
                  <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4">
                    <CardTitle className="flex items-center justify-between">
                      <span>{schedule.name}</span>
                      <Badge className="bg-white/20 text-white">{schedule.desc}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {schedule.days.map((day, idx) => (
                        <div key={idx} className="bg-slate-50 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-slate-800">{day.day}</span>
                            <Badge variant="outline" className="text-xs">{day.focus}</Badge>
                          </div>
                          <ul className="space-y-1">
                            {day.exercises.map((ex, exIdx) => (
                              <li key={exIdx} className="text-sm text-slate-600 flex items-center gap-2">
                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                                {ex}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                    <Button className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 rounded-xl">
                      <Calendar className="w-4 h-4 mr-2" />
                      Start This Schedule
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {/* Weekly Progression */}
              <Card className="p-4 bg-amber-50 border-amber-200">
                <h4 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Weekly Progression Tips
                </h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• Increase weight by 2.5-5kg when you can complete all sets easily</li>
                  <li>• Take a deload week every 4-6 weeks (reduce weight by 40%)</li>
                  <li>• Rest at least 48 hours between training same muscle group</li>
                </ul>
              </Card>
            </div>
          )}

          {/* MEDICAL SUPPORT SECTION */}
          {activeSection === 'medical' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-indigo-600" />
                Medical & Diagnostic Support
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Injury / Pain Report */}
                <Card className="p-6 border-2 border-red-100 hover:border-red-300 transition-all">
                  <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
                    <AlertTriangle className="w-7 h-7 text-red-600" />
                  </div>
                  <h4 className="font-semibold text-slate-800 text-lg mb-2">Report Injury / Pain</h4>
                  <p className="text-sm text-slate-500 mb-4">
                    Experiencing pain during workouts? Report it and get professional guidance.
                  </p>
                  <Button 
                    onClick={handleInjuryReport}
                    className="w-full bg-red-500 hover:bg-red-600 rounded-xl"
                    data-testid="report-injury-btn"
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Report Injury
                  </Button>
                </Card>

                {/* Vitamin Check */}
                <Card className="p-6 border-2 border-green-100 hover:border-green-300 transition-all">
                  <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mb-4">
                    <TestTube className="w-7 h-7 text-green-600" />
                  </div>
                  <h4 className="font-semibold text-slate-800 text-lg mb-2">Vitamin & Deficiency Check</h4>
                  <p className="text-sm text-slate-500 mb-4">
                    Fatigue? Poor recovery? Muscle cramps? Check your vitamin levels.
                  </p>
                  <Button 
                    onClick={handleVitaminCheck}
                    className="w-full bg-green-500 hover:bg-green-600 rounded-xl"
                    data-testid="vitamin-check-btn"
                  >
                    <TestTube className="w-4 h-4 mr-2" />
                    Check Vitamins
                  </Button>
                </Card>
              </div>

              {/* Doctor Referral Info */}
              <Card className="p-4 bg-blue-50 border-blue-200">
                <div className="flex items-start gap-3">
                  <Stethoscope className="w-6 h-6 text-blue-600 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-blue-800">Orthopedic & Sports Medicine</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      For persistent pain or injuries, our sports medicine specialist Dr. Vikas is available for consultation.
                    </p>
                    <Button 
                      variant="outline"
                      onClick={bookDoctorConsult}
                      className="mt-3 border-blue-300 text-blue-700 rounded-xl"
                    >
                      Book Ortho Consult
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Injury Escalation Flow */}
              <Card className="p-4">
                <h4 className="font-medium text-slate-800 mb-3">Injury → Care Escalation Flow</h4>
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {[
                    { step: '1', text: 'Report Pain', color: 'bg-amber-500' },
                    { step: '2', text: 'Physio Protocol', color: 'bg-teal-500' },
                    { step: '3', text: 'Doctor Consult', color: 'bg-blue-500' },
                    { step: '4', text: 'Modified Plan', color: 'bg-green-500' }
                  ].map((s, idx) => (
                    <React.Fragment key={s.step}>
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className={`w-10 h-10 ${s.color} text-white rounded-full flex items-center justify-center font-bold`}>
                          {s.step}
                        </div>
                        <span className="text-xs text-slate-600 mt-1 text-center whitespace-nowrap">{s.text}</span>
                      </div>
                      {idx < 3 && <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />}
                    </React.Fragment>
                  ))}
                </div>
              </Card>
            </div>
          )}

        </main>

        {/* Timer Dialog */}
        <Dialog open={showTimerDialog} onOpenChange={setShowTimerDialog}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-indigo-600" />
                Workout Timer
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Timer Display */}
              <div className="text-center py-6 bg-slate-100 rounded-2xl">
                <div className="text-6xl font-bold text-indigo-600 font-mono">
                  {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
                </div>
                <p className="text-slate-500 mt-2">
                  {timerMode === 'rest' ? 'Rest Timer' : timerMode === 'hiit' ? 'HIIT Interval' : 'Rep Counter'}
                </p>
              </div>

              {/* Quick Timer Buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[30, 45, 60, 90].map((sec) => (
                  <Button
                    key={sec}
                    variant="outline"
                    onClick={() => startTimer(sec)}
                    className="rounded-xl"
                  >
                    {sec}s
                  </Button>
                ))}
              </div>

              {/* Controls */}
              <div className="flex gap-2">
                {!isTimerRunning ? (
                  <Button onClick={() => startTimer(timerSeconds)} className="flex-1 bg-green-500 hover:bg-green-600 rounded-xl">
                    <Play className="w-4 h-4 mr-2" />
                    Start
                  </Button>
                ) : (
                  <Button onClick={pauseTimer} className="flex-1 bg-amber-500 hover:bg-amber-600 rounded-xl">
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </Button>
                )}
                <Button onClick={resetTimer} variant="outline" className="rounded-xl">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>

              {/* Set/Rep Counter */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <p className="text-xs text-slate-500">Set</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Button size="icon" variant="outline" onClick={() => setCurrentSet(Math.max(1, currentSet - 1))} className="h-8 w-8">
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="text-2xl font-bold text-slate-800 w-8 text-center">{currentSet}</span>
                      <Button size="icon" variant="outline" onClick={() => setCurrentSet(currentSet + 1)} className="h-8 w-8">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500">Reps</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Button size="icon" variant="outline" onClick={() => setCurrentRep(Math.max(0, currentRep - 1))} className="h-8 w-8">
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="text-2xl font-bold text-slate-800 w-8 text-center">{currentRep}</span>
                      <Button size="icon" variant="outline" onClick={() => setCurrentRep(currentRep + 1)} className="h-8 w-8">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Injury Report Dialog */}
        <Dialog open={showInjuryDialog} onOpenChange={setShowInjuryDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Report Injury / Pain
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Pain Location</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {['Knee', 'Back', 'Shoulder', 'Ankle', 'Wrist', 'Neck'].map((area) => (
                    <Button key={area} variant="outline" className="rounded-xl text-sm">
                      {area}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Pain Level (1-10)</Label>
                <div className="flex gap-1 mt-2">
                  {[1,2,3,4,5,6,7,8,9,10].map((level) => (
                    <button
                      key={level}
                      className={`w-8 h-8 rounded-lg text-sm font-medium ${
                        level <= 3 ? 'bg-green-100 text-green-700' :
                        level <= 6 ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      } hover:opacity-80`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-sm text-amber-800">
                  <strong>Recommendation:</strong> Based on your pain level, we suggest starting with physiotherapy protocols. If pain persists, doctor consultation will be unlocked.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowInjuryDialog(false)}>
                  Start Physio
                </Button>
                <Button className="flex-1 bg-red-500 hover:bg-red-600 rounded-xl" onClick={bookDoctorConsult}>
                  Consult Doctor
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Vitamin Check Dialog */}
        <Dialog open={showVitaminDialog} onOpenChange={setShowVitaminDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <TestTube className="w-5 h-5" />
                Vitamin & Deficiency Tests
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Select a test below. Proton Diagnostics will call you to confirm and schedule home sample collection.
              </p>
              {vitaminTests.map((test, idx) => (
                <Card 
                  key={idx} 
                  className="p-3 hover:shadow-md cursor-pointer transition-all"
                  onClick={() => bookVitaminTest(test)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-800">{test.name}</h4>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {test.symptoms.map((s, sIdx) => (
                          <Badge key={sIdx} variant="outline" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-green-600">₹{test.price}</span>
                      <p className="text-xs text-slate-400">Home Collection</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Workout Session Dialog */}
        <Dialog open={showWorkoutDialog} onOpenChange={setShowWorkoutDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedProgram && <selectedProgram.icon className="w-5 h-5 text-indigo-600" />}
                Book {selectedProgram?.title || 'Session'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Session Type</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button variant="outline" className="rounded-xl">
                    <Play className="w-4 h-4 mr-2" />
                    Video Session
                  </Button>
                  <Button variant="outline" className="rounded-xl">
                    <User className="w-4 h-4 mr-2" />
                    In-Person
                  </Button>
                </div>
              </div>
              <div>
                <Label>Preferred Date</Label>
                <Input type="date" className="mt-2" />
              </div>
              <div>
                <Label>Preferred Time</Label>
                <select className="w-full border rounded-xl px-3 py-2 mt-2">
                  <option>Morning (6 AM - 9 AM)</option>
                  <option>Mid-Morning (9 AM - 12 PM)</option>
                  <option>Evening (5 PM - 8 PM)</option>
                </select>
              </div>
              <Button 
                className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                onClick={() => {
                  toast.success('Session booked! Trainer will contact you soon.');
                  setShowWorkoutDialog(false);
                }}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
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

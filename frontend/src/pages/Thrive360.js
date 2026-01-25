import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  ArrowLeft, Brain, Heart, Dumbbell, Moon, Sun, Smile, Frown, Meh,
  Play, Pause, RotateCcw, Calendar, Clock, TrendingUp, Award,
  Wind, Flame, Target, CheckCircle2, Circle, ChevronRight,
  Sparkles, Leaf, Music, BookOpen, MessageCircle, Video,
  Activity, Zap, Coffee, Bed, Star, Lock
} from 'lucide-react';

const Thrive360 = () => {
  const navigate = useNavigate();
  const { user, token: authToken, patientToken } = useAuth();
  const token = authToken || patientToken || localStorage.getItem('token') || localStorage.getItem('patientToken');
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [moodToday, setMoodToday] = useState(null);
  const [showMoodDialog, setShowMoodDialog] = useState(false);
  const [showJournalDialog, setShowJournalDialog] = useState(false);
  const [journalEntry, setJournalEntry] = useState('');
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState('inhale');
  const [breathingCount, setBreathingCount] = useState(4);
  
  // Wellness data
  const [wellnessScore, setWellnessScore] = useState(72);
  const [streakDays, setStreakDays] = useState(5);
  const [completedToday, setCompletedToday] = useState([]);
  
  // Daily wellness activities
  const dailyActivities = [
    { id: 'mood', name: 'Log Mood', icon: Smile, points: 10, category: 'mental' },
    { id: 'meditation', name: '5-min Meditation', icon: Brain, points: 15, category: 'mental' },
    { id: 'journal', name: 'Write Journal', icon: BookOpen, points: 10, category: 'mental' },
    { id: 'breathing', name: 'Breathing Exercise', icon: Wind, points: 10, category: 'mental' },
    { id: 'exercise', name: '15-min Exercise', icon: Dumbbell, points: 20, category: 'physical' },
    { id: 'stretch', name: 'Morning Stretch', icon: Activity, points: 10, category: 'physical' },
    { id: 'water', name: 'Drink 8 Glasses', icon: Coffee, points: 10, category: 'physical' },
    { id: 'sleep', name: 'Log Sleep', icon: Bed, points: 10, category: 'physical' },
  ];
  
  // Meditation library
  const meditations = [
    { id: 1, name: 'Morning Calm', duration: '5 min', category: 'Beginner', icon: Sun },
    { id: 2, name: 'Stress Relief', duration: '10 min', category: 'Anxiety', icon: Wind },
    { id: 3, name: 'Deep Sleep', duration: '15 min', category: 'Sleep', icon: Moon },
    { id: 4, name: 'Focus Boost', duration: '7 min', category: 'Productivity', icon: Target },
    { id: 5, name: 'Body Scan', duration: '12 min', category: 'Relaxation', icon: Heart },
    { id: 6, name: 'Gratitude', duration: '5 min', category: 'Positivity', icon: Sparkles },
  ];
  
  // Exercise library
  const exercises = [
    { id: 1, name: 'Yoga Flow', duration: '20 min', level: 'Beginner', category: 'Flexibility' },
    { id: 2, name: 'HIIT Cardio', duration: '15 min', level: 'Intermediate', category: 'Cardio' },
    { id: 3, name: 'Core Strength', duration: '10 min', level: 'Beginner', category: 'Strength' },
    { id: 4, name: 'Full Body Stretch', duration: '12 min', level: 'All Levels', category: 'Recovery' },
    { id: 5, name: 'Pilates Basics', duration: '25 min', level: 'Beginner', category: 'Core' },
    { id: 6, name: 'Desk Exercises', duration: '8 min', level: 'All Levels', category: 'Office' },
  ];
  
  // Mood options
  const moodOptions = [
    { value: 'great', label: 'Great', icon: Sparkles, color: 'text-green-500' },
    { value: 'good', label: 'Good', icon: Smile, color: 'text-teal-500' },
    { value: 'okay', label: 'Okay', icon: Meh, color: 'text-amber-500' },
    { value: 'low', label: 'Low', icon: Frown, color: 'text-orange-500' },
    { value: 'stressed', label: 'Stressed', icon: Flame, color: 'text-red-500' },
  ];
  
  // Load saved data
  useEffect(() => {
    const savedMood = localStorage.getItem('thrive360_mood_today');
    const savedCompleted = JSON.parse(localStorage.getItem('thrive360_completed') || '[]');
    const savedStreak = parseInt(localStorage.getItem('thrive360_streak') || '0');
    
    if (savedMood) setMoodToday(savedMood);
    if (savedCompleted.length) setCompletedToday(savedCompleted);
    if (savedStreak) setStreakDays(savedStreak);
    
    // Calculate wellness score
    const score = Math.min(100, 50 + (savedCompleted.length * 6) + (savedStreak * 2));
    setWellnessScore(score);
  }, []);
  
  // Breathing exercise timer
  useEffect(() => {
    let interval;
    if (breathingActive) {
      interval = setInterval(() => {
        setBreathingCount(prev => {
          if (prev <= 1) {
            setBreathingPhase(phase => {
              if (phase === 'inhale') return 'hold';
              if (phase === 'hold') return 'exhale';
              return 'inhale';
            });
            return phase === 'hold' ? 7 : 4;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [breathingActive, breathingPhase]);
  
  const handleMoodLog = (mood) => {
    setMoodToday(mood);
    localStorage.setItem('thrive360_mood_today', mood);
    markActivityComplete('mood');
    setShowMoodDialog(false);
    toast.success('Mood logged! Keep tracking for insights.');
  };
  
  const handleJournalSave = () => {
    if (!journalEntry.trim()) {
      toast.error('Please write something first');
      return;
    }
    const journals = JSON.parse(localStorage.getItem('thrive360_journals') || '[]');
    journals.push({ date: new Date().toISOString(), entry: journalEntry });
    localStorage.setItem('thrive360_journals', JSON.stringify(journals));
    markActivityComplete('journal');
    setJournalEntry('');
    setShowJournalDialog(false);
    toast.success('Journal saved! Great job reflecting.');
  };
  
  const markActivityComplete = (activityId) => {
    if (completedToday.includes(activityId)) return;
    
    const newCompleted = [...completedToday, activityId];
    setCompletedToday(newCompleted);
    localStorage.setItem('thrive360_completed', JSON.stringify(newCompleted));
    
    // Update streak
    const newStreak = streakDays + 1;
    setStreakDays(newStreak);
    localStorage.setItem('thrive360_streak', newStreak.toString());
    
    // Update wellness score
    const score = Math.min(100, 50 + (newCompleted.length * 6) + (newStreak * 2));
    setWellnessScore(score);
    
    const activity = dailyActivities.find(a => a.id === activityId);
    if (activity) {
      toast.success(`+${activity.points} points! ${activity.name} completed`);
    }
  };
  
  const startBreathing = () => {
    setBreathingActive(true);
    setBreathingPhase('inhale');
    setBreathingCount(4);
  };
  
  const stopBreathing = () => {
    setBreathingActive(false);
    markActivityComplete('breathing');
  };

  // Not logged in view
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-indigo-900/80 backdrop-blur-xl border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-white hover:bg-white/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <img 
                src="https://customer-assets.emergentagent.com/job_healspace-26/artifacts/iijsipxg_file_00000000290072089f3c35fe8c1b2b05.png" 
                alt="Thrive360" 
                className="h-10 w-auto"
              />
            </div>
            <div className="w-10" />
          </div>
        </header>
        
        {/* Login Required */}
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-6">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Login Required</h2>
          <p className="text-white/70 mb-8 max-w-sm">
            Start your wellness journey with Thrive360. Track your mind and body health in one place.
          </p>
          <Button 
            onClick={() => navigate('/')}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-full px-8"
          >
            Login to Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-indigo-900/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-white hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <img 
              src="https://customer-assets.emergentagent.com/job_healspace-26/artifacts/iijsipxg_file_00000000290072089f3c35fe8c1b2b05.png" 
              alt="Thrive360" 
              className="h-10 w-auto"
            />
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">
              <Flame className="w-3 h-3 mr-1" />
              {streakDays} day streak
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Wellness Score Card */}
        <Card className="bg-white/10 backdrop-blur border-white/20 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">Your Wellness Score</h2>
                <p className="text-white/60 text-sm">Mind + Body Balance</p>
              </div>
              <div className="text-right">
                <span className="text-4xl font-bold text-amber-400">{wellnessScore}</span>
                <span className="text-white/60">/100</span>
              </div>
            </div>
            <Progress value={wellnessScore} className="h-3 bg-white/20" />
            <div className="flex justify-between mt-2 text-xs text-white/50">
              <span>Getting Started</span>
              <span>Balanced</span>
              <span>Thriving</span>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/10 border border-white/20 p-1 rounded-2xl w-full grid grid-cols-4">
            <TabsTrigger value="dashboard" className="rounded-xl data-[state=active]:bg-amber-500 data-[state=active]:text-white text-white/70">
              Home
            </TabsTrigger>
            <TabsTrigger value="mental" className="rounded-xl data-[state=active]:bg-purple-500 data-[state=active]:text-white text-white/70">
              Mind
            </TabsTrigger>
            <TabsTrigger value="physical" className="rounded-xl data-[state=active]:bg-teal-500 data-[state=active]:text-white text-white/70">
              Body
            </TabsTrigger>
            <TabsTrigger value="progress" className="rounded-xl data-[state=active]:bg-pink-500 data-[state=active]:text-white text-white/70">
              Progress
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Quick Mood Check */}
            <Card className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">How are you feeling?</h3>
                    <p className="text-white/60 text-sm">Daily mood check-in</p>
                  </div>
                  {moodToday ? (
                    <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Logged
                    </Badge>
                  ) : (
                    <Button 
                      onClick={() => setShowMoodDialog(true)}
                      className="bg-white/20 hover:bg-white/30 text-white rounded-full"
                    >
                      Log Mood
                    </Button>
                  )}
                </div>
                {moodToday && (
                  <div className="mt-4 flex items-center gap-2">
                    {moodOptions.find(m => m.value === moodToday)?.icon && (
                      <div className={`${moodOptions.find(m => m.value === moodToday)?.color}`}>
                        {React.createElement(moodOptions.find(m => m.value === moodToday)?.icon, { className: 'w-6 h-6' })}
                      </div>
                    )}
                    <span className="text-white capitalize">{moodToday}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Today's Activities */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Today's Wellness Activities</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {dailyActivities.map((activity) => {
                  const isCompleted = completedToday.includes(activity.id);
                  return (
                    <button
                      key={activity.id}
                      onClick={() => {
                        if (activity.id === 'mood') setShowMoodDialog(true);
                        else if (activity.id === 'journal') setShowJournalDialog(true);
                        else if (activity.id === 'breathing') startBreathing();
                        else if (!isCompleted) markActivityComplete(activity.id);
                      }}
                      className={`p-4 rounded-2xl border transition-all ${
                        isCompleted 
                          ? 'bg-green-500/20 border-green-500/30' 
                          : 'bg-white/10 border-white/20 hover:bg-white/20'
                      }`}
                    >
                      <activity.icon className={`w-6 h-6 mx-auto mb-2 ${isCompleted ? 'text-green-400' : 'text-white/70'}`} />
                      <p className={`text-xs ${isCompleted ? 'text-green-300' : 'text-white/70'}`}>{activity.name}</p>
                      <p className={`text-xs mt-1 ${isCompleted ? 'text-green-400' : 'text-amber-400'}`}>+{activity.points} pts</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-purple-500/30 to-indigo-500/30 border-white/20 cursor-pointer hover:scale-105 transition-transform" onClick={() => setActiveTab('mental')}>
                <CardContent className="p-6 text-center">
                  <Brain className="w-10 h-10 text-purple-300 mx-auto mb-3" />
                  <h4 className="font-semibold text-white">Meditate</h4>
                  <p className="text-white/60 text-sm">Calm your mind</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-teal-500/30 to-cyan-500/30 border-white/20 cursor-pointer hover:scale-105 transition-transform" onClick={() => setActiveTab('physical')}>
                <CardContent className="p-6 text-center">
                  <Dumbbell className="w-10 h-10 text-teal-300 mx-auto mb-3" />
                  <h4 className="font-semibold text-white">Exercise</h4>
                  <p className="text-white/60 text-sm">Move your body</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Mental Wellness Tab */}
          <TabsContent value="mental" className="space-y-6">
            {/* Breathing Exercise */}
            <Card className="bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border-white/20">
              <CardContent className="p-6 text-center">
                <h3 className="text-lg font-semibold text-white mb-4">4-7-8 Breathing</h3>
                {breathingActive ? (
                  <div className="space-y-4">
                    <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center transition-all duration-1000 ${
                      breathingPhase === 'inhale' ? 'bg-purple-500/50 scale-110' :
                      breathingPhase === 'hold' ? 'bg-indigo-500/50 scale-100' :
                      'bg-blue-500/50 scale-90'
                    }`}>
                      <div className="text-center">
                        <p className="text-3xl font-bold text-white">{breathingCount}</p>
                        <p className="text-white/70 capitalize">{breathingPhase}</p>
                      </div>
                    </div>
                    <Button onClick={stopBreathing} variant="outline" className="border-white/30 text-white hover:bg-white/10">
                      <Pause className="w-4 h-4 mr-2" />
                      Stop & Complete
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Wind className="w-16 h-16 text-purple-300 mx-auto" />
                    <p className="text-white/70">Reduce stress with guided breathing</p>
                    <Button onClick={startBreathing} className="bg-purple-500 hover:bg-purple-600 text-white">
                      <Play className="w-4 h-4 mr-2" />
                      Start Breathing
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Meditation Library */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Meditation Library</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {meditations.map((med) => (
                  <Card key={med.id} className="bg-white/10 border-white/20 hover:bg-white/15 cursor-pointer transition-all">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-purple-500/30 flex items-center justify-center">
                        <med.icon className="w-6 h-6 text-purple-300" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-white">{med.name}</h4>
                        <div className="flex items-center gap-2 text-sm text-white/60">
                          <Clock className="w-3 h-3" />
                          <span>{med.duration}</span>
                          <span>•</span>
                          <span>{med.category}</span>
                        </div>
                      </div>
                      <Play className="w-5 h-5 text-white/50" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Journal */}
            <Card className="bg-white/10 border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">Daily Journal</h3>
                    <p className="text-white/60 text-sm">Reflect on your thoughts</p>
                  </div>
                  <Button onClick={() => setShowJournalDialog(true)} className="bg-purple-500 hover:bg-purple-600 text-white">
                    <BookOpen className="w-4 h-4 mr-2" />
                    Write
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Physical Wellness Tab */}
          <TabsContent value="physical" className="space-y-6">
            {/* Exercise Library */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Exercise Library</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {exercises.map((ex) => (
                  <Card key={ex.id} className="bg-white/10 border-white/20 hover:bg-white/15 cursor-pointer transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-white">{ex.name}</h4>
                        <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30">{ex.level}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <Clock className="w-3 h-3" />
                        <span>{ex.duration}</span>
                        <span>•</span>
                        <span>{ex.category}</span>
                      </div>
                      <Button className="w-full mt-4 bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/30">
                        <Play className="w-4 h-4 mr-2" />
                        Start Workout
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Book Physiotherapist */}
            <Card className="bg-gradient-to-r from-teal-500/20 to-cyan-500/20 border-white/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-teal-500/30 flex items-center justify-center">
                    <Calendar className="w-7 h-7 text-teal-300" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">Book Physiotherapist</h3>
                    <p className="text-white/60 text-sm">Get professional guidance for your physical health</p>
                  </div>
                  <Button onClick={() => navigate('/diagyn')} className="bg-teal-500 hover:bg-teal-600 text-white">
                    Book Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Progress Tab */}
          <TabsContent value="progress" className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="bg-white/10 border-white/20">
                <CardContent className="p-4 text-center">
                  <Flame className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{streakDays}</p>
                  <p className="text-white/60 text-sm">Day Streak</p>
                </CardContent>
              </Card>
              <Card className="bg-white/10 border-white/20">
                <CardContent className="p-4 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{completedToday.length}</p>
                  <p className="text-white/60 text-sm">Today's Tasks</p>
                </CardContent>
              </Card>
              <Card className="bg-white/10 border-white/20">
                <CardContent className="p-4 text-center">
                  <Brain className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">12</p>
                  <p className="text-white/60 text-sm">Meditations</p>
                </CardContent>
              </Card>
              <Card className="bg-white/10 border-white/20">
                <CardContent className="p-4 text-center">
                  <Dumbbell className="w-8 h-8 text-teal-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">8</p>
                  <p className="text-white/60 text-sm">Workouts</p>
                </CardContent>
              </Card>
            </div>

            {/* Achievements */}
            <Card className="bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  Achievements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: 'First Step', desc: 'Complete your first activity', earned: true },
                  { name: '7-Day Warrior', desc: 'Maintain a 7-day streak', earned: streakDays >= 7 },
                  { name: 'Mind Master', desc: 'Complete 10 meditations', earned: false },
                  { name: 'Body Builder', desc: 'Complete 10 workouts', earned: false },
                ].map((achievement, idx) => (
                  <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl ${achievement.earned ? 'bg-amber-500/20' : 'bg-white/5'}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${achievement.earned ? 'bg-amber-500' : 'bg-white/20'}`}>
                      {achievement.earned ? <Star className="w-5 h-5 text-white" /> : <Lock className="w-5 h-5 text-white/50" />}
                    </div>
                    <div>
                      <p className={`font-medium ${achievement.earned ? 'text-amber-300' : 'text-white/50'}`}>{achievement.name}</p>
                      <p className={`text-sm ${achievement.earned ? 'text-amber-200/70' : 'text-white/30'}`}>{achievement.desc}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Mood Dialog */}
      <Dialog open={showMoodDialog} onOpenChange={setShowMoodDialog}>
        <DialogContent className="bg-slate-900 border-white/20 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">How are you feeling?</DialogTitle>
            <DialogDescription className="text-white/60">Select your current mood</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-5 gap-2 py-4">
            {moodOptions.map((mood) => (
              <button
                key={mood.value}
                onClick={() => handleMoodLog(mood.value)}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/10 transition-colors"
              >
                <mood.icon className={`w-8 h-8 ${mood.color}`} />
                <span className="text-xs text-white/70">{mood.label}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Journal Dialog */}
      <Dialog open={showJournalDialog} onOpenChange={setShowJournalDialog}>
        <DialogContent className="bg-slate-900 border-white/20 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Daily Journal</DialogTitle>
            <DialogDescription className="text-white/60">Write your thoughts and reflections</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              value={journalEntry}
              onChange={(e) => setJournalEntry(e.target.value)}
              placeholder="What's on your mind today?"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40 min-h-[150px]"
            />
            <Button onClick={handleJournalSave} className="w-full bg-purple-500 hover:bg-purple-600 text-white">
              Save Journal Entry
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Thrive360;

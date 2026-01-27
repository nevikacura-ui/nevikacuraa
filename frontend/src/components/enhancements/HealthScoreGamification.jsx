import React, { useState, useEffect } from 'react';
import { Trophy, Flame, Target, Zap, Heart, Activity, Award, Star, Calendar, CheckCircle2, Gift } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Health Score Gamification (#5)
const HealthScoreGamification = () => {
  const [healthData, setHealthData] = useState({
    score: 72,
    streak: 0,
    level: 1,
    xp: 150,
    xpToNextLevel: 500,
    badges: [],
    dailyTasks: [],
    weeklyGoals: []
  });
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);

  const badges = [
    { id: 'first_checkup', name: 'First Steps', icon: Heart, description: 'Complete your first health checkup', unlocked: true },
    { id: 'streak_7', name: 'Week Warrior', icon: Flame, description: '7-day check-in streak', unlocked: false },
    { id: 'streak_30', name: 'Monthly Champion', icon: Trophy, description: '30-day check-in streak', unlocked: false },
    { id: 'med_master', name: 'Med Master', icon: Award, description: 'Never miss medications for a week', unlocked: true },
    { id: 'health_hero', name: 'Health Hero', icon: Star, description: 'Reach health score of 90+', unlocked: false },
    { id: 'family_care', name: 'Family Guardian', icon: Heart, description: 'Add 3 family members', unlocked: false },
  ];

  const dailyTasks = [
    { id: 'checkin', name: 'Daily Check-in', xp: 10, completed: false, icon: CheckCircle2 },
    { id: 'water', name: 'Log Water Intake', xp: 5, completed: false, icon: Activity },
    { id: 'steps', name: 'Record Steps', xp: 5, completed: false, icon: Target },
    { id: 'mood', name: 'Log Mood', xp: 5, completed: true, icon: Heart },
  ];

  useEffect(() => {
    fetchHealthScore();
  }, []);

  const fetchHealthScore = async () => {
    try {
      const token = localStorage.getItem('patientToken');
      const res = await fetch(`${API}/api/patient/health-score`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHealthData(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Failed to fetch health score:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDailyCheckIn = async () => {
    setCheckingIn(true);
    try {
      const token = localStorage.getItem('patientToken');
      const res = await fetch(`${API}/api/patient/health-score/checkin`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        }
      });
      if (res.ok) {
        const data = await res.json();
        setHealthData(prev => ({
          ...prev,
          streak: data.streak,
          xp: prev.xp + 10,
          score: Math.min(prev.score + 1, 100)
        }));
        toast.success(`+10 XP! Streak: ${data.streak} days 🔥`);
      }
    } catch (error) {
      // Simulate success for demo
      setHealthData(prev => ({
        ...prev,
        streak: prev.streak + 1,
        xp: prev.xp + 10,
        score: Math.min(prev.score + 1, 100)
      }));
      toast.success(`+10 XP! Keep going! 🔥`);
    } finally {
      setCheckingIn(false);
    }
  };

  const completeTask = async (taskId) => {
    const task = dailyTasks.find(t => t.id === taskId);
    if (task && !task.completed) {
      setHealthData(prev => ({
        ...prev,
        xp: prev.xp + task.xp
      }));
      toast.success(`+${task.xp} XP for ${task.name}!`);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  const getScoreGradient = (score) => {
    if (score >= 80) return 'from-green-500 to-emerald-500';
    if (score >= 60) return 'from-yellow-500 to-amber-500';
    if (score >= 40) return 'from-orange-500 to-red-500';
    return 'from-red-500 to-rose-500';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-40 bg-gray-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="health-score-gamification">
      {/* Health Score Card */}
      <Card className={`overflow-hidden bg-gradient-to-br ${getScoreGradient(healthData.score)} text-white`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white/80 text-sm">Your Health Score</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold">{healthData.score}</span>
                <span className="text-white/60">/100</span>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-5 h-5 text-orange-300" />
                <span className="font-bold">{healthData.streak} day streak</span>
              </div>
              <p className="text-white/70 text-sm">Level {healthData.level}</p>
            </div>
          </div>

          {/* XP Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{healthData.xp} XP</span>
              <span>{healthData.xpToNextLevel} XP to Level {healthData.level + 1}</span>
            </div>
            <Progress value={(healthData.xp / healthData.xpToNextLevel) * 100} className="h-2 bg-white/30" />
          </div>

          {/* Daily Check-in Button */}
          <Button 
            onClick={handleDailyCheckIn}
            disabled={checkingIn}
            className="w-full mt-4 bg-white/20 hover:bg-white/30 border border-white/30"
          >
            {checkingIn ? (
              'Checking in...'
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Daily Check-in (+10 XP)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Daily Tasks */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-teal-600" />
            Daily Tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {dailyTasks.map((task) => (
            <div 
              key={task.id}
              className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                task.completed ? 'bg-green-50 border border-green-200' : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  task.completed ? 'bg-green-500 text-white' : 'bg-gray-200'
                }`}>
                  <task.icon className="w-4 h-4" />
                </div>
                <span className={task.completed ? 'line-through text-gray-500' : 'font-medium'}>
                  {task.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">+{task.xp} XP</Badge>
                {!task.completed && (
                  <Button size="sm" variant="ghost" onClick={() => completeTask(task.id)}>
                    Complete
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Badges */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            Badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {badges.map((badge) => (
              <div 
                key={badge.id}
                className={`flex flex-col items-center p-3 rounded-xl text-center ${
                  badge.unlocked 
                    ? 'bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200' 
                    : 'bg-gray-100 opacity-50'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                  badge.unlocked 
                    ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' 
                    : 'bg-gray-300'
                }`}>
                  <badge.icon className="w-6 h-6" />
                </div>
                <p className="text-xs font-medium">{badge.name}</p>
                {!badge.unlocked && (
                  <p className="text-[10px] text-gray-400 mt-1">Locked</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rewards Teaser */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
            <Gift className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-purple-900">Unlock Rewards!</h3>
            <p className="text-sm text-purple-700">Reach Level 5 to unlock pharmacy discounts</p>
          </div>
          <Badge className="bg-purple-500">{5 - healthData.level} levels away</Badge>
        </CardContent>
      </Card>
    </div>
  );
};

export default HealthScoreGamification;

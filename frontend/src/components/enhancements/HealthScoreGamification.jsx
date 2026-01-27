import React, { useState, useEffect } from 'react';
import { Trophy, Star, Flame, Target, Award, Zap, Calendar, Heart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';

// Health Score Gamification (#5)
const HealthScoreGamification = () => {
  const [healthData, setHealthData] = useState({
    score: 72,
    streak: 5,
    level: 'Health Warrior',
    xp: 1250,
    xpToNextLevel: 2000,
    badges: [],
    dailyGoals: [],
    weeklyChallenge: null
  });

  const badges = [
    { id: 'first_checkup', name: 'First Checkup', icon: '🏥', earned: true, description: 'Completed first health checkup' },
    { id: 'week_streak', name: '7-Day Streak', icon: '🔥', earned: true, description: 'Logged health for 7 consecutive days' },
    { id: 'medicine_master', name: 'Medicine Master', icon: '💊', earned: true, description: 'Never missed a medicine reminder' },
    { id: 'hydration_hero', name: 'Hydration Hero', icon: '💧', earned: false, description: 'Drink 8 glasses daily for a week' },
    { id: 'step_champion', name: 'Step Champion', icon: '👟', earned: false, description: 'Walk 10,000 steps for 30 days' },
    { id: 'zen_master', name: 'Zen Master', icon: '🧘', earned: false, description: 'Complete 20 meditation sessions' },
  ];

  const dailyGoals = [
    { id: 'water', name: 'Drink 8 glasses of water', progress: 6, target: 8, xp: 10, icon: '💧' },
    { id: 'steps', name: 'Walk 5,000 steps', progress: 3200, target: 5000, xp: 15, icon: '👟' },
    { id: 'medicine', name: 'Take all medicines', progress: 2, target: 3, xp: 20, icon: '💊' },
    { id: 'sleep', name: 'Sleep 7+ hours', progress: 1, target: 1, xp: 10, icon: '😴', completed: true },
  ];

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreGrade = (score) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Very Good';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Improvement';
  };

  return (
    <div className="space-y-4" data-testid="health-gamification">
      {/* Health Score Card */}
      <Card className="overflow-hidden bg-gradient-to-br from-teal-500 to-cyan-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-teal-100 text-sm">Your Health Score</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold">{healthData.score}</span>
                <span className="text-teal-200">/100</span>
              </div>
              <p className="text-teal-100 mt-1">{getScoreGrade(healthData.score)}</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 rounded-full border-4 border-white/30 flex items-center justify-center">
                <Flame className="w-10 h-10 text-orange-300" />
              </div>
              <p className="text-sm mt-1">{healthData.streak} day streak</p>
            </div>
          </div>

          {/* Level Progress */}
          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4" />
                {healthData.level}
              </span>
              <span>{healthData.xp}/{healthData.xpToNextLevel} XP</span>
            </div>
            <Progress value={(healthData.xp / healthData.xpToNextLevel) * 100} className="h-2 bg-white/30" />
          </div>
        </CardContent>
      </Card>

      {/* Daily Goals */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-teal-600" />
            Daily Goals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dailyGoals.map((goal) => (
            <div key={goal.id} className={`p-3 rounded-lg ${goal.completed ? 'bg-green-50' : 'bg-gray-50'}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{goal.icon}</span>
                  <span className="text-sm font-medium">{goal.name}</span>
                </div>
                <Badge variant={goal.completed ? 'default' : 'outline'} className="text-xs">
                  +{goal.xp} XP
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Progress 
                  value={(goal.progress / goal.target) * 100} 
                  className={`h-2 flex-1 ${goal.completed ? 'bg-green-200' : ''}`}
                />
                <span className="text-xs text-gray-500 w-16 text-right">
                  {goal.progress}/{goal.target}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Badges */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-600" />
            Badges Earned
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {badges.map((badge) => (
              <div 
                key={badge.id}
                className={`p-3 rounded-xl text-center ${
                  badge.earned ? 'bg-yellow-50' : 'bg-gray-100 opacity-50'
                }`}
              >
                <span className="text-3xl">{badge.icon}</span>
                <p className="text-xs font-medium mt-1">{badge.name}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Weekly Challenge */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <Zap className="w-6 h-6 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-purple-800">Weekly Challenge</p>
              <p className="text-sm text-purple-600">Complete 5 health checkups this week</p>
              <Progress value={60} className="h-2 mt-2" />
            </div>
            <Badge className="bg-purple-600">3/5</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HealthScoreGamification;

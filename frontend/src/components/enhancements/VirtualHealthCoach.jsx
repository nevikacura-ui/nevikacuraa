import React, { useState, useEffect } from 'react';
import { Target, Trophy, Flame, Droplets, Apple, Moon, Footprints, CheckCircle, Plus, X, TrendingUp, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from 'sonner';

const VirtualHealthCoach = () => {
  const [goals, setGoals] = useState([]);
  const [dailyTasks, setDailyTasks] = useState([]);
  const [streak, setStreak] = useState(7);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', target: '', type: 'daily' });
  const [coachMessage, setCoachMessage] = useState('');

  useEffect(() => {
    fetchGoals();
    generateCoachMessage();
  }, []);

  const fetchGoals = () => {
    setGoals([
      { id: '1', title: 'Walk 10,000 steps', icon: Footprints, current: 7500, target: 10000, unit: 'steps', color: 'blue' },
      { id: '2', title: 'Drink 8 glasses of water', icon: Droplets, current: 5, target: 8, unit: 'glasses', color: 'cyan' },
      { id: '3', title: 'Sleep 8 hours', icon: Moon, current: 7.5, target: 8, unit: 'hours', color: 'indigo' },
      { id: '4', title: 'Eat 5 servings of fruits/veggies', icon: Apple, current: 3, target: 5, unit: 'servings', color: 'green' }
    ]);

    setDailyTasks([
      { id: '1', title: 'Morning meditation (10 min)', completed: true, points: 10 },
      { id: '2', title: 'Take morning medications', completed: true, points: 15 },
      { id: '3', title: 'Log breakfast', completed: false, points: 5 },
      { id: '4', title: 'Afternoon walk (15 min)', completed: false, points: 20 },
      { id: '5', title: 'Check blood sugar', completed: false, points: 15 },
      { id: '6', title: 'Evening stretching', completed: false, points: 10 }
    ]);
  };

  const generateCoachMessage = () => {
    const messages = [
      "Great progress! You're 75% to your step goal. A short walk after lunch can help you reach it! 🚶‍♂️",
      "You're doing amazing! Keep up the hydration - just 3 more glasses to go! 💧",
      "Your consistency is inspiring! 7-day streak - you're building healthy habits! 🔥",
      "Remember: small steps lead to big changes. You've got this! 💪"
    ];
    setCoachMessage(messages[Math.floor(Math.random() * messages.length)]);
  };

  const toggleTask = (taskId) => {
    setDailyTasks(tasks => 
      tasks.map(task => 
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
    toast.success('Task updated! +10 points');
  };

  const updateGoalProgress = (goalId, increment) => {
    setGoals(goals => 
      goals.map(goal => {
        if (goal.id === goalId) {
          const newCurrent = Math.min(goal.current + increment, goal.target);
          return { ...goal, current: newCurrent };
        }
        return goal;
      })
    );
    toast.success('Progress updated!');
  };

  const addGoal = () => {
    if (!newGoal.title || !newGoal.target) {
      toast.error('Please fill in all fields');
      return;
    }
    setGoals([...goals, {
      id: Date.now().toString(),
      title: newGoal.title,
      icon: Target,
      current: 0,
      target: parseInt(newGoal.target),
      unit: 'units',
      color: 'purple'
    }]);
    setShowAddGoal(false);
    setNewGoal({ title: '', target: '', type: 'daily' });
    toast.success('New goal added!');
  };

  const completedTasks = dailyTasks.filter(t => t.completed).length;
  const totalPoints = dailyTasks.filter(t => t.completed).reduce((sum, t) => sum + t.points, 0);

  return (
    <div className="space-y-4" data-testid="virtual-health-coach">
      {/* Header */}
      <Card className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Health Coach</h2>
                <p className="text-emerald-100 text-sm">Your personalized wellness guide</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-amber-200">
                <Flame className="w-5 h-5" />
                <span className="font-bold text-lg">{streak}</span>
              </div>
              <span className="text-xs text-emerald-100">day streak</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coach Message */}
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-amber-800">Today's Motivation</p>
              <p className="text-sm text-amber-700 mt-1">{coachMessage}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Daily Progress Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">Today's Progress</p>
              <p className="text-2xl font-bold">{completedTasks}/{dailyTasks.length} tasks</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Points Earned</p>
              <p className="text-2xl font-bold text-emerald-600">{totalPoints} pts</p>
            </div>
          </div>
          <Progress value={(completedTasks / dailyTasks.length) * 100} className="h-3" />
        </CardContent>
      </Card>

      {/* Health Goals */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Your Goals</h3>
        <Button variant="outline" size="sm" onClick={() => setShowAddGoal(true)}>
          <Plus className="w-4 h-4 mr-1" /> Add Goal
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {goals.map(goal => {
          const IconComponent = goal.icon;
          const percentage = (goal.current / goal.target) * 100;
          return (
            <Card key={goal.id} className="overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-${goal.color}-100`}>
                    <IconComponent className={`w-4 h-4 text-${goal.color}-600`} />
                  </div>
                  <span className="text-xs font-medium truncate">{goal.title}</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <span className="text-xl font-bold">{goal.current}</span>
                    <span className="text-sm text-gray-500">/{goal.target}</span>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 w-6 p-0"
                    onClick={() => updateGoalProgress(goal.id, 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <Progress value={percentage} className="h-1.5 mt-2" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Daily Tasks */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            Today's Tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {dailyTasks.map(task => (
            <div
              key={task.id}
              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                task.completed ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50 hover:bg-gray-100'
              }`}
              onClick={() => toggleTask(task.id)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  task.completed ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'
                }`}>
                  {task.completed && <CheckCircle className="w-4 h-4 text-white" />}
                </div>
                <span className={`text-sm ${task.completed ? 'line-through text-gray-500' : ''}`}>
                  {task.title}
                </span>
              </div>
              <Badge variant="outline" className="text-xs">
                +{task.points} pts
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Weekly Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> This Week
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-emerald-600">85%</p>
              <p className="text-xs text-gray-500">Goal Completion</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">245</p>
              <p className="text-xs text-gray-500">Points Earned</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">7</p>
              <p className="text-xs text-gray-500">Day Streak</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add Goal Dialog */}
      <Dialog open={showAddGoal} onOpenChange={setShowAddGoal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Goal Title</label>
              <Input
                placeholder="e.g., Drink 8 glasses of water"
                value={newGoal.title}
                onChange={(e) => setNewGoal({...newGoal, title: e.target.value})}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Daily Target</label>
              <Input
                type="number"
                placeholder="e.g., 8"
                value={newGoal.target}
                onChange={(e) => setNewGoal({...newGoal, target: e.target.value})}
                className="mt-1"
              />
            </div>
            <Button onClick={addGoal} className="w-full">
              <Target className="w-4 h-4 mr-2" /> Add Goal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VirtualHealthCoach;

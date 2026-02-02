import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, ChevronRight, CheckCircle, Circle, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

const HealthScoreWidget = ({ user, className = '' }) => {
  const navigate = useNavigate();
  const [score, setScore] = useState(0);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    if (!user) return;

    // Calculate health score based on profile completion and activities
    const calculateScore = () => {
      let totalScore = 0;
      const taskList = [];

      // Profile completion (30 points)
      if (user.name) {
        totalScore += 10;
      } else {
        taskList.push({ id: 'name', label: 'Add your name', points: 10, done: false });
      }

      if (user.email) {
        totalScore += 10;
      } else {
        taskList.push({ id: 'email', label: 'Add email address', points: 10, done: false });
      }

      if (user.phone || user.mobile) {
        totalScore += 10;
      } else {
        taskList.push({ id: 'phone', label: 'Add phone number', points: 10, done: false });
      }

      // Health activities (70 points)
      const lastCheckup = localStorage.getItem(`lastCheckup_${user.id || user._id}`);
      if (lastCheckup) {
        totalScore += 20;
      } else {
        taskList.push({ id: 'checkup', label: 'Complete a health checkup', points: 20, done: false });
      }

      const hasAppointment = localStorage.getItem(`hasAppointment_${user.id || user._id}`);
      if (hasAppointment) {
        totalScore += 15;
      } else {
        taskList.push({ id: 'appointment', label: 'Book your first appointment', points: 15, done: false });
      }

      const healthStreak = parseInt(localStorage.getItem(`healthStreak_${user.id || user._id}`) || '0');
      if (healthStreak >= 7) {
        totalScore += 20;
      } else if (healthStreak >= 3) {
        totalScore += 10;
        taskList.push({ id: 'streak', label: 'Reach 7-day health streak', points: 10, done: false });
      } else {
        taskList.push({ id: 'streak', label: 'Start your health streak', points: 20, done: false });
      }

      const hasLabReport = localStorage.getItem(`hasLabReport_${user.id || user._id}`);
      if (hasLabReport) {
        totalScore += 15;
      } else {
        taskList.push({ id: 'lab', label: 'Get a lab test done', points: 15, done: false });
      }

      // Ensure minimum score of 20 for logged in users
      if (totalScore < 20) totalScore = 20;

      setScore(totalScore);
      setTasks(taskList.slice(0, 3)); // Show top 3 tasks
    };

    calculateScore();
  }, [user]);

  if (!user) return null;

  const getScoreColor = () => {
    if (score >= 80) return 'from-green-500 to-emerald-500';
    if (score >= 60) return 'from-teal-500 to-cyan-500';
    if (score >= 40) return 'from-amber-500 to-orange-500';
    return 'from-rose-500 to-pink-500';
  };

  const getScoreLabel = () => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Getting Started';
  };

  return (
    <div className={`bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 shadow-sm overflow-hidden ${className}`} data-testid="health-score-widget">
      {/* Header */}
      <div className={`bg-gradient-to-r ${getScoreColor()} p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white/80 text-sm font-medium">Your Health Score</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">{score}</span>
                <span className="text-white/70 text-sm">/100</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/20 rounded-full text-white text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              {getScoreLabel()}
            </span>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
          <div 
            className="h-full bg-white rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Tasks to improve score */}
      {tasks.length > 0 && (
        <div className="p-4">
          <p className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-500" />
            Improve your score
          </p>
          <div className="space-y-2">
            {tasks.map((task) => (
              <button
                key={task.id}
                onClick={() => {
                  if (task.id === 'checkup' || task.id === 'appointment') navigate('/diagyn');
                  else if (task.id === 'lab') navigate('/mango');
                  else navigate('/settings');
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
              >
                <Circle className="w-5 h-5 text-slate-300 group-hover:text-teal-500 transition-colors" />
                <span className="flex-1 text-sm text-slate-600 text-left group-hover:text-slate-800">{task.label}</span>
                <span className="text-xs font-medium text-teal-600 bg-teal-50 px-2 py-1 rounded-full">+{task.points} pts</span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-teal-500 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* View full dashboard */}
      <div className="px-4 pb-4">
        <Button
          variant="outline"
          onClick={() => navigate('/health-dashboard')}
          className="w-full rounded-xl border-slate-200 hover:bg-slate-50 hover:border-teal-300"
          data-testid="view-health-dashboard"
        >
          View Health Dashboard
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default HealthScoreWidget;

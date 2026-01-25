import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Trophy, Star, Medal, Crown, Target, Flame, Users, 
  Calendar, Pill, FlaskConical, Heart, CheckCircle2, 
  Lock, Sparkles, TrendingUp, Loader2, Gift
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ACHIEVEMENT_ICONS = {
  first_appointment: Calendar,
  five_appointments: Star,
  first_pharmacy: Pill,
  first_lab: FlaskConical,
  health_streak_7: Flame,
  health_streak_30: Trophy,
  referral_1: Users,
  referral_5: Crown,
  profile_complete: CheckCircle2,
  family_added: Heart
};

const CATEGORY_COLORS = {
  milestone: 'from-blue-500 to-indigo-500',
  streak: 'from-orange-500 to-red-500',
  social: 'from-purple-500 to-pink-500',
  profile: 'from-teal-500 to-cyan-500',
  family: 'from-pink-500 to-rose-500'
};

const Achievements = ({ compact = false }) => {
  const { user, token } = useAuth();
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(0);
  const [earnedCount, setEarnedCount] = useState(0);
  const [showAllDialog, setShowAllDialog] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (user && token) {
      fetchAchievements();
    }
  }, [user, token]);

  const fetchAchievements = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/features/gamification/achievements`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAchievements(response.data.achievements || []);
      setTotalPoints(response.data.total_points || 0);
      setEarnedCount(response.data.total_earned || 0);
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAchievements = async () => {
    setChecking(true);
    try {
      const response = await axios.post(`${API}/features/gamification/check-achievements`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.count > 0) {
        response.data.newly_earned.forEach(earned => {
          if (earned) {
            toast.success(`🎉 Achievement Unlocked: ${earned.achievement.name}!`);
          }
        });
        fetchAchievements();
      } else {
        toast.info('No new achievements yet. Keep going!');
      }
    } catch (error) {
      toast.error('Failed to check achievements');
    } finally {
      setChecking(false);
    }
  };

  const getIcon = (achievementId) => {
    const Icon = ACHIEVEMENT_ICONS[achievementId] || Star;
    return Icon;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  const earnedAchievements = achievements.filter(a => a.earned);
  const lockedAchievements = achievements.filter(a => !a.earned);

  // Compact view for dashboard
  if (compact) {
    return (
      <Card className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Achievements</h3>
              <p className="text-xs text-slate-500">{earnedCount}/{achievements.length} unlocked</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-amber-600">{totalPoints}</p>
            <p className="text-xs text-slate-500">points</p>
          </div>
        </div>
        
        {/* Recent achievements */}
        <div className="flex gap-2 mb-3">
          {earnedAchievements.slice(0, 5).map((ach) => {
            const Icon = getIcon(ach.id);
            return (
              <div
                key={ach.id}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg"
                title={ach.name}
              >
                <Icon className="w-5 h-5" />
              </div>
            );
          })}
          {lockedAchievements.slice(0, Math.max(0, 5 - earnedAchievements.length)).map((ach, idx) => (
            <div
              key={ach.id}
              className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-400"
              title="Locked"
            >
              <Lock className="w-4 h-4" />
            </div>
          ))}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAllDialog(true)}
          className="w-full rounded-xl border-amber-300 text-amber-700 hover:bg-amber-100"
        >
          View All Achievements
        </Button>

        {/* Full achievements dialog */}
        <Dialog open={showAllDialog} onOpenChange={setShowAllDialog}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                All Achievements
              </DialogTitle>
            </DialogHeader>
            <AchievementsList 
              achievements={achievements} 
              totalPoints={totalPoints}
              onCheck={checkAchievements}
              checking={checking}
            />
          </DialogContent>
        </Dialog>
      </Card>
    );
  }

  return (
    <AchievementsList 
      achievements={achievements} 
      totalPoints={totalPoints}
      onCheck={checkAchievements}
      checking={checking}
    />
  );
};

const AchievementsList = ({ achievements, totalPoints, onCheck, checking }) => {
  const earnedAchievements = achievements.filter(a => a.earned);
  const lockedAchievements = achievements.filter(a => !a.earned);

  const getIcon = (achievementId) => {
    const Icon = ACHIEVEMENT_ICONS[achievementId] || Star;
    return Icon;
  };

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white text-center">
          <Trophy className="w-6 h-6 mx-auto mb-1" />
          <p className="text-2xl font-bold">{totalPoints}</p>
          <p className="text-xs opacity-80">Total Points</p>
        </Card>
        <Card className="p-4 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white text-center">
          <Medal className="w-6 h-6 mx-auto mb-1" />
          <p className="text-2xl font-bold">{earnedAchievements.length}</p>
          <p className="text-xs opacity-80">Earned</p>
        </Card>
        <Card className="p-4 rounded-xl bg-gradient-to-br from-slate-400 to-slate-500 text-white text-center">
          <Lock className="w-6 h-6 mx-auto mb-1" />
          <p className="text-2xl font-bold">{lockedAchievements.length}</p>
          <p className="text-xs opacity-80">Locked</p>
        </Card>
      </div>

      {/* Check button */}
      <Button
        onClick={onCheck}
        disabled={checking}
        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-xl"
      >
        {checking ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <Sparkles className="w-4 h-4 mr-2" />
        )}
        Check for New Achievements
      </Button>

      {/* Earned Achievements */}
      {earnedAchievements.length > 0 && (
        <div>
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Earned ({earnedAchievements.length})
          </h3>
          <div className="grid gap-3">
            {earnedAchievements.map((ach) => {
              const Icon = getIcon(ach.id);
              const colorClass = CATEGORY_COLORS[ach.category] || 'from-amber-500 to-orange-500';
              return (
                <Card 
                  key={ach.id} 
                  className="p-4 rounded-xl border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center text-white shadow-lg`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-800">{ach.name}</h4>
                        <span className="text-lg">{ach.icon}</span>
                      </div>
                      <p className="text-sm text-slate-500">{ach.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                          +{ach.points} pts
                        </span>
                        {ach.earned_at && (
                          <span className="text-xs text-slate-400">
                            {new Date(ach.earned_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Locked Achievements */}
      {lockedAchievements.length > 0 && (
        <div>
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-400" />
            Locked ({lockedAchievements.length})
          </h3>
          <div className="grid gap-3">
            {lockedAchievements.map((ach) => {
              const Icon = getIcon(ach.id);
              const progress = ach.progress;
              const progressPercent = progress ? (progress.current / progress.target) * 100 : 0;
              
              return (
                <Card 
                  key={ach.id} 
                  className="p-4 rounded-xl border-slate-200 bg-slate-50/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400">
                      <Icon className="w-7 h-7" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-600">{ach.name}</h4>
                        <span className="text-lg grayscale opacity-50">{ach.icon}</span>
                      </div>
                      <p className="text-sm text-slate-400">{ach.description}</p>
                      {progress && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                            <span>Progress</span>
                            <span>{progress.current}/{progress.target}</span>
                          </div>
                          <Progress value={progressPercent} className="h-2" />
                        </div>
                      )}
                      <span className="text-xs text-slate-400 mt-1 inline-block">
                        {ach.points} pts when unlocked
                      </span>
                    </div>
                    <Lock className="w-5 h-5 text-slate-300" />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Achievements;

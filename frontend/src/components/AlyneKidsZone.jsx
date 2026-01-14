import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { 
  ArrowLeft, Star, Heart, Moon, MessageCircle, Send, 
  Sparkles, Trophy, CheckCircle, BookOpen, Smile, 
  Music, Zap, Gift, RefreshCw
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

// ============ MAIN KIDS ZONE COMPONENT ============
export const KidsZoneSection = ({ child, onBack }) => {
  const [view, setView] = useState('home');
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (child?.id) fetchDashboard();
  }, [child?.id]);

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${API}/api/alyne/kidszone/dashboard/${child.id}`);
      const data = await res.json();
      if (data.success) setDashboard(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  if (!child) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
          <div><h2 className="text-xl font-bold">ALYNE Kids Zone</h2></div>
        </div>
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardContent className="p-8 text-center">
            <Sparkles className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-purple-700">Add a Child First!</h3>
            <p className="text-sm text-gray-600 mt-2">Please add your child's profile to access the Kids Zone.</p>
            <Button onClick={onBack} className="mt-4 bg-purple-500 hover:bg-purple-600">Go Back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Sub-views
  if (view === 'stars') return <HealthStarsSection child={child} onBack={() => setView('home')} onRefresh={fetchDashboard} />;
  if (view === 'mood') return <MoodTrackerSection child={child} onBack={() => setView('home')} onRefresh={fetchDashboard} />;
  if (view === 'stories') return <BedtimeStoriesSection child={child} onBack={() => setView('home')} />;
  if (view === 'buddy') return <HealthBuddyChat child={child} onBack={() => setView('home')} />;

  // Home view
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            🌟 ALYNE Kids Zone
          </h2>
          <p className="text-sm text-gray-500">Fun health activities for {child.name}!</p>
        </div>
      </div>

      {/* Hero Card with Stats */}
      <Card className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white border-0 shadow-xl overflow-hidden">
        <CardContent className="p-5 relative">
          <div className="absolute top-2 right-2 opacity-20">
            <Star className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-3xl backdrop-blur-sm">
                {child.gender === 'female' ? '👧' : '👦'}
              </div>
              <div>
                <h3 className="text-xl font-bold">{child.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Star className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                  <span className="text-lg font-semibold">{loading ? '...' : dashboard?.total_stars || 0} Stars</span>
                </div>
              </div>
            </div>
            
            {!loading && dashboard && (
              <div className="grid grid-cols-3 gap-3 mt-5">
                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
                  <Zap className="w-6 h-6 mx-auto mb-1" />
                  <p className="text-2xl font-bold">{dashboard.streak_days}</p>
                  <p className="text-xs opacity-80">Day Streak</p>
                </div>
                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
                  <Trophy className="w-6 h-6 mx-auto mb-1" />
                  <p className="text-2xl font-bold">{dashboard.earned_rewards?.length || 0}</p>
                  <p className="text-xs opacity-80">Badges</p>
                </div>
                <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 text-center">
                  <CheckCircle className="w-6 h-6 mx-auto mb-1" />
                  <p className="text-2xl font-bold">{dashboard.today_activities}</p>
                  <p className="text-xs opacity-80">Today</p>
                </div>
              </div>
            )}

            {/* Next Reward Progress */}
            {!loading && dashboard?.next_reward && (
              <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-xl p-3">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>Next: {dashboard.next_reward.emoji} {dashboard.next_reward.reward}</span>
                  <span>{dashboard.total_stars}/{dashboard.next_reward.stars}</span>
                </div>
                <Progress value={(dashboard.total_stars / dashboard.next_reward.stars) * 100} className="h-2 bg-white/30" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Today's Mood */}
      {!loading && dashboard?.today_mood && (
        <Card className="border-0 shadow-md bg-gradient-to-r from-amber-50 to-orange-50">
          <CardContent className="p-4 flex items-center gap-3">
            <span className="text-4xl">{dashboard.today_mood.mood_emoji}</span>
            <div>
              <p className="font-medium text-amber-800">Today's Mood: {dashboard.today_mood.mood_name}</p>
              {dashboard.today_mood.note && <p className="text-sm text-gray-600">{dashboard.today_mood.note}</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feature Grid */}
      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => setView('stars')} className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white rounded-2xl p-5 text-left shadow-lg hover:shadow-xl transition-all active:scale-95">
          <Star className="w-10 h-10 mb-3" />
          <h3 className="font-bold text-lg">Health Stars</h3>
          <p className="text-xs opacity-90 mt-1">Earn stars for healthy habits!</p>
        </button>

        <button onClick={() => setView('mood')} className="bg-gradient-to-br from-pink-400 to-rose-500 text-white rounded-2xl p-5 text-left shadow-lg hover:shadow-xl transition-all active:scale-95">
          <Smile className="w-10 h-10 mb-3" />
          <h3 className="font-bold text-lg">Mood Tracker</h3>
          <p className="text-xs opacity-90 mt-1">How are you feeling?</p>
        </button>

        <button onClick={() => setView('buddy')} className="bg-gradient-to-br from-blue-400 to-cyan-500 text-white rounded-2xl p-5 text-left shadow-lg hover:shadow-xl transition-all active:scale-95">
          <MessageCircle className="w-10 h-10 mb-3" />
          <h3 className="font-bold text-lg">Health Buddy</h3>
          <p className="text-xs opacity-90 mt-1">Chat with ALYNE Buddy!</p>
        </button>

        <button onClick={() => setView('stories')} className="bg-gradient-to-br from-purple-400 to-indigo-500 text-white rounded-2xl p-5 text-left shadow-lg hover:shadow-xl transition-all active:scale-95">
          <Moon className="w-10 h-10 mb-3" />
          <h3 className="font-bold text-lg">Bedtime Stories</h3>
          <p className="text-xs opacity-90 mt-1">Health tales before sleep!</p>
        </button>
      </div>

      {/* Earned Badges */}
      {!loading && dashboard?.earned_rewards?.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" /> Earned Badges
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex gap-3 overflow-x-auto pb-2">
              {dashboard.earned_rewards.map((r, i) => (
                <div key={i} className="flex-shrink-0 w-20 text-center">
                  <div className="w-14 h-14 mx-auto bg-gradient-to-br from-amber-100 to-yellow-200 rounded-full flex items-center justify-center text-2xl shadow-md">
                    {r.emoji}
                  </div>
                  <p className="text-xs mt-1 font-medium text-gray-600 line-clamp-2">{r.reward}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ============ HEALTH STARS SECTION ============
const HealthStarsSection = ({ child, onBack, onRefresh }) => {
  const [activities, setActivities] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [totalStars, setTotalStars] = useState(0);
  const [loading, setLoading] = useState(true);
  const [celebrating, setCelebrating] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [activitiesRes, starsRes] = await Promise.all([
        fetch(`${API}/api/alyne/kidszone/activities`),
        fetch(`${API}/api/alyne/kidszone/stars/${child.id}`)
      ]);
      const activitiesData = await activitiesRes.json();
      const starsData = await starsRes.json();
      
      setActivities(activitiesData.activities || []);
      setCompleted(starsData.completed_today || []);
      setTotalStars(starsData.total_stars || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const logActivity = async (activity) => {
    if (completed.includes(activity.id)) {
      toast.info("Already done today! ⭐");
      return;
    }

    try {
      const res = await fetch(`${API}/api/alyne/kidszone/stars/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: child.id,
          activity_id: activity.id,
          date: new Date().toISOString().split('T')[0]
        })
      });
      const data = await res.json();
      
      if (data.success) {
        setCompleted(prev => [...prev, activity.id]);
        setTotalStars(data.total_stars);
        setCelebrating(activity);
        toast.success(data.message);
        
        if (data.new_reward) {
          setTimeout(() => {
            toast.success(`🎉 NEW BADGE: ${data.new_reward.emoji} ${data.new_reward.reward}!`, { duration: 5000 });
          }, 1000);
        }
        
        setTimeout(() => setCelebrating(null), 2000);
        onRefresh?.();
      } else if (data.already_done) {
        toast.info("Already done today! ⭐");
      }
    } catch (e) { toast.error("Oops! Try again."); }
  };

  // Group activities by category
  const categories = {
    hygiene: { name: "Clean & Fresh", icon: "🧼", color: "from-blue-400 to-cyan-400" },
    nutrition: { name: "Yummy & Healthy", icon: "🥗", color: "from-green-400 to-emerald-400" },
    fitness: { name: "Strong & Active", icon: "💪", color: "from-orange-400 to-red-400" },
    rest: { name: "Rest & Relax", icon: "😴", color: "from-purple-400 to-indigo-400" },
    health: { name: "Health Care", icon: "💊", color: "from-pink-400 to-rose-400" },
    kindness: { name: "Kind Heart", icon: "💝", color: "from-amber-400 to-yellow-400" },
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold">⭐ Health Stars</h2>
          <p className="text-sm text-gray-500">Tap activities you completed!</p>
        </div>
        <Badge className="bg-yellow-500 text-lg px-3">{totalStars} ⭐</Badge>
      </div>

      {/* Celebration Animation */}
      {celebrating && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <div className="animate-bounce text-8xl">{celebrating.emoji}</div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Loading activities...</div>
      ) : (
        Object.entries(categories).map(([catId, cat]) => {
          const catActivities = activities.filter(a => a.category === catId);
          if (catActivities.length === 0) return null;
          
          return (
            <div key={catId}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{cat.icon}</span>
                <h3 className="font-semibold text-gray-700">{cat.name}</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {catActivities.map(activity => {
                  const isDone = completed.includes(activity.id);
                  return (
                    <button
                      key={activity.id}
                      onClick={() => logActivity(activity)}
                      disabled={isDone}
                      className={`relative p-4 rounded-2xl text-left transition-all ${
                        isDone 
                          ? 'bg-gray-100 opacity-60' 
                          : `bg-gradient-to-br ${cat.color} text-white shadow-lg hover:shadow-xl active:scale-95`
                      }`}
                      data-testid={`activity-${activity.id}`}
                    >
                      {isDone && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle className="w-6 h-6 text-green-500" />
                        </div>
                      )}
                      <span className="text-3xl block mb-2">{activity.emoji}</span>
                      <p className={`font-medium text-sm ${isDone ? 'text-gray-600' : 'text-white'}`}>
                        {activity.name}
                      </p>
                      <div className={`flex items-center gap-1 mt-1 text-xs ${isDone ? 'text-gray-500' : 'text-white/80'}`}>
                        <Star className="w-3 h-3" /> +{activity.stars}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

// ============ MOOD TRACKER SECTION ============
const MoodTrackerSection = ({ child, onBack, onRefresh }) => {
  const [moods, setMoods] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMood, setSelectedMood] = useState(null);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [moodsRes, historyRes] = await Promise.all([
        fetch(`${API}/api/alyne/kidszone/moods`),
        fetch(`${API}/api/alyne/kidszone/mood/${child.id}`)
      ]);
      const moodsData = await moodsRes.json();
      const historyData = await historyRes.json();
      
      setMoods(moodsData.moods || []);
      setHistory(historyData.mood_logs || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const logMood = async () => {
    if (!selectedMood) return;
    
    try {
      const res = await fetch(`${API}/api/alyne/kidszone/mood/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: child.id,
          mood_id: selectedMood.id,
          note: note || null
        })
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(data.message, { duration: 4000 });
        setSelectedMood(null);
        setNote('');
        setShowNote(false);
        fetchData();
        onRefresh?.();
      }
    } catch (e) { toast.error("Oops! Try again."); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
        <div>
          <h2 className="text-xl font-bold">😊 Mood Tracker</h2>
          <p className="text-sm text-gray-500">How are you feeling, {child.name}?</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <>
          {/* Mood Selection */}
          <Card className="bg-gradient-to-br from-pink-50 to-purple-50 border-0 shadow-lg">
            <CardContent className="p-5">
              <p className="text-center font-medium text-gray-700 mb-4">Tap how you feel right now!</p>
              <div className="grid grid-cols-4 gap-3">
                {moods.map(mood => (
                  <button
                    key={mood.id}
                    onClick={() => { setSelectedMood(mood); setShowNote(true); }}
                    className={`flex flex-col items-center p-3 rounded-2xl transition-all ${
                      selectedMood?.id === mood.id 
                        ? 'bg-white shadow-lg scale-110 ring-2 ring-purple-400' 
                        : 'bg-white/50 hover:bg-white hover:shadow-md'
                    }`}
                    data-testid={`mood-${mood.id}`}
                  >
                    <span className="text-4xl mb-1">{mood.emoji}</span>
                    <span className="text-xs font-medium text-gray-600">{mood.name}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Add Note Dialog */}
          <Dialog open={showNote} onOpenChange={setShowNote}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span className="text-4xl">{selectedMood?.emoji}</span>
                  <span>Feeling {selectedMood?.name}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input
                  placeholder="Want to say more? (optional)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="text-lg"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNote(false)}>Cancel</Button>
                <Button onClick={logMood} className="bg-purple-500 hover:bg-purple-600">
                  Save Mood 💜
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Recent Moods */}
          {history.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">Recent Moods</h3>
              <div className="space-y-2">
                {history.slice(0, 7).map((log, i) => (
                  <Card key={i} className="border-0 shadow-sm">
                    <CardContent className="p-3 flex items-center gap-3">
                      <span className="text-2xl">{log.mood_emoji}</span>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{log.mood_name}</p>
                        {log.note && <p className="text-xs text-gray-500">{log.note}</p>}
                      </div>
                      <span className="text-xs text-gray-400">{log.date}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ============ BEDTIME STORIES SECTION ============
const BedtimeStoriesSection = ({ child, onBack }) => {
  const [themes, setThemes] = useState([]);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [currentStory, setCurrentStory] = useState(null);
  const [sessionId] = useState(`story_${Date.now()}`);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [themesRes, storiesRes] = await Promise.all([
        fetch(`${API}/api/alyne/kidszone/stories/themes`),
        fetch(`${API}/api/alyne/kidszone/stories/${child.id}`)
      ]);
      const themesData = await themesRes.json();
      const storiesData = await storiesRes.json();
      
      setThemes(themesData.themes || []);
      setStories(storiesData.stories || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const generateStory = async (theme) => {
    setGenerating(true);
    try {
      const res = await fetch(`${API}/api/alyne/kidszone/stories/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: child.id,
          theme_id: theme.id,
          child_name: child.name,
          age: calculateAge(child.date_of_birth),
          session_id: sessionId
        })
      });
      const data = await res.json();
      
      if (data.success) {
        setCurrentStory({ story: data.story, theme: data.theme });
        fetchData(); // Refresh stories list
      } else {
        toast.error("Could not create story. Try again!");
      }
    } catch (e) { 
      console.error(e);
      toast.error("Story creation failed."); 
    }
    finally { setGenerating(false); }
  };

  const calculateAge = (dob) => {
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return Math.max(3, Math.min(8, age)); // Clamp between 3-8
  };

  // Story display view
  if (currentStory) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setCurrentStory(null)}><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <h2 className="text-xl font-bold">{currentStory.theme.icon} {currentStory.theme.name}</h2>
            <p className="text-sm text-gray-500">A story for {child.name}</p>
          </div>
        </div>
        
        <Card className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-0 shadow-xl">
          <CardContent className="p-6">
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap text-gray-700 leading-relaxed text-base">
                {currentStory.story}
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setCurrentStory(null)} className="flex-1">
            <BookOpen className="w-4 h-4 mr-2" /> More Stories
          </Button>
          <Button onClick={() => generateStory(currentStory.theme)} className="flex-1 bg-purple-500 hover:bg-purple-600">
            <RefreshCw className="w-4 h-4 mr-2" /> New Version
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
        <div>
          <h2 className="text-xl font-bold">🌙 Bedtime Stories</h2>
          <p className="text-sm text-gray-500">Health tales for sweet dreams!</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading stories...</div>
      ) : (
        <>
          {/* Story Themes */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Choose a Story Theme</h3>
            <div className="grid grid-cols-2 gap-3">
              {themes.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => generateStory(theme)}
                  disabled={generating}
                  className="bg-gradient-to-br from-purple-100 to-indigo-100 hover:from-purple-200 hover:to-indigo-200 p-4 rounded-2xl text-left transition-all active:scale-95 disabled:opacity-50"
                  data-testid={`story-theme-${theme.id}`}
                >
                  <span className="text-3xl block mb-2">{theme.icon}</span>
                  <p className="font-medium text-sm text-purple-800">{theme.name}</p>
                </button>
              ))}
            </div>
          </div>

          {generating && (
            <Card className="border-purple-200 bg-purple-50">
              <CardContent className="p-6 text-center">
                <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                <p className="text-purple-700">Creating a magical story for {child.name}...</p>
              </CardContent>
            </Card>
          )}

          {/* Saved Stories */}
          {stories.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">Your Stories</h3>
              <div className="space-y-2">
                {stories.map((story, i) => (
                  <Card 
                    key={i} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setCurrentStory({ story: story.story, theme: { icon: story.theme_icon, name: story.theme_name } })}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <span className="text-2xl">{story.theme_icon}</span>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{story.theme_name}</p>
                        <p className="text-xs text-gray-500">{new Date(story.created_at).toLocaleDateString()}</p>
                      </div>
                      <BookOpen className="w-5 h-5 text-gray-400" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ============ HEALTH BUDDY CHAT WITH VOICE ============
const HealthBuddyChat = ({ child, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(`buddy_${Date.now()}`);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const endRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);

  useEffect(() => { 
    endRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [messages]);

  const calculateAge = (dob) => {
    const today = new Date();
    const birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return Math.max(3, Math.min(8, age));
  };

  const quickPrompts = [
    "Hi! 👋",
    "I feel ouchie 🤕",
    "Tell me a joke! 😄",
    "Why drink water? 💧"
  ];

  // Start voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        await sendVoiceMessage(audioBlob);
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (e) {
      console.error('Microphone error:', e);
      toast.error("Can't use microphone. Check permissions!");
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Send voice message to backend
  const sendVoiceMessage = async (audioBlob) => {
    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: '🎤 Voice message...', isVoice: true }]);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice.webm');
      formData.append('child_id', child.id);
      formData.append('child_name', child.name);
      formData.append('age', calculateAge(child.date_of_birth));
      formData.append('session_id', sessionId);
      
      const res = await fetch(`${API}/api/alyne/kidszone/buddy/voice`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (data.success) {
        // Update the user message with transcription
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'user', content: data.transcription, isVoice: true };
          return [...updated, { role: 'assistant', content: data.response, audioBase64: data.audio_base64 }];
        });
        
        // Auto-play the response
        if (data.audio_base64) {
          playAudio(data.audio_base64);
        }
      } else {
        setMessages(prev => prev.slice(0, -1));
        toast.error(data.error || "Couldn't understand. Try again!");
      }
    } catch (e) {
      console.error(e);
      setMessages(prev => prev.slice(0, -1));
      toast.error("Voice chat error. Try again!");
    }
    finally { setLoading(false); }
  };

  // Play audio response
  const playAudio = (base64Audio) => {
    try {
      const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
      audioRef.current = audio;
      setIsPlaying(true);
      audio.play();
      audio.onended = () => setIsPlaying(false);
    } catch (e) {
      console.error('Audio play error:', e);
    }
  };

  // Stop audio
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  // Text chat send
  const send = async (text = input) => {
    const msg = text.trim();
    if (!msg) return;
    
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    
    try {
      const res = await fetch(`${API}/api/alyne/kidszone/buddy/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: child.id,
          message: msg,
          child_name: child.name,
          age: calculateAge(child.date_of_birth),
          session_id: sessionId
        })
      });
      const data = await res.json();
      
      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        toast.error("ALYNE Buddy is taking a nap. Try again!");
      }
    } catch (e) { 
      console.error(e);
      toast.error("Oops! Let's try again."); 
    }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center text-2xl shadow-lg">
              🧸
            </div>
            <div>
              <h2 className="text-lg font-bold">ALYNE Buddy</h2>
              <p className="text-xs text-green-500">Online • Ready to chat!</p>
            </div>
          </div>
        </div>
        {/* Voice Mode Toggle */}
        <button
          onClick={() => setVoiceMode(!voiceMode)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
            voiceMode 
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {voiceMode ? '🎤 Voice ON' : '⌨️ Text'}
        </button>
      </div>

      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="h-[320px] overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-blue-50 to-white">
          {messages.length === 0 && (
            <div className="text-center py-6">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center text-4xl shadow-lg">
                🧸
              </div>
              <p className="text-lg font-semibold text-blue-700">Hi {child.name}! 👋</p>
              <p className="text-sm text-gray-500 mt-1">
                {voiceMode ? "Press the mic button and talk to me!" : "Type or tap to chat with me!"}
              </p>
              {!voiceMode && (
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {quickPrompts.map((q, i) => (
                    <button 
                      key={i} 
                      onClick={() => send(q)} 
                      className="text-sm px-4 py-2 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                m.role === 'user' 
                  ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-br-sm' 
                  : 'bg-white border shadow-sm rounded-bl-sm'
              }`}>
                {m.isVoice && <span className="text-xs opacity-70">🎤 </span>}
                <p className="whitespace-pre-wrap">{m.content}</p>
                {/* Play button for assistant audio */}
                {m.role === 'assistant' && m.audioBase64 && (
                  <button
                    onClick={() => isPlaying ? stopAudio() : playAudio(m.audioBase64)}
                    className="mt-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full hover:bg-blue-200"
                  >
                    {isPlaying ? '⏹️ Stop' : '🔊 Listen'}
                  </button>
                )}
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border p-3 rounded-2xl shadow-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay:'0.1s'}}></div>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay:'0.2s'}}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        
        {/* Input Area */}
        <div className="p-4 border-t bg-white">
          {voiceMode ? (
            /* Voice Input Mode */
            <div className="flex flex-col items-center gap-3">
              <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                disabled={loading}
                className={`w-20 h-20 rounded-full transition-all shadow-lg ${
                  isRecording 
                    ? 'bg-red-500 scale-110 animate-pulse' 
                    : 'bg-gradient-to-br from-blue-500 to-cyan-500 hover:scale-105'
                } text-white flex items-center justify-center`}
                data-testid="voice-record-btn"
              >
                <span className="text-3xl">{isRecording ? '🔴' : '🎤'}</span>
              </button>
              <p className="text-sm text-gray-500">
                {isRecording ? '🎙️ Listening... Release to send' : 'Press & hold to talk'}
              </p>
            </div>
          ) : (
            /* Text Input Mode */
            <div className="flex gap-2">
              <Input 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                placeholder="Type your message..." 
                onKeyPress={(e) => e.key === 'Enter' && send()}
                className="text-base"
                data-testid="buddy-chat-input"
              />
              <Button 
                onClick={() => send()} 
                disabled={loading} 
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                data-testid="buddy-chat-send"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default KidsZoneSection;

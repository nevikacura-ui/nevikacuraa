import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { 
  Baby, Droplets, Moon, TrendingUp, Check, AlertTriangle,
  Scale, Ruler, Activity, Heart, Utensils
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

const API = process.env.REACT_APP_BACKEND_URL;

const StatCard = ({ icon: Icon, title, value, subtitle, color }) => (
  <Card className="bg-gradient-to-br from-white to-gray-50 border-none shadow-md hover:shadow-lg transition-shadow">
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-xs text-gray-500">{title}</p>
          <p className="text-xl font-bold text-gray-800">{value}</p>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function AanyaNewbornCare({ childId, childName, childGender }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [dailyLog, setDailyLog] = useState(null);
  const [feedingSummary, setFeedingSummary] = useState(null);
  const [sleepSummary, setSleepSummary] = useState(null);
  const [diaperSummary, setDiaperSummary] = useState(null);
  const [milestones, setMilestones] = useState(null);
  const [growthSummary, setGrowthSummary] = useState(null);
  const [growthChart, setGrowthChart] = useState(null);
  const [healthAlerts, setHealthAlerts] = useState([]);
  
  // Dialogs
  const [showFeedingDialog, setShowFeedingDialog] = useState(false);
  const [showDiaperDialog, setShowDiaperDialog] = useState(false);
  const [showSleepDialog, setShowSleepDialog] = useState(false);
  const [showGrowthDialog, setShowGrowthDialog] = useState(false);
  
  // Form states
  const [feedingForm, setFeedingForm] = useState({ feed_type: 'breastfeed', breast_side: 'left', duration_minutes: 15, amount_ml: 0 });
  const [diaperForm, setDiaperForm] = useState({ type: 'wet', consistency: 'normal', color: 'yellow' });
  const [sleepForm, setSleepForm] = useState({ sleep_type: 'nap', quality: 'good' });
  const [growthForm, setGrowthForm] = useState({ measurement_type: 'weight', value: '', date: new Date().toISOString().split('T')[0] });
  const [activeSleep, setActiveSleep] = useState(null);

  const fetchDailyLog = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/alyne/newborn/${childId}/daily-log`);
      const data = await res.json();
      if (data.success) setDailyLog(data);
    } catch (err) { console.error('Error fetching daily log:', err); }
  }, [childId]);

  const fetchSummaries = useCallback(async () => {
    try {
      const [feeding, sleep, diaper] = await Promise.all([
        fetch(`${API}/api/alyne/newborn/${childId}/feeding-summary?days=7`).then(r => r.json()),
        fetch(`${API}/api/alyne/newborn/${childId}/sleep-summary?days=7`).then(r => r.json()),
        fetch(`${API}/api/alyne/newborn/${childId}/diaper-summary?days=7`).then(r => r.json())
      ]);
      if (feeding.success) setFeedingSummary(feeding);
      if (sleep.success) setSleepSummary(sleep);
      if (diaper.success) setDiaperSummary(diaper);
    } catch (err) { console.error('Error fetching summaries:', err); }
  }, [childId]);

  const fetchMilestones = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/alyne/newborn/${childId}/milestones`);
      const data = await res.json();
      if (data.success) setMilestones(data);
    } catch (err) { console.error('Error fetching milestones:', err); }
  }, [childId]);

  const fetchGrowthData = useCallback(async () => {
    try {
      const [summary, chart] = await Promise.all([
        fetch(`${API}/api/alyne/aanya/growth/${childId}/summary`).then(r => r.json()),
        fetch(`${API}/api/alyne/aanya/growth/${childId}/chart?measurement_type=weight`).then(r => r.json())
      ]);
      if (summary.success) setGrowthSummary(summary);
      if (chart.success) setGrowthChart(chart);
    } catch (err) { console.error('Error fetching growth data:', err); }
  }, [childId]);

  const fetchHealthAlerts = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/alyne/newborn/${childId}/health-alerts`);
      const data = await res.json();
      if (data.success) setHealthAlerts(data.alerts || []);
    } catch (err) { console.error('Error fetching alerts:', err); }
  }, [childId]);

  useEffect(() => {
    if (childId) {
      fetchDailyLog();
      fetchSummaries();
      fetchMilestones();
      fetchGrowthData();
      fetchHealthAlerts();
    }
  }, [childId, fetchDailyLog, fetchSummaries, fetchMilestones, fetchGrowthData, fetchHealthAlerts]);

  const handleLogFeeding = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/alyne/newborn/feeding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId, ...feedingForm })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setShowFeedingDialog(false);
        fetchDailyLog();
        fetchSummaries();
      } else {
        toast.error(data.detail || 'Failed to log feeding');
      }
    } catch (err) { toast.error('Error logging feeding'); }
    setLoading(false);
  };

  const handleLogDiaper = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/alyne/newborn/diaper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId, ...diaperForm })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setShowDiaperDialog(false);
        fetchDailyLog();
        fetchSummaries();
      }
    } catch (err) { toast.error('Error logging diaper'); }
    setLoading(false);
  };

  const handleStartSleep = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/alyne/newborn/sleep`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          child_id: childId, 
          sleep_start: new Date().toISOString(),
          ...sleepForm 
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Sleep started');
        setActiveSleep(data.sleep_id);
        setShowSleepDialog(false);
        fetchDailyLog();
      }
    } catch (err) { toast.error('Error starting sleep'); }
    setLoading(false);
  };

  const handleEndSleep = async () => {
    if (!activeSleep) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/alyne/newborn/sleep/${activeSleep}/end`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) {
        toast.success(`Sleep ended: ${data.duration_minutes} minutes`);
        setActiveSleep(null);
        fetchDailyLog();
        fetchSummaries();
      }
    } catch (err) { toast.error('Error ending sleep'); }
    setLoading(false);
  };

  const handleRecordGrowth = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/alyne/aanya/growth/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId, ...growthForm })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        if (data.alert) toast.warning(data.alert);
        setShowGrowthDialog(false);
        fetchGrowthData();
      }
    } catch (err) { toast.error('Error recording growth'); }
    setLoading(false);
  };

  // Aanya by Alyne logo
  const AANYA_LOGO = "https://customer-assets.emergentagent.com/job_nevika-hub/artifacts/8mqg0viu_file_00000000bf947207a0e573e6763f822a.png";

  return (
    <div className="space-y-6">
      {/* Header with Aanya Logo */}
      <div className="bg-gradient-to-r from-[#f0f8f0] via-[#fef9f0] to-[#fff0f5] rounded-2xl p-6 shadow-lg border border-pink-100">
        <div className="flex items-center gap-4 mb-2">
          <img 
            src={AANYA_LOGO} 
            alt="Aanya Newborn by Alyne" 
            className="w-20 h-20 object-contain"
            data-testid="aanya-logo"
          />
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-500 via-pink-500 to-cyan-500 bg-clip-text text-transparent">
              Aanya Newborn
            </h2>
            <p className="text-cyan-600 text-sm font-medium">— BY Alyne —</p>
            <p className="text-gray-600 text-sm mt-1">Newborn Care Tracker for {childName}</p>
          </div>
        </div>
        {milestones && (
          <div className="mt-3 p-2 bg-white/70 rounded-lg inline-block">
            <p className="text-sm text-gray-700">
              <Baby className="w-4 h-4 inline mr-1 text-pink-500" />
              Age: <span className="font-semibold text-pink-600">{milestones.age_weeks} weeks</span> ({milestones.age_months} months)
            </p>
          </div>
        )}
      </div>

      {/* Health Alerts */}
      {healthAlerts.length > 0 && (
        <div className="space-y-2">
          {healthAlerts.map((alert, idx) => (
            <div key={idx} className={`p-3 rounded-lg flex items-center gap-2 ${
              alert.type === 'alert' ? 'bg-red-50 border border-red-200 text-red-700' :
              alert.type === 'warning' ? 'bg-amber-50 border border-amber-200 text-amber-700' :
              'bg-blue-50 border border-blue-200 text-blue-700'
            }`}>
              <AlertTriangle className="w-5 h-5" />
              <div>
                <p className="font-medium">{alert.message}</p>
                <p className="text-xs opacity-75">{alert.action}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Button onClick={() => setShowFeedingDialog(true)} className="h-20 flex flex-col gap-2 bg-amber-500 hover:bg-amber-600">
          <Utensils className="w-6 h-6" />
          <span>Log Feeding</span>
        </Button>
        <Button onClick={() => setShowDiaperDialog(true)} className="h-20 flex flex-col gap-2 bg-blue-500 hover:bg-blue-600">
          <Droplets className="w-6 h-6" />
          <span>Log Diaper</span>
        </Button>
        {activeSleep ? (
          <Button onClick={handleEndSleep} className="h-20 flex flex-col gap-2 bg-green-500 hover:bg-green-600">
            <Moon className="w-6 h-6 animate-pulse" />
            <span>End Sleep</span>
          </Button>
        ) : (
          <Button onClick={() => setShowSleepDialog(true)} className="h-20 flex flex-col gap-2 bg-indigo-500 hover:bg-indigo-600">
            <Moon className="w-6 h-6" />
            <span>Start Sleep</span>
          </Button>
        )}
        <Button onClick={() => setShowGrowthDialog(true)} className="h-20 flex flex-col gap-2 bg-pink-500 hover:bg-pink-600">
          <TrendingUp className="w-6 h-6" />
          <span>Log Growth</span>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="growth">Growth Chart</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={Utensils} title="Feeds Today" value={dailyLog?.summary?.total_feeds || 0} color="bg-amber-500" />
            <StatCard icon={Droplets} title="Diapers Today" value={dailyLog?.summary?.total_diaper_changes || 0} color="bg-blue-500" />
            <StatCard icon={Moon} title="Sleep Today" value={`${dailyLog?.summary?.total_sleep_hours || 0}h`} color="bg-indigo-500" />
            <StatCard icon={Heart} title="Health Score" value="Good" color="bg-green-500" />
          </div>

          {/* 7-Day Summary */}
          <Card>
            <CardHeader><CardTitle className="text-lg">7-Day Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-amber-50 rounded-lg">
                  <p className="text-2xl font-bold text-amber-600">{feedingSummary?.daily_average || 0}</p>
                  <p className="text-xs text-gray-500">Avg Feeds/Day</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{diaperSummary?.daily_average || 0}</p>
                  <p className="text-xs text-gray-500">Avg Diapers/Day</p>
                </div>
                <div className="p-3 bg-indigo-50 rounded-lg">
                  <p className="text-2xl font-bold text-indigo-600">{sleepSummary?.average_daily_hours || 0}h</p>
                  <p className="text-xs text-gray-500">Avg Sleep/Day</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Growth Chart Tab */}
        <TabsContent value="growth" className="space-y-4">
          {growthSummary && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Growth Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-pink-50 rounded-lg">
                    <Scale className="w-6 h-6 mx-auto text-pink-500 mb-1" />
                    <p className="text-xl font-bold">{growthSummary.measurements?.weight?.latest || '--'} kg</p>
                    <p className="text-xs text-gray-500">{growthSummary.measurements?.weight?.percentile?.percentile || 'No data'}</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <Ruler className="w-6 h-6 mx-auto text-blue-500 mb-1" />
                    <p className="text-xl font-bold">{growthSummary.measurements?.height?.latest || '--'} cm</p>
                    <p className="text-xs text-gray-500">{growthSummary.measurements?.height?.percentile?.percentile || 'No data'}</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <Activity className="w-6 h-6 mx-auto text-purple-500 mb-1" />
                    <p className="text-xl font-bold">{growthSummary.measurements?.head_circumference?.latest || '--'} cm</p>
                    <p className="text-xs text-gray-500">Head Circ.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {growthChart && growthChart.measurements?.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Weight Growth Chart (WHO Percentiles)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={growthChart.reference_curves?.["50th"]?.map((p, i) => ({
                    month: p.month,
                    p3: growthChart.reference_curves?.["3rd"]?.[i]?.value,
                    p50: p.value,
                    p97: growthChart.reference_curves?.["97th"]?.[i]?.value,
                    actual: growthChart.measurements?.find(m => m.age_months === p.month)?.value
                  })) || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" label={{ value: 'Age (months)', position: 'bottom' }} />
                    <YAxis label={{ value: 'Weight (kg)', angle: -90, position: 'left' }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="p97" stroke="#fca5a5" fill="#fef2f2" name="97th" />
                    <Area type="monotone" dataKey="p50" stroke="#86efac" fill="#f0fdf4" name="50th" />
                    <Area type="monotone" dataKey="p3" stroke="#93c5fd" fill="#eff6ff" name="3rd" />
                    <Line type="monotone" dataKey="actual" stroke="#ec4899" strokeWidth={3} dot={{ r: 6 }} name="Baby Weight" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Milestones Tab */}
        <TabsContent value="milestones" className="space-y-4">
          {milestones && Object.entries(milestones.milestones || {}).map(([category, items]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-lg capitalize">{category} Milestones</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {items.map((m, idx) => (
                    <div key={idx} className={`flex items-center gap-3 p-2 rounded-lg ${
                      m.status === 'achieved' ? 'bg-green-50' :
                      m.status === 'due' ? 'bg-amber-50' :
                      m.status === 'upcoming' ? 'bg-blue-50' : 'bg-gray-50'
                    }`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        m.status === 'achieved' ? 'bg-green-500 text-white' :
                        m.status === 'due' ? 'bg-amber-500 text-white' :
                        'bg-gray-300 text-gray-500'
                      }`}>
                        {m.status === 'achieved' ? <Check className="w-4 h-4" /> : idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{m.name}</p>
                        <p className="text-xs text-gray-500">{m.description} • Week {m.expected_week}</p>
                      </div>
                      {m.status === 'due' && (
                        <span className="text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded">Due</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader><CardTitle className="text-lg">Today's Timeline</CardTitle></CardHeader>
            <CardContent>
              {dailyLog?.timeline?.length > 0 ? (
                <div className="space-y-3">
                  {dailyLog.timeline.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 border-l-4 pl-4 bg-gray-50 rounded-r-lg" style={{
                      borderColor: item.type === 'feeding' ? '#f59e0b' : item.type === 'diaper' ? '#3b82f6' : '#6366f1'
                    }}>
                      <div className="text-xs text-gray-500 w-16">
                        {new Date(item.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm capitalize">{item.type}</p>
                        <p className="text-xs text-gray-500">
                          {item.type === 'feeding' && `${item.details.feed_type} - ${item.details.duration_minutes || item.details.amount_ml}${item.details.duration_minutes ? ' min' : ' ml'}`}
                          {item.type === 'diaper' && `${item.details.type}`}
                          {item.type === 'sleep' && `${item.details.sleep_type}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No activities logged today yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Feeding Dialog */}
      <Dialog open={showFeedingDialog} onOpenChange={setShowFeedingDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Feeding</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Feed Type</Label>
              <Select value={feedingForm.feed_type} onValueChange={v => setFeedingForm({...feedingForm, feed_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="breastfeed">Breastfeed</SelectItem>
                  <SelectItem value="formula">Formula</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                  <SelectItem value="solid">Solid Food</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {feedingForm.feed_type === 'breastfeed' && (
              <>
                <div>
                  <Label>Side</Label>
                  <Select value={feedingForm.breast_side} onValueChange={v => setFeedingForm({...feedingForm, breast_side: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Duration (minutes)</Label>
                  <Input type="number" value={feedingForm.duration_minutes} onChange={e => setFeedingForm({...feedingForm, duration_minutes: parseInt(e.target.value)})} />
                </div>
              </>
            )}
            {feedingForm.feed_type === 'formula' && (
              <div>
                <Label>Amount (ml)</Label>
                <Input type="number" value={feedingForm.amount_ml} onChange={e => setFeedingForm({...feedingForm, amount_ml: parseInt(e.target.value)})} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFeedingDialog(false)}>Cancel</Button>
            <Button onClick={handleLogFeeding} disabled={loading}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diaper Dialog */}
      <Dialog open={showDiaperDialog} onOpenChange={setShowDiaperDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log Diaper Change</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select value={diaperForm.type} onValueChange={v => setDiaperForm({...diaperForm, type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="wet">Wet</SelectItem>
                  <SelectItem value="dirty">Dirty</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                  <SelectItem value="dry">Dry</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Consistency</Label>
              <Select value={diaperForm.consistency} onValueChange={v => setDiaperForm({...diaperForm, consistency: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="loose">Loose</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDiaperDialog(false)}>Cancel</Button>
            <Button onClick={handleLogDiaper} disabled={loading}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sleep Dialog */}
      <Dialog open={showSleepDialog} onOpenChange={setShowSleepDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Start Sleep Session</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Sleep Type</Label>
              <Select value={sleepForm.sleep_type} onValueChange={v => setSleepForm({...sleepForm, sleep_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nap">Nap</SelectItem>
                  <SelectItem value="night_sleep">Night Sleep</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSleepDialog(false)}>Cancel</Button>
            <Button onClick={handleStartSleep} disabled={loading}>Start Sleep</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Growth Dialog */}
      <Dialog open={showGrowthDialog} onOpenChange={setShowGrowthDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Growth Measurement</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Measurement Type</Label>
              <Select value={growthForm.measurement_type} onValueChange={v => setGrowthForm({...growthForm, measurement_type: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="weight">Weight (kg)</SelectItem>
                  <SelectItem value="height">Height (cm)</SelectItem>
                  <SelectItem value="head_circumference">Head Circumference (cm)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Value ({growthForm.measurement_type === 'weight' ? 'kg' : 'cm'})</Label>
              <Input type="number" step="0.1" value={growthForm.value} onChange={e => setGrowthForm({...growthForm, value: parseFloat(e.target.value)})} />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={growthForm.date} onChange={e => setGrowthForm({...growthForm, date: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGrowthDialog(false)}>Cancel</Button>
            <Button onClick={handleRecordGrowth} disabled={loading}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

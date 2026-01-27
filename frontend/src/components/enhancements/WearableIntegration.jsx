import React, { useState, useEffect } from 'react';
import { Watch, Heart, Footprints, Moon, Flame, Activity, RefreshCw, Link2, Unlink, TrendingUp, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { toast } from 'sonner';

const WearableIntegration = () => {
  const [connected, setConnected] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);

  const devices = [
    { id: 'apple-watch', name: 'Apple Watch', icon: '⌚', supported: true },
    { id: 'fitbit', name: 'Fitbit', icon: '📿', supported: true },
    { id: 'samsung', name: 'Samsung Galaxy Watch', icon: '⌚', supported: true },
    { id: 'garmin', name: 'Garmin', icon: '🏃', supported: true },
    { id: 'mi-band', name: 'Mi Band', icon: '📿', supported: true }
  ];

  useEffect(() => {
    // Check if device is connected
    const savedDevice = localStorage.getItem('connectedWearable');
    if (savedDevice) {
      setSelectedDevice(savedDevice);
      setConnected(true);
      fetchHealthData();
    }
  }, []);

  const connectDevice = async (deviceId) => {
    setSyncing(true);
    toast.info('Connecting to device...');
    
    // Simulate connection process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setSelectedDevice(deviceId);
    setConnected(true);
    localStorage.setItem('connectedWearable', deviceId);
    toast.success('Device connected successfully!');
    fetchHealthData();
    setSyncing(false);
  };

  const disconnectDevice = () => {
    setConnected(false);
    setSelectedDevice(null);
    setHealthData(null);
    localStorage.removeItem('connectedWearable');
    toast.success('Device disconnected');
  };

  const fetchHealthData = async () => {
    setSyncing(true);
    // Mock health data from wearable
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setHealthData({
      steps: { value: 8547, goal: 10000, unit: 'steps' },
      heart_rate: { value: 72, min: 58, max: 142, unit: 'bpm' },
      calories: { value: 1850, goal: 2200, unit: 'kcal' },
      sleep: { value: 7.2, goal: 8, unit: 'hours', quality: 'Good' },
      active_minutes: { value: 45, goal: 60, unit: 'min' },
      blood_oxygen: { value: 98, unit: '%' },
      weekly_trends: {
        steps: [6500, 8200, 7800, 9100, 8547, 0, 0],
        sleep: [6.5, 7.0, 6.8, 7.5, 7.2, 0, 0]
      }
    });
    
    setLastSync(new Date());
    setSyncing(false);
  };

  const syncNow = async () => {
    setSyncing(true);
    toast.info('Syncing health data...');
    await fetchHealthData();
    toast.success('Data synced successfully!');
  };

  const getProgressColor = (current, goal) => {
    const percentage = (current / goal) * 100;
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 70) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-4" data-testid="wearable-integration">
      {/* Header */}
      <Card className="bg-gradient-to-r from-pink-500 to-rose-500 text-white">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Watch className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Wearable Devices</h2>
                <p className="text-pink-100 text-sm">Sync your health data</p>
              </div>
            </div>
            {connected && (
              <Badge className="bg-white/20">
                <Activity className="w-3 h-3 mr-1" /> Connected
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {!connected ? (
        /* Device Selection */
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Connect Your Device</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {devices.map(device => (
              <div
                key={device.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => !syncing && connectDevice(device.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{device.icon}</span>
                  <div>
                    <p className="font-medium">{device.name}</p>
                    <p className="text-xs text-gray-500">
                      {device.supported ? 'Supported' : 'Coming soon'}
                    </p>
                  </div>
                </div>
                <Button size="sm" disabled={!device.supported || syncing}>
                  {syncing && selectedDevice === device.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <><Link2 className="w-4 h-4 mr-1" /> Connect</>
                  )}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        /* Connected Device View */
        <>
          {/* Connected Device Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">
                    {devices.find(d => d.id === selectedDevice)?.icon}
                  </span>
                  <div>
                    <p className="font-semibold">
                      {devices.find(d => d.id === selectedDevice)?.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Last synced: {lastSync ? lastSync.toLocaleTimeString() : 'Never'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={syncNow} disabled={syncing}>
                    {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  </Button>
                  <Button variant="outline" size="sm" onClick={disconnectDevice}>
                    <Unlink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {healthData && (
            <>
              {/* Today's Stats */}
              <div className="grid grid-cols-2 gap-3">
                {/* Steps */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Footprints className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-gray-500">Steps</span>
                    </div>
                    <p className="text-2xl font-bold">{healthData.steps.value.toLocaleString()}</p>
                    <Progress 
                      value={(healthData.steps.value / healthData.steps.goal) * 100} 
                      className="h-2 mt-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">Goal: {healthData.steps.goal.toLocaleString()}</p>
                  </CardContent>
                </Card>

                {/* Heart Rate */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-gray-500">Heart Rate</span>
                    </div>
                    <p className="text-2xl font-bold">{healthData.heart_rate.value} <span className="text-sm font-normal">bpm</span></p>
                    <p className="text-xs text-gray-500 mt-2">
                      Range: {healthData.heart_rate.min}-{healthData.heart_rate.max} bpm
                    </p>
                  </CardContent>
                </Card>

                {/* Calories */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Flame className="w-4 h-4 text-orange-500" />
                      <span className="text-sm text-gray-500">Calories</span>
                    </div>
                    <p className="text-2xl font-bold">{healthData.calories.value}</p>
                    <Progress 
                      value={(healthData.calories.value / healthData.calories.goal) * 100} 
                      className="h-2 mt-2"
                    />
                    <p className="text-xs text-gray-500 mt-1">Goal: {healthData.calories.goal} kcal</p>
                  </CardContent>
                </Card>

                {/* Sleep */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Moon className="w-4 h-4 text-indigo-500" />
                      <span className="text-sm text-gray-500">Sleep</span>
                    </div>
                    <p className="text-2xl font-bold">{healthData.sleep.value}h</p>
                    <Badge variant="outline" className="mt-2 text-xs">
                      {healthData.sleep.quality} Quality
                    </Badge>
                  </CardContent>
                </Card>
              </div>

              {/* Blood Oxygen */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                        <Activity className="w-5 h-5 text-cyan-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Blood Oxygen (SpO2)</p>
                        <p className="text-xl font-bold">{healthData.blood_oxygen.value}%</p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-700">Normal</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Weekly Trend */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Weekly Steps Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end justify-between h-24 gap-1">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
                      const steps = healthData.weekly_trends.steps[idx];
                      const height = steps > 0 ? (steps / 10000) * 100 : 5;
                      return (
                        <div key={day} className="flex-1 flex flex-col items-center">
                          <div 
                            className={`w-full rounded-t ${steps > 0 ? 'bg-blue-500' : 'bg-gray-200'}`}
                            style={{ height: `${height}%` }}
                          />
                          <span className="text-xs text-gray-500 mt-1">{day}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default WearableIntegration;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import {
  ArrowLeft, Watch, Footprints, HeartPulse, Moon, Flame,
  MapPin, Scale, Loader2, Plus, Link2, Unlink,
  ChevronRight, TrendingUp, Target, Wifi
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';

const API = process.env.REACT_APP_BACKEND_URL;

const DATA_ICONS = {
  steps: Footprints, heart_rate: HeartPulse, sleep: Moon,
  calories: Flame, distance: MapPin, weight: Scale,
};
const DATA_COLORS = {
  steps: '#10B981', heart_rate: '#EF4444', sleep: '#8B5CF6',
  calories: '#F97316', distance: '#3B82F6', weight: '#06B6D4',
};

const WearablesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [weekData, setWeekData] = useState(null);
  const [connection, setConnection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showManual, setShowManual] = useState(false);
  const [manualType, setManualType] = useState('steps');
  const [manualValue, setManualValue] = useState('');
  const [syncing, setSyncing] = useState(false);
  const phone = user?.phone || '';

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [summaryRes, weekRes, connRes] = await Promise.all([
        phone ? axios.get(`${API}/api/wearables/summary/${phone}`) : Promise.resolve({ data: {} }),
        phone ? axios.get(`${API}/api/wearables/data/${phone}?days=7`) : Promise.resolve({ data: {} }),
        phone ? axios.get(`${API}/api/wearables/connection/${phone}`) : Promise.resolve({ data: {} }),
      ]);
      setSummary(summaryRes.data);
      setWeekData(weekRes.data);
      setConnection(connRes.data);
    } catch {}
    setLoading(false);
  };

  const connectGoogleFit = async () => {
    try {
      const res = await axios.get(`${API}/api/wearables/google-fit/auth-url`);
      window.open(res.data.auth_url, '_blank');
      toast.info('Complete Google Fit authorization in the new tab');
    } catch (err) {
      toast.error('Google Fit connection not available yet');
    }
  };

  const syncManualData = async () => {
    if (!manualValue || !phone) return;
    setSyncing(true);
    try {
      const dataInfo = summary?.data_types?.[manualType] || {};
      await axios.post(`${API}/api/wearables/sync`, {
        phone, source: 'manual', data_type: manualType,
        value: parseFloat(manualValue),
        unit: dataInfo.unit || 'units',
      });
      toast.success(`${dataInfo.name || manualType} logged!`);
      setManualValue('');
      setShowManual(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Sync failed');
    }
    setSyncing(false);
  };

  const dataTypes = summary?.data_types || {};
  const todayData = summary?.today || {};

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0A0A12' }} data-testid="wearables-page">
      <header className="sticky top-0 z-50 px-4 py-3" style={{ background: 'rgba(10,10,18,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <div>
            <h1 className="font-bold text-base text-white flex items-center gap-1.5">
              <Watch className="w-4 h-4 text-cyan-400" /> Smart Wearables
            </h1>
            <p className="text-[11px] text-gray-500">Fitness & health data sync</p>
          </div>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Connection Status */}
        <div className="rounded-xl p-4 flex items-center gap-3" style={{
          background: connection?.connected ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${connection?.connected ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`,
        }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: connection?.connected ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)' }}>
            {connection?.connected ? <Wifi className="w-5 h-5 text-emerald-400" /> : <Unlink className="w-5 h-5 text-gray-500" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white">
              {connection?.connected ? `Connected to ${connection.source || 'Google Fit'}` : 'No wearable connected'}
            </p>
            <p className="text-[10px] text-gray-500">
              {connection?.connected ? `Since ${new Date(connection.connected_at).toLocaleDateString()}` : 'Connect to sync automatically'}
            </p>
          </div>
          <Button onClick={connectGoogleFit} size="sm"
            className={`text-xs h-8 ${connection?.connected ? 'bg-white/5 text-gray-300' : 'bg-emerald-600 text-white'}`}
            data-testid="connect-btn">
            <Link2 className="w-3 h-3 mr-1" /> {connection?.connected ? 'Reconnect' : 'Connect'}
          </Button>
        </div>

        {/* Today's Data */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Today</h3>
            <button onClick={() => setShowManual(!showManual)} className="text-xs text-cyan-400 flex items-center gap-1" data-testid="manual-entry-btn">
              <Plus className="w-3 h-3" /> Log manually
            </button>
          </div>

          {showManual && (
            <div className="rounded-xl p-3 space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <select value={manualType} onChange={e => setManualType(e.target.value)}
                className="w-full h-9 rounded-md bg-white/5 border border-white/10 text-white px-3 text-sm">
                {Object.entries(dataTypes).map(([key, info]) => (
                  <option key={key} value={key} className="bg-gray-900">{info.name} ({info.unit})</option>
                ))}
              </select>
              <div className="flex gap-2">
                <Input value={manualValue} onChange={e => setManualValue(e.target.value)}
                  placeholder={`Enter value (${dataTypes[manualType]?.unit || 'units'})`}
                  className="flex-1 h-9 bg-white/5 border-white/10 text-white placeholder:text-gray-500 text-sm" data-testid="manual-value-input" />
                <Button onClick={syncManualData} disabled={syncing || !manualValue} className="h-9 px-3 bg-cyan-600 text-xs"
                  data-testid="sync-manual-btn">
                  {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {Object.entries(dataTypes).map(([key, info]) => {
              const Icon = DATA_ICONS[key] || Watch;
              const color = DATA_COLORS[key] || '#8B5CF6';
              const today = todayData[key];
              const progress = today?.progress || 0;
              return (
                <div key={key} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  data-testid={`metric-${key}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4" style={{ color }} />
                    <span className="text-[10px] text-gray-400">{info.name}</span>
                  </div>
                  <p className="text-lg font-bold text-white">{today?.value?.toLocaleString() || '--'}</p>
                  <p className="text-[10px] text-gray-500">{info.unit} {info.daily_goal ? `/ ${info.daily_goal.toLocaleString()} goal` : ''}</p>
                  {info.daily_goal && (
                    <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%`, background: color }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Weekly Trend */}
        {weekData?.data && Object.keys(weekData.data).length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> 7-Day Trends
            </h3>
            {Object.entries(weekData.data).map(([key, typeData]) => {
              const Icon = DATA_ICONS[key] || Watch;
              const color = DATA_COLORS[key] || '#8B5CF6';
              const entries = typeData.entries || [];
              const maxVal = Math.max(...entries.map(e => e.value), 1);
              return (
                <div key={key} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4" style={{ color }} />
                    <span className="text-xs text-white font-medium">{typeData.info?.name || key}</span>
                  </div>
                  <div className="flex items-end gap-1 h-12">
                    {entries.slice(-7).reverse().map((e, i) => (
                      <div key={i} className="flex-1 rounded-t" style={{ height: `${(e.value / maxVal) * 100}%`, background: `${color}40`, minHeight: '4px' }} title={`${e.date}: ${e.value}`} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default WearablesPage;

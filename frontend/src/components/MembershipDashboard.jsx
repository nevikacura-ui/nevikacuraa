import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Crown, Star, Sparkles, Gift, Shield, TrendingUp, 
  Package, TestTube, Calendar, ChevronRight, Loader2,
  Pill, Heart, Home, Clock, Check, X, RefreshCw
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

/**
 * Membership Benefits Dashboard
 * Shows active discounts, usage stats, and portal access for Nevika Cura ONE members
 */
const MembershipDashboard = ({ email, onClose }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    if (email) {
      fetchDashboard();
    }
  }, [email]);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/subscriptions/membership/dashboard/${encodeURIComponent(email)}`);
      const data = await res.json();
      setDashboard(data);
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
      setError('Failed to load membership details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-500" />
        <p className="text-slate-500 mt-2">Loading membership details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <X className="w-12 h-12 mx-auto text-red-400 mb-2" />
        <p className="text-red-500">{error}</p>
        <Button onClick={fetchDashboard} variant="outline" className="mt-4">
          <RefreshCw className="w-4 h-4 mr-2" /> Try Again
        </Button>
      </div>
    );
  }

  if (!dashboard?.has_membership) {
    return (
      <div className="p-8 text-center">
        <Crown className="w-16 h-16 mx-auto text-amber-400 mb-4" />
        <h3 className="text-xl font-bold text-slate-800 mb-2">No Active Membership</h3>
        <p className="text-slate-500 mb-4">Get Nevika Cura ONE for complete healthcare access</p>
        <Button 
          onClick={() => navigate('/one')}
          className="bg-gradient-to-r from-amber-500 to-orange-500 text-white"
        >
          <Crown className="w-4 h-4 mr-2" /> Get Membership
        </Button>
      </div>
    );
  }

  if (dashboard.status === 'expired') {
    return (
      <div className="p-8 text-center">
        <Clock className="w-16 h-16 mx-auto text-orange-400 mb-4" />
        <h3 className="text-xl font-bold text-slate-800 mb-2">Membership Expired</h3>
        <p className="text-slate-500 mb-4">Your membership expired on {new Date(dashboard.expired_on).toLocaleDateString()}</p>
        <Button 
          onClick={() => navigate('/one')}
          className="bg-gradient-to-r from-amber-500 to-orange-500 text-white"
        >
          <RefreshCw className="w-4 h-4 mr-2" /> Renew Membership
        </Button>
      </div>
    );
  }

  const { membership, days_remaining, usage_stats, active_discounts, all_portals, visited_portals } = dashboard;

  // Calculate progress for membership period
  const totalDays = membership.billing_cycle === 'yearly' ? 365 : 
                    membership.billing_cycle === 'quarterly' ? 180 : 30;
  const daysUsed = totalDays - days_remaining;
  const progressPercent = Math.round((daysUsed / totalDays) * 100);

  return (
    <div className="space-y-4 pb-4">
      {/* Membership Status Card */}
      <Card className="bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white border-0 overflow-hidden">
        <CardContent className="p-5 relative">
          {/* Background pattern */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIwOS0xLjc5MS00LTQtNHMtNCAxLjc5MS00IDQgMS43OTEgNCA0IDQgNC0xLjc5MSA0LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
          
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                <Crown className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  {membership.plan_name}
                </h2>
                <p className="text-white/80 text-sm">
                  {membership.billing_cycle === 'yearly' ? 'Annual' : 
                   membership.billing_cycle === 'quarterly' ? 'Half-Yearly' : 'Monthly'} Plan
                </p>
              </div>
              <div className="ml-auto text-right">
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                  Active
                </span>
              </div>
            </div>

            {/* Days Remaining */}
            <div className="bg-white/10 rounded-xl p-3 backdrop-blur">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white/80 text-sm">Membership Period</span>
                <span className="font-bold">{days_remaining} days left</span>
              </div>
              <Progress value={100 - progressPercent} className="h-2 bg-white/20" />
              <div className="flex justify-between text-xs text-white/60 mt-1">
                <span>{new Date(membership.start_date).toLocaleDateString()}</span>
                <span>{new Date(membership.end_date).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Stats */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            Your Usage Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-orange-50 rounded-xl p-3 text-center">
              <Package className="w-6 h-6 text-orange-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-orange-600">{usage_stats.pharmacy_orders}</p>
              <p className="text-xs text-orange-600/70">Pharmacy Orders</p>
            </div>
            <div className="bg-cyan-50 rounded-xl p-3 text-center">
              <TestTube className="w-6 h-6 text-cyan-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-cyan-600">{usage_stats.lab_bookings}</p>
              <p className="text-xs text-cyan-600/70">Lab Tests</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <Calendar className="w-6 h-6 text-purple-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-purple-600">{usage_stats.appointments}</p>
              <p className="text-xs text-purple-600/70">Appointments</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <Star className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-emerald-600">{usage_stats.portals_visited}</p>
              <p className="text-xs text-emerald-600/70">Portals Visited</p>
            </div>
          </div>

          {/* Estimated Savings */}
          {usage_stats.estimated_savings > 0 && (
            <div className="mt-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <Gift className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-green-700">Estimated Savings</p>
                    <p className="text-2xl font-bold text-green-600">₹{usage_stats.estimated_savings.toLocaleString()}</p>
                  </div>
                </div>
                <Sparkles className="w-8 h-8 text-green-400" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Discounts */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Gift className="w-5 h-5 text-purple-500" />
            Active Discounts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {active_discounts.map((discount, idx) => (
            <div 
              key={idx} 
              className={`flex items-center justify-between p-3 rounded-xl bg-${discount.color}-50 border border-${discount.color}-100`}
              style={{
                backgroundColor: discount.color === 'orange' ? '#fff7ed' :
                               discount.color === 'cyan' ? '#ecfeff' :
                               discount.color === 'green' ? '#f0fdf4' :
                               discount.color === 'purple' ? '#faf5ff' : '#f8fafc'
              }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    backgroundColor: discount.color === 'orange' ? '#f97316' :
                                   discount.color === 'cyan' ? '#06b6d4' :
                                   discount.color === 'green' ? '#22c55e' :
                                   discount.color === 'purple' ? '#a855f7' : '#64748b'
                  }}
                >
                  {discount.color === 'orange' && <Pill className="w-5 h-5 text-white" />}
                  {discount.color === 'cyan' && <TestTube className="w-5 h-5 text-white" />}
                  {discount.color === 'green' && <Home className="w-5 h-5 text-white" />}
                  {discount.color === 'purple' && <Calendar className="w-5 h-5 text-white" />}
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{discount.service}</p>
                  <p className="text-xs text-slate-500">{discount.description}</p>
                </div>
              </div>
              <span 
                className="px-3 py-1 rounded-full text-sm font-bold"
                style={{
                  backgroundColor: discount.color === 'orange' ? '#fed7aa' :
                                 discount.color === 'cyan' ? '#a5f3fc' :
                                 discount.color === 'green' ? '#bbf7d0' :
                                 discount.color === 'purple' ? '#e9d5ff' : '#e2e8f0',
                  color: discount.color === 'orange' ? '#c2410c' :
                        discount.color === 'cyan' ? '#0e7490' :
                        discount.color === 'green' ? '#166534' :
                        discount.color === 'purple' ? '#7e22ce' : '#475569'
                }}
              >
                {discount.discount}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Portal Access */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" />
            Portal Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {all_portals.map((portal, idx) => {
              const isVisited = visited_portals?.includes(portal.name.toLowerCase());
              return (
                <div 
                  key={idx}
                  className={`p-2 rounded-xl text-center transition-all cursor-pointer hover:scale-105 ${
                    isVisited 
                      ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300' 
                      : 'bg-slate-50 border border-slate-100'
                  }`}
                  onClick={() => navigate(`/${portal.name.toLowerCase()}`)}
                >
                  <span className="text-xl">{portal.icon}</span>
                  <p className="font-semibold text-slate-800 text-xs mt-1">{portal.name}</p>
                  <p className="text-[10px] text-slate-500">{portal.category}</p>
                  {isVisited && (
                    <span className="inline-flex items-center justify-center w-4 h-4 bg-green-500 rounded-full mt-1">
                      <Check className="w-3 h-3 text-white" />
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-500 mt-3 text-center">
            Click any portal to explore • Highlighted portals have been visited
          </p>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button 
          onClick={() => navigate('/one')}
          variant="outline"
          className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50"
        >
          View Plans
        </Button>
        <Button 
          onClick={onClose}
          className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white"
        >
          Close
        </Button>
      </div>
    </div>
  );
};

export default MembershipDashboard;

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Star, Gift, Crown, TrendingUp, ChevronRight,
  Loader2, Award, Sparkles, Clock, ShoppingBag
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

// Tier colors and icons
const TIER_CONFIG = {
  bronze: { color: '#CD7F32', bgColor: '#FEF3E2', icon: Star, gradient: 'from-amber-600 to-orange-500' },
  silver: { color: '#C0C0C0', bgColor: '#F8FAFC', icon: Award, gradient: 'from-slate-400 to-slate-500' },
  gold: { color: '#FFD700', bgColor: '#FFFBEB', icon: Crown, gradient: 'from-yellow-400 to-amber-500' },
  platinum: { color: '#E5E4E2', bgColor: '#F5F5F5', icon: Sparkles, gradient: 'from-slate-300 to-purple-400' }
};

export const LoyaltyCard = ({ compact = false }) => {
  const [loyalty, setLoyalty] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLoyaltyDetails();
  }, []);

  const fetchLoyaltyDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      const res = await axios.get(`${API}/user/loyalty`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLoyalty(res.data);
    } catch (error) {
      console.warn('Failed to fetch loyalty details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-4 animate-pulse">
        <div className="h-20 bg-gray-200 rounded-lg"></div>
      </Card>
    );
  }

  if (!loyalty) {
    return null;
  }

  const tierConfig = TIER_CONFIG[loyalty.tier?.name || 'bronze'];
  const TierIcon = tierConfig.icon;
  const progressToNext = loyalty.next_tier 
    ? Math.min(100, ((loyalty.lifetime_points - TIER_CONFIG[loyalty.tier.name]?.minPoints || 0) / (loyalty.points_to_next_tier + 1)) * 100)
    : 100;

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${tierConfig.gradient} flex items-center justify-center`}>
          <TierIcon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-800 capitalize">{loyalty.tier?.name} Member</p>
          <p className="text-lg font-bold text-amber-600">{loyalty.current_points} pts</p>
        </div>
        <Gift className="w-5 h-5 text-amber-500" />
      </div>
    );
  }

  return (
    <Card className="overflow-hidden" data-testid="loyalty-card">
      {/* Header with tier */}
      <div className={`p-6 bg-gradient-to-br ${tierConfig.gradient} text-white`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
              <TierIcon className="w-8 h-8" />
            </div>
            <div>
              <p className="text-white/80 text-sm">Your Tier</p>
              <h2 className="text-2xl font-bold capitalize">{loyalty.tier?.name}</h2>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white/80 text-sm">Available Points</p>
            <p className="text-3xl font-bold">{loyalty.current_points}</p>
          </div>
        </div>
        
        {/* Progress to next tier */}
        {loyalty.next_tier && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-white/90 mb-2">
              <span>{loyalty.tier?.name}</span>
              <span>{loyalty.next_tier.name}</span>
            </div>
            <Progress value={progressToNext} className="h-2 bg-white/30" />
            <p className="text-center text-xs mt-2 text-white/80">
              {loyalty.points_to_next_tier} more points to {loyalty.next_tier.name}
            </p>
          </div>
        )}
      </div>

      {/* Benefits */}
      <div className="p-4 bg-white">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Gift className="w-4 h-4 text-amber-500" />
          Your Benefits
        </h3>
        <ul className="space-y-2">
          {loyalty.tier?.benefits?.map((benefit, idx) => (
            <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              {benefit}
            </li>
          ))}
        </ul>

        {/* Earning & Redemption Info */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-xs text-green-600 font-medium">Earn Rate</p>
            <p className="text-sm font-semibold text-green-700">{loyalty.earning_rate}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-600 font-medium">Redeem Rate</p>
            <p className="text-sm font-semibold text-blue-700">{loyalty.redemption_rate}</p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export const LoyaltyHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [skip, setSkip] = useState(0);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async (loadMore = false) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const currentSkip = loadMore ? skip : 0;
      const res = await axios.get(`${API}/user/loyalty/history`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 20, skip: currentSkip }
      });
      
      if (loadMore) {
        setTransactions(prev => [...prev, ...res.data.transactions]);
      } else {
        setTransactions(res.data.transactions);
      }
      setHasMore(res.data.total > currentSkip + 20);
      setSkip(currentSkip + 20);
    } catch (error) {
      console.warn('Failed to fetch loyalty history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4" data-testid="loyalty-history">
      <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4 text-gray-500" />
        Points History
      </h3>
      
      {transactions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No transactions yet</p>
          <p className="text-sm">Start shopping to earn points!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((txn, idx) => (
            <div
              key={txn.id || idx}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  txn.type === 'earned' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {txn.type === 'earned' ? (
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  ) : (
                    <Gift className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-800 text-sm">
                    {txn.description || (txn.type === 'earned' ? 'Points Earned' : 'Points Redeemed')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(txn.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              <span className={`font-bold ${
                txn.type === 'earned' ? 'text-green-600' : 'text-red-600'
              }`}>
                {txn.type === 'earned' ? '+' : '-'}{txn.points} pts
              </span>
            </div>
          ))}
          
          {hasMore && (
            <Button
              variant="ghost"
              onClick={() => fetchHistory(true)}
              className="w-full mt-2"
            >
              Load More
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};

// Points preview for checkout
export const PointsPreview = ({ orderAmount, className = '' }) => {
  const [tier, setTier] = useState(null);

  useEffect(() => {
    fetchTier();
  }, []);

  const fetchTier = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await axios.get(`${API}/user/loyalty`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTier(res.data.tier);
    } catch {
      // Ignore for non-logged users
    }
  };

  const multiplier = tier?.multiplier || 1.0;
  const basePoints = Math.floor(orderAmount / 10);
  const earnedPoints = Math.floor(basePoints * multiplier);

  if (earnedPoints <= 0) return null;

  return (
    <div className={`flex items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200 ${className}`}>
      <Star className="w-4 h-4 text-amber-500" />
      <span className="text-sm text-amber-700">
        Earn <strong>{earnedPoints}</strong> points on this order
        {multiplier > 1 && <span className="text-xs ml-1">({multiplier}x bonus!)</span>}
      </span>
    </div>
  );
};

export default LoyaltyCard;

import React, { useState, useEffect } from 'react';
import { Star, Gift, Trophy, TrendingUp, Coins, ShoppingBag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';

const API = process.env.REACT_APP_BACKEND_URL;

// Loyalty Points System (#11)
const LoyaltyPoints = () => {
  const [loyaltyData, setLoyaltyData] = useState({
    points: 0,
    tier: 'Bronze',
    pointsToNextTier: 500,
    history: [],
    rewards: []
  });
  const [loading, setLoading] = useState(true);

  const tiers = [
    { name: 'Bronze', min: 0, max: 500, color: 'bg-amber-600', benefits: ['5% pharmacy discount'] },
    { name: 'Silver', min: 500, max: 2000, color: 'bg-gray-400', benefits: ['10% pharmacy discount', 'Priority booking'] },
    { name: 'Gold', min: 2000, max: 5000, color: 'bg-yellow-500', benefits: ['15% pharmacy discount', 'Priority booking', 'Free health checkup'] },
    { name: 'Platinum', min: 5000, max: Infinity, color: 'bg-purple-600', benefits: ['20% pharmacy discount', 'VIP services', 'Free consultations'] },
  ];

  useEffect(() => {
    fetchLoyaltyData();
  }, []);

  const fetchLoyaltyData = async () => {
    try {
      const token = localStorage.getItem('patientToken') || localStorage.getItem('token');
      const res = await fetch(`${API}/api/loyalty`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLoyaltyData(data);
      }
    } catch (error) {
      console.error('Failed to fetch loyalty data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentTier = () => {
    return tiers.find(t => loyaltyData.points >= t.min && loyaltyData.points < t.max) || tiers[0];
  };

  const getNextTier = () => {
    const currentIndex = tiers.findIndex(t => t.name === getCurrentTier().name);
    return tiers[currentIndex + 1] || null;
  };

  const currentTier = getCurrentTier();
  const nextTier = getNextTier();
  const progressToNext = nextTier 
    ? ((loyaltyData.points - currentTier.min) / (nextTier.min - currentTier.min)) * 100
    : 100;

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-40 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4" data-testid="loyalty-points">
      {/* Points Card */}
      <Card className="overflow-hidden bg-gradient-to-br from-teal-600 to-cyan-600 text-white">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-teal-100 text-sm">Your Points</p>
              <div className="flex items-center gap-2">
                <Coins className="w-8 h-8" />
                <span className="text-4xl font-bold">{loyaltyData.points.toLocaleString()}</span>
              </div>
            </div>
            <div className={`${currentTier.color} px-4 py-2 rounded-full`}>
              <Trophy className="w-5 h-5 inline mr-1" />
              {currentTier.name}
            </div>
          </div>

          {nextTier && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{currentTier.name}</span>
                <span>{nextTier.name}</span>
              </div>
              <Progress value={progressToNext} className="h-2 bg-white/30" />
              <p className="text-xs text-teal-100">
                {nextTier.min - loyaltyData.points} points to {nextTier.name}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Benefits */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Gift className="w-5 h-5 text-teal-600" />
            Your {currentTier.name} Benefits
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {currentTier.benefits.map((benefit, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 bg-teal-50 rounded-lg">
              <Star className="w-4 h-4 text-teal-600" />
              <span className="text-sm">{benefit}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Earn More Points */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Earn More Points
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-teal-600">+100</p>
              <p className="text-xs text-gray-500">Per appointment</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-teal-600">+50</p>
              <p className="text-xs text-gray-500">Pharmacy purchase (₹500+)</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-teal-600">+200</p>
              <p className="text-xs text-gray-500">Refer a friend</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-teal-600">+25</p>
              <p className="text-xs text-gray-500">Health checkup</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Redeem Button */}
      <Button className="w-full bg-teal-600 hover:bg-teal-700" size="lg">
        <ShoppingBag className="w-5 h-5 mr-2" />
        Redeem Points at Pharmacy
      </Button>
    </div>
  );
};

export default LoyaltyPoints;

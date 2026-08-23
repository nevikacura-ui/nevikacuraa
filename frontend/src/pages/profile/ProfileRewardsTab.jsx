import React from 'react';
import { useProfile } from './ProfileContext';
import { Trophy } from 'lucide-react';
import { LoyaltyCard, LoyaltyHistory } from '@/components/LoyaltyPoints';

const ProfileRewardsTab = () => {
  const { loyaltyPoints } = useProfile();

  return (
    <div className="pb-24">
      <div className="mx-4 mt-4 bg-gradient-to-br from-orange-500/20 via-amber-500/10 to-yellow-500/20 rounded-2xl p-6 border border-orange-500/30">
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="w-8 h-8 text-orange-400" />
          <div>
            <p className="text-sm text-gray-300">Loyalty Points</p>
            <p className="text-3xl font-bold text-white">{loyaltyPoints}</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">Earn points on every order and redeem at checkout</p>
      </div>
      <LoyaltyCard points={loyaltyPoints} />
      <LoyaltyHistory />
    </div>
  );
};

export default ProfileRewardsTab;

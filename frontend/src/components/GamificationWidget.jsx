import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Flame, Trophy, Medal, Star, Gift, Share2, Users, 
  ChevronRight, Sparkles, Heart, Calendar, Pill, FlaskConical,
  Copy, CheckCircle2, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Badge definitions
const BADGES = [
  { id: 'first-visit', name: 'First Steps', description: 'Completed your first appointment', icon: Star, color: 'amber', requirement: 1 },
  { id: 'regular-5', name: 'Regular', description: 'Completed 5 health checkups', icon: Medal, color: 'blue', requirement: 5 },
  { id: 'health-champion', name: 'Health Champion', description: 'Completed 10 health checkups', icon: Trophy, color: 'purple', requirement: 10 },
  { id: 'streak-7', name: 'Week Warrior', description: '7-day health streak', icon: Flame, color: 'orange', requirement: 7 },
  { id: 'streak-30', name: 'Monthly Master', description: '30-day health streak', icon: Flame, color: 'red', requirement: 30 },
  { id: 'referral-1', name: 'Friend Maker', description: 'Referred your first friend', icon: Users, color: 'green', requirement: 1 },
  { id: 'referral-5', name: 'Community Builder', description: 'Referred 5 friends', icon: Users, color: 'teal', requirement: 5 },
];

const GamificationWidget = ({ className = '', compact = false }) => {
  const navigate = useNavigate();
  const [streak, setStreak] = useState(0);
  const [points, setPoints] = useState(0);
  const [earnedBadges, setEarnedBadges] = useState([]);
  const [referralCode, setReferralCode] = useState('');
  const [referralCount, setReferralCount] = useState(0);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadGamificationData();
  }, []);

  const loadGamificationData = () => {
    // Load from localStorage
    const savedStreak = parseInt(localStorage.getItem('healthStreak') || '0');
    const savedPoints = parseInt(localStorage.getItem('loyaltyPoints') || '0');
    const savedBadges = JSON.parse(localStorage.getItem('earnedBadges') || '[]');
    const savedReferrals = parseInt(localStorage.getItem('referralCount') || '0');
    
    // Generate referral code from user info
    const patientInfo = localStorage.getItem('patientInfo');
    if (patientInfo) {
      try {
        const info = JSON.parse(patientInfo);
        const code = `NC${(info.name || 'USER').substring(0, 3).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        setReferralCode(localStorage.getItem('referralCode') || code);
        localStorage.setItem('referralCode', localStorage.getItem('referralCode') || code);
      } catch (e) {
        setReferralCode('NCUSER' + Math.random().toString(36).substring(2, 6).toUpperCase());
      }
    }

    setStreak(savedStreak);
    setPoints(savedPoints);
    setEarnedBadges(savedBadges);
    setReferralCount(savedReferrals);

    // Check for new badges
    checkAndAwardBadges(savedStreak, savedReferrals);
  };

  const checkAndAwardBadges = (currentStreak, referrals) => {
    const newBadges = [...earnedBadges];
    let updated = false;

    // Check streak badges
    if (currentStreak >= 7 && !newBadges.includes('streak-7')) {
      newBadges.push('streak-7');
      updated = true;
    }
    if (currentStreak >= 30 && !newBadges.includes('streak-30')) {
      newBadges.push('streak-30');
      updated = true;
    }

    // Check referral badges
    if (referrals >= 1 && !newBadges.includes('referral-1')) {
      newBadges.push('referral-1');
      updated = true;
    }
    if (referrals >= 5 && !newBadges.includes('referral-5')) {
      newBadges.push('referral-5');
      updated = true;
    }

    if (updated) {
      setEarnedBadges(newBadges);
      localStorage.setItem('earnedBadges', JSON.stringify(newBadges));
    }
  };

  const incrementStreak = () => {
    const lastActivity = localStorage.getItem('lastActivityDate');
    const today = new Date().toDateString();
    
    if (lastActivity !== today) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      localStorage.setItem('healthStreak', newStreak.toString());
      localStorage.setItem('lastActivityDate', today);
      
      // Award points
      const newPoints = points + 10;
      setPoints(newPoints);
      localStorage.setItem('loyaltyPoints', newPoints.toString());
      
      toast.success(`🔥 ${newStreak} day streak! +10 points`);
      checkAndAwardBadges(newStreak, referralCount);
    }
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    toast.success('Referral code copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferral = () => {
    const shareText = `Join Nevika Cura for your health needs! Use my referral code ${referralCode} and get ₹100 off on your first order. Download now: https://nevikacura.com`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Join Nevika Cura',
        text: shareText,
        url: 'https://nevikacura.com'
      });
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success('Share link copied!');
    }
  };

  const getColorClass = (color) => {
    const colors = {
      amber: 'from-amber-400 to-amber-600',
      blue: 'from-blue-400 to-blue-600',
      purple: 'from-purple-400 to-purple-600',
      orange: 'from-orange-400 to-orange-600',
      red: 'from-red-400 to-red-600',
      green: 'from-green-400 to-green-600',
      teal: 'from-teal-400 to-teal-600',
    };
    return colors[color] || colors.amber;
  };

  if (compact) {
    // Compact version for homepage
    return (
      <div className={`${className}`} data-testid="gamification-compact">
        <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {/* Streak Card */}
          <div className="flex-shrink-0 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-4 text-white min-w-[140px]">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-5 h-5" />
              <span className="text-2xl font-bold">{streak}</span>
            </div>
            <p className="text-xs opacity-90">Day Streak</p>
          </div>

          {/* Points Card */}
          <div className="flex-shrink-0 bg-gradient-to-br from-purple-500 to-violet-500 rounded-2xl p-4 text-white min-w-[140px]">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5" />
              <span className="text-2xl font-bold">{points}</span>
            </div>
            <p className="text-xs opacity-90">Points</p>
          </div>

          {/* Referral Card */}
          <button
            onClick={() => setShowReferralModal(true)}
            className="flex-shrink-0 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-4 text-white min-w-[140px] text-left"
          >
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-5 h-5" />
              <span className="text-sm font-bold">₹100</span>
            </div>
            <p className="text-xs opacity-90">Refer & Earn</p>
          </button>
        </div>

        {/* Referral Modal */}
        {showReferralModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-800">Refer & Earn</h3>
                <button onClick={() => setShowReferralModal(false)} className="p-1 hover:bg-slate-100 rounded-full">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Gift className="w-8 h-8 text-white" />
                </div>
                <p className="text-slate-600 text-sm">Share your code & both you and your friend get</p>
                <p className="text-3xl font-bold text-green-600 mt-1">₹100 OFF</p>
              </div>

              {/* Referral Code */}
              <div className="bg-slate-100 rounded-xl p-4 mb-4">
                <p className="text-xs text-slate-500 mb-1">Your Referral Code</p>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-slate-800 tracking-wider">{referralCode}</span>
                  <button
                    onClick={copyReferralCode}
                    className="p-2 bg-white rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    {copied ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-slate-500" />}
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-4 mb-4 text-center">
                <div className="flex-1 bg-slate-50 rounded-xl p-3">
                  <p className="text-2xl font-bold text-slate-800">{referralCount}</p>
                  <p className="text-xs text-slate-500">Friends Joined</p>
                </div>
                <div className="flex-1 bg-slate-50 rounded-xl p-3">
                  <p className="text-2xl font-bold text-green-600">₹{referralCount * 100}</p>
                  <p className="text-xs text-slate-500">Earned</p>
                </div>
              </div>

              <Button
                onClick={shareReferral}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share with Friends
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full version for profile page
  return (
    <div className={`space-y-4 ${className}`} data-testid="gamification-full">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-4 text-white text-center">
          <Flame className="w-6 h-6 mx-auto mb-1" />
          <p className="text-2xl font-bold">{streak}</p>
          <p className="text-xs opacity-90">Day Streak</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-violet-500 rounded-2xl p-4 text-white text-center">
          <Star className="w-6 h-6 mx-auto mb-1" />
          <p className="text-2xl font-bold">{points}</p>
          <p className="text-xs opacity-90">Points</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-4 text-white text-center">
          <Trophy className="w-6 h-6 mx-auto mb-1" />
          <p className="text-2xl font-bold">{earnedBadges.length}</p>
          <p className="text-xs opacity-90">Badges</p>
        </div>
      </div>

      {/* Badges */}
      <div className="bg-white rounded-2xl p-4 border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Medal className="w-5 h-5 text-amber-500" />
          Your Badges
        </h3>
        <div className="grid grid-cols-4 gap-3">
          {BADGES.map(badge => {
            const earned = earnedBadges.includes(badge.id);
            return (
              <div
                key={badge.id}
                className={`flex flex-col items-center p-2 rounded-xl transition-all ${
                  earned ? 'bg-slate-50' : 'opacity-40 grayscale'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getColorClass(badge.color)} flex items-center justify-center mb-1`}>
                  <badge.icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-[10px] text-center text-slate-700 font-medium">{badge.name}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Referral Section */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-4 text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            <span className="font-semibold">Refer & Earn ₹100</span>
          </div>
          <span className="text-xs bg-white/20 px-2 py-1 rounded-full">{referralCount} referrals</span>
        </div>
        <div className="bg-white/20 rounded-xl p-3 flex items-center justify-between mb-3">
          <span className="font-mono font-bold tracking-wider">{referralCode}</span>
          <button onClick={copyReferralCode} className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30">
            {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <Button
          onClick={shareReferral}
          variant="secondary"
          className="w-full bg-white text-green-600 hover:bg-slate-100"
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share with Friends
        </Button>
      </div>
    </div>
  );
};

export default GamificationWidget;

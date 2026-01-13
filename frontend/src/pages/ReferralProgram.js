import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowLeft, Gift, Copy, Share2, Users, Trophy, Star, 
  Loader2, CheckCircle2, ChevronRight, Sparkles
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const ReferralProgram = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [referralData, setReferralData] = useState(null);
  const [referralHistory, setReferralHistory] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [applyCode, setApplyCode] = useState('');
  const [applyingCode, setApplyingCode] = useState(false);
  
  useEffect(() => {
    if (user?.id) {
      fetchReferralData();
    }
  }, [user]);
  
  const fetchReferralData = async () => {
    setLoading(true);
    try {
      const [codeRes, historyRes, leaderboardRes] = await Promise.all([
        axios.get(`${API}/referral/code/${user.id}`),
        axios.get(`${API}/referral/history/${user.id}`).catch(() => ({ data: { referrals: [] } })),
        axios.get(`${API}/referral/leaderboard?limit=10`).catch(() => ({ data: { leaderboard: [] } }))
      ]);
      
      setReferralData(codeRes.data);
      setReferralHistory(historyRes.data?.referrals || []);
      setLeaderboard(leaderboardRes.data?.leaderboard || []);
    } catch (error) {
      console.error('Error fetching referral data:', error);
    }
    setLoading(false);
  };
  
  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralData?.referral_code || '');
    toast.success('Referral code copied!');
  };
  
  const shareReferral = () => {
    const code = referralData?.referral_code;
    const message = `Join Nevika Cura for all your healthcare needs! Use my referral code ${code} to get ₹100 off on your first order. Download now: https://nevikacura.com`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Join Nevika Cura',
        text: message
      });
    } else {
      // Fallback to WhatsApp
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    }
  };
  
  const handleApplyCode = async () => {
    if (!applyCode.trim()) {
      toast.error('Please enter a referral code');
      return;
    }
    
    setApplyingCode(true);
    try {
      const response = await axios.post(`${API}/referral/apply?referee_id=${user.id}&referral_code=${applyCode}`);
      toast.success(response.data.message);
      setApplyCode('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid referral code');
    }
    setApplyingCode(false);
  };
  
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <Gift className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Login Required</h2>
          <p className="text-gray-500 mb-4">Please login to access the referral program</p>
          <Button onClick={() => navigate('/')}>Go to Home</Button>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)} data-testid="back-btn">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-bold text-xl text-gray-900">Refer & Earn</h1>
                <p className="text-sm text-gray-500">Invite friends, get rewards!</p>
              </div>
            </div>
            <Gift className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </header>
      
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : (
          <>
            {/* Hero Card */}
            <Card className="bg-gradient-to-r from-purple-600 to-pink-600 text-white overflow-hidden">
              <CardContent className="p-6 relative">
                <Sparkles className="absolute top-4 right-4 w-16 h-16 opacity-20" />
                <h2 className="text-2xl font-bold mb-2">Invite Friends, Earn Rewards!</h2>
                <p className="opacity-90 mb-4">
                  Share your referral code and both you and your friend get rewarded!
                </p>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-white/20 rounded-lg p-3">
                    <p className="text-sm opacity-80">You Get</p>
                    <p className="text-xl font-bold">{referralData?.config?.referrer_reward || 100} Points</p>
                    <p className="text-xs opacity-70">+ ₹{referralData?.config?.referrer_discount || 100} off</p>
                  </div>
                  <div className="bg-white/20 rounded-lg p-3">
                    <p className="text-sm opacity-80">Friend Gets</p>
                    <p className="text-xl font-bold">{referralData?.config?.referee_reward || 50} Points</p>
                    <p className="text-xs opacity-70">+ ₹{referralData?.config?.referee_discount || 100} off</p>
                  </div>
                </div>
                
                {/* Referral Code */}
                <div className="bg-white rounded-lg p-4 text-gray-900">
                  <p className="text-sm text-gray-500 mb-1">Your Referral Code</p>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-mono font-bold tracking-wider flex-1">
                      {referralData?.referral_code}
                    </span>
                    <Button variant="outline" size="icon" onClick={copyReferralCode}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button onClick={shareReferral}>
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <CheckCircle2 className="w-6 h-6 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{referralData?.stats?.successful_referrals || 0}</p>
                  <p className="text-xs text-gray-500">Successful</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{referralData?.stats?.pending_referrals || 0}</p>
                  <p className="text-xs text-gray-500">Pending</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Star className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold">{referralData?.stats?.total_rewards_earned || 0}</p>
                  <p className="text-xs text-gray-500">Points Earned</p>
                </CardContent>
              </Card>
            </div>
            
            {/* Apply Referral Code */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Have a Referral Code?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input 
                    value={applyCode}
                    onChange={(e) => setApplyCode(e.target.value.toUpperCase())}
                    placeholder="Enter referral code"
                    className="font-mono"
                  />
                  <Button onClick={handleApplyCode} disabled={applyingCode}>
                    {applyingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Referral History */}
            {referralHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Your Referrals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {referralHistory.map((ref, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <Users className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium">{ref.referee_name}</p>
                            <p className="text-xs text-gray-500">{ref.created_at?.slice(0, 10)}</p>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          ref.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {ref.status === 'completed' ? `+${referralData?.config?.referrer_reward} pts` : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Leaderboard */}
            {leaderboard.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Top Referrers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {leaderboard.map((entry, idx) => (
                      <div key={idx} className={`flex items-center justify-between p-3 rounded-lg ${
                        idx === 0 ? 'bg-yellow-50' : idx === 1 ? 'bg-gray-50' : idx === 2 ? 'bg-orange-50' : 'bg-gray-50'
                      }`}>
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                            idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                            idx === 1 ? 'bg-gray-300 text-gray-700' :
                            idx === 2 ? 'bg-orange-400 text-orange-900' :
                            'bg-gray-200 text-gray-600'
                          }`}>
                            {idx < 3 ? ['🥇', '🥈', '🥉'][idx] : idx + 1}
                          </span>
                          <span className="font-medium">{entry.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-purple-600">{entry.referrals}</p>
                          <p className="text-xs text-gray-500">referrals</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* How It Works */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">How It Works</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-purple-600">1</span>
                    </div>
                    <div>
                      <p className="font-medium">Share Your Code</p>
                      <p className="text-sm text-gray-500">Send your unique referral code to friends</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-purple-600">2</span>
                    </div>
                    <div>
                      <p className="font-medium">Friend Signs Up</p>
                      <p className="text-sm text-gray-500">They apply your code and get ₹{referralData?.config?.referee_discount || 100} off</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-purple-600">3</span>
                    </div>
                    <div>
                      <p className="font-medium">Both Get Rewarded</p>
                      <p className="text-sm text-gray-500">You earn {referralData?.config?.referrer_reward || 100} points when they place first order</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default ReferralProgram;

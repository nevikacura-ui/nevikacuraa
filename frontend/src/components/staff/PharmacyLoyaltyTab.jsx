import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Gift, Phone, User, Loader2, Plus 
} from 'lucide-react';

const PharmacyLoyaltyTab = ({ 
  loyaltyPhone,
  setLoyaltyPhone,
  loyaltyUser,
  loyaltyLoading,
  loyaltyPoints,
  setLoyaltyPoints,
  loyaltyReason,
  setLoyaltyReason,
  addingPoints,
  searchLoyaltyUser,
  handleAddLoyaltyPoints
}) => {
  return (
    <Card className="p-6" data-testid="pharmacy-loyalty-tab">
      <div className="mb-6">
        <h2 className="font-semibold text-lg flex items-center gap-2 mb-2">
          <Gift className="w-5 h-5 text-amber-500" />
          Add Loyalty Points
        </h2>
        <p className="text-sm text-gray-500">Award loyalty points to registered customers for their pharmacy purchases</p>
      </div>
      
      {/* Search User */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            value={loyaltyPhone}
            onChange={(e) => setLoyaltyPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="Enter customer phone number..."
            className="pl-10 h-12"
            data-testid="pharmacy-loyalty-phone"
            onKeyPress={(e) => e.key === 'Enter' && searchLoyaltyUser()}
          />
        </div>
        <Button 
          onClick={searchLoyaltyUser} 
          disabled={loyaltyLoading || loyaltyPhone.length < 10}
          className="h-12 bg-amber-500 hover:bg-amber-600"
          data-testid="pharmacy-loyalty-search"
        >
          {loyaltyLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <User className="w-4 h-4 mr-2" />}
          Find User
        </Button>
      </div>
      
      {/* User Result */}
      {loyaltyUser && (
        <div className={`p-6 rounded-xl border-2 ${loyaltyUser.found ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
          {loyaltyUser.found ? (
            <div className="space-y-4">
              {/* User Info */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <Gift className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">{loyaltyUser.user_name}</p>
                    <p className="text-gray-500">{loyaltyUser.phone}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-amber-600">{loyaltyUser.loyalty_points?.toLocaleString() || 0}</p>
                  <p className="text-sm text-gray-500">Current Points</p>
                </div>
              </div>
              
              {/* Add Points Form */}
              <div className="grid sm:grid-cols-3 gap-4 pt-4 border-t border-amber-200">
                <div>
                  <Label className="text-sm font-medium">Points to Add *</Label>
                  <Input
                    type="number"
                    value={loyaltyPoints}
                    onChange={(e) => setLoyaltyPoints(e.target.value)}
                    placeholder="1-500"
                    className="mt-1"
                    max={500}
                    min={1}
                    data-testid="pharmacy-loyalty-points"
                  />
                  <p className="text-xs text-gray-500 mt-1">Max 500 points per transaction</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Reason (Optional)</Label>
                  <Input
                    value={loyaltyReason}
                    onChange={(e) => setLoyaltyReason(e.target.value)}
                    placeholder="e.g., Order #12345"
                    className="mt-1"
                    data-testid="pharmacy-loyalty-reason"
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleAddLoyaltyPoints}
                    disabled={addingPoints || !loyaltyPoints}
                    className="w-full bg-amber-500 hover:bg-amber-600"
                    data-testid="pharmacy-loyalty-submit"
                  >
                    {addingPoints ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    Add Points
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-lg font-medium text-gray-600">User Not Registered</p>
              <p className="text-gray-500 text-sm mt-1">Phone: {loyaltyPhone}</p>
              <p className="text-sm text-gray-400 mt-3">Only registered users can earn loyalty points</p>
            </div>
          )}
        </div>
      )}
      
      {!loyaltyUser && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <Gift className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Search for a customer to add loyalty points</p>
          <p className="text-sm text-gray-400 mt-1">Enter their phone number above</p>
        </div>
      )}
    </Card>
  );
};

export default PharmacyLoyaltyTab;

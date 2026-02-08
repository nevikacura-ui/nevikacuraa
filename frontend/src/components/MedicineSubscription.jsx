import React, { useState } from 'react';
import { 
  RefreshCw, Calendar, Clock, CheckCircle2, X, Bell,
  Pill, ChevronRight, Edit2, Trash2, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Subscription frequencies
const FREQUENCIES = [
  { id: 'weekly', label: 'Weekly', days: 7, discount: 5 },
  { id: 'biweekly', label: 'Every 2 Weeks', days: 14, discount: 8 },
  { id: 'monthly', label: 'Monthly', days: 30, discount: 10 },
  { id: 'quarterly', label: 'Every 3 Months', days: 90, discount: 15 },
];

const MedicineSubscription = ({ isOpen, onClose, medicine, onSubscribe }) => {
  const [selectedFrequency, setSelectedFrequency] = useState('monthly');
  const [quantity, setQuantity] = useState(medicine?.quantity || 1);
  const [startDate, setStartDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);

  if (!isOpen || !medicine) return null;

  const selectedFreq = FREQUENCIES.find(f => f.id === selectedFrequency);
  const originalPrice = (medicine.price || 100) * quantity;
  const discountAmount = Math.round(originalPrice * (selectedFreq.discount / 100));
  const finalPrice = originalPrice - discountAmount;

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      // Save subscription to localStorage (or API in production)
      const subscriptions = JSON.parse(localStorage.getItem('medicineSubscriptions') || '[]');
      
      const newSubscription = {
        id: Date.now().toString(),
        medicine: medicine.name,
        quantity,
        frequency: selectedFrequency,
        frequencyLabel: selectedFreq.label,
        nextDelivery: startDate,
        price: finalPrice,
        originalPrice,
        discount: selectedFreq.discount,
        status: 'active',
        createdAt: new Date().toISOString()
      };
      
      subscriptions.push(newSubscription);
      localStorage.setItem('medicineSubscriptions', JSON.stringify(subscriptions));
      
      toast.success(`Subscription created! First delivery on ${new Date(startDate).toLocaleDateString()}`);
      
      if (onSubscribe) {
        onSubscribe(newSubscription);
      }
      
      onClose();
    } catch (error) {
      toast.error('Failed to create subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden animate-in slide-in-from-bottom">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Subscribe & Save</h2>
                <p className="text-emerald-100 text-sm">Auto-delivery for your medicines</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Medicine Info */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Pill className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-800">{medicine.name}</p>
              <p className="text-sm text-slate-500">₹{medicine.price || 100} per unit</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center hover:bg-slate-300"
              >
                -
              </button>
              <span className="w-8 text-center font-semibold">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center hover:bg-slate-300"
              >
                +
              </button>
            </div>
          </div>

          {/* Frequency Selection */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Delivery Frequency</label>
            <div className="grid grid-cols-2 gap-2">
              {FREQUENCIES.map(freq => (
                <button
                  key={freq.id}
                  onClick={() => setSelectedFrequency(freq.id)}
                  className={`p-3 rounded-xl border-2 transition-all text-left ${
                    selectedFrequency === freq.id
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className={`font-semibold ${selectedFrequency === freq.id ? 'text-emerald-700' : 'text-slate-700'}`}>
                    {freq.label}
                  </p>
                  <p className="text-xs text-emerald-600 font-medium">Save {freq.discount}%</p>
                </button>
              ))}
            </div>
          </div>

          {/* Start Date */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              First Delivery Date
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="h-12"
            />
          </div>

          {/* Price Breakdown */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Original Price</span>
              <span className="text-slate-700">₹{originalPrice}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-emerald-600">Subscription Discount ({selectedFreq.discount}%)</span>
              <span className="text-emerald-600">-₹{discountAmount}</span>
            </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span className="text-slate-800">You Pay</span>
              <span className="text-emerald-600">₹{finalPrice}</span>
            </div>
            <p className="text-xs text-slate-500 text-center mt-2">
              Cancel anytime • Free delivery • Auto-renewal
            </p>
          </div>

          {/* Subscribe Button */}
          <Button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full py-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-base font-semibold rounded-xl"
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Bell className="w-5 h-5 mr-2" />
                Subscribe for ₹{finalPrice}/{selectedFreq.label.toLowerCase()}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Subscription Management Component
export const SubscriptionManager = ({ className = '' }) => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [showManager, setShowManager] = useState(false);

  React.useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('medicineSubscriptions') || '[]');
    setSubscriptions(saved);
  }, []);

  const cancelSubscription = (id) => {
    const updated = subscriptions.filter(s => s.id !== id);
    setSubscriptions(updated);
    localStorage.setItem('medicineSubscriptions', JSON.stringify(updated));
    toast.success('Subscription cancelled');
  };

  if (subscriptions.length === 0) return null;

  return (
    <div className={`bg-emerald-50 border border-emerald-200 rounded-xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-emerald-600" />
          <span className="font-semibold text-emerald-800">Active Subscriptions</span>
        </div>
        <span className="text-xs bg-emerald-200 text-emerald-700 px-2 py-1 rounded-full">
          {subscriptions.length} active
        </span>
      </div>
      <div className="space-y-2">
        {subscriptions.slice(0, 2).map(sub => (
          <div key={sub.id} className="flex items-center justify-between p-2 bg-white rounded-lg">
            <div>
              <p className="font-medium text-slate-800 text-sm">{sub.medicine}</p>
              <p className="text-xs text-slate-500">{sub.frequencyLabel} • Next: {new Date(sub.nextDelivery).toLocaleDateString()}</p>
            </div>
            <button
              onClick={() => cancelSubscription(sub.id)}
              className="p-1 text-red-500 hover:bg-red-50 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MedicineSubscription;

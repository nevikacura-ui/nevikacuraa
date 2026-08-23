import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import {
  RefreshCw, Plus, X, Pill, Calendar, Pause, Play,
  Loader2, Trash2, Clock, CheckCircle2, AlertCircle
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const FREQUENCIES = [
  { id: 'weekly', label: 'Weekly', days: 7 },
  { id: 'biweekly', label: 'Every 2 Weeks', days: 14 },
  { id: 'monthly', label: 'Monthly', days: 30 },
  { id: 'quarterly', label: 'Every 3 Months', days: 90 }
];

/**
 * Subscription Refills Component
 * Auto-reorder medicines for chronic patients
 */
export const SubscriptionRefills = ({ isOpen, onClose }) => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const phone = localStorage.getItem('guestMobile') || localStorage.getItem('patientPhone');

  useEffect(() => {
    if (!isOpen || !phone) return;
    fetchSubscriptions();
  }, [isOpen, phone]);

  const fetchSubscriptions = async () => {
    try {
      const response = await axios.get(`${API}/subscriptions?phone=${phone}`);
      setSubscriptions(response.data.subscriptions || []);
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async (subscriptionId) => {
    setActionLoading(subscriptionId);
    try {
      await axios.put(`${API}/subscription/${subscriptionId}/pause?phone=${phone}`);
      toast.success('Subscription paused');
      fetchSubscriptions();
    } catch (error) {
      toast.error('Failed to pause subscription');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async (subscriptionId) => {
    setActionLoading(subscriptionId);
    try {
      await axios.put(`${API}/subscription/${subscriptionId}/resume?phone=${phone}`);
      toast.success('Subscription resumed');
      fetchSubscriptions();
    } catch (error) {
      toast.error('Failed to resume subscription');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (subscriptionId) => {
    if (!confirm('Are you sure you want to cancel this subscription?')) return;
    
    setActionLoading(subscriptionId);
    try {
      await axios.delete(`${API}/subscription/${subscriptionId}?phone=${phone}`);
      toast.success('Subscription cancelled');
      fetchSubscriptions();
    } catch (error) {
      toast.error('Failed to cancel subscription');
    } finally {
      setActionLoading(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg bg-[#0f0f0f] rounded-t-3xl max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="sticky top-0 bg-[#0f0f0f] border-b border-white/10 p-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Auto-Refills</h2>
                <p className="text-xs text-zinc-500">Never run out of medicines</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4 space-y-4" style={{ maxHeight: 'calc(85vh - 80px)' }}>
          {/* Info Banner */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <RefreshCw className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-purple-200 font-medium">How it works</p>
                <p className="text-xs text-purple-300/70 mt-1">
                  Set up auto-refills for your regular medicines. We'll remind you before each refill and you can skip, pause, or cancel anytime.
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin mb-3" />
              <p className="text-zinc-500 text-sm">Loading subscriptions...</p>
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-12">
              <Pill className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-400 font-medium">No active subscriptions</p>
              <p className="text-zinc-500 text-sm mt-1">
                Add medicines to your cart and enable auto-refill
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {subscriptions.map((sub) => (
                <SubscriptionCard
                  key={sub.subscription_id}
                  subscription={sub}
                  onPause={() => handlePause(sub.subscription_id)}
                  onResume={() => handleResume(sub.subscription_id)}
                  onCancel={() => handleCancel(sub.subscription_id)}
                  loading={actionLoading === sub.subscription_id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Subscription Card
 */
const SubscriptionCard = ({ subscription, onPause, onResume, onCancel, loading }) => {
  const frequency = FREQUENCIES.find(f => f.id === subscription.frequency) || FREQUENCIES[2];
  const nextOrderDate = subscription.next_order_date 
    ? new Date(subscription.next_order_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'Not set';
  
  const isPaused = subscription.status === 'paused';
  const isActive = subscription.status === 'active';

  return (
    <div className={`bg-zinc-900/80 border rounded-2xl p-4 transition-colors ${
      isPaused ? 'border-amber-500/30' : 'border-zinc-800 hover:border-purple-500/30'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isPaused ? 'bg-amber-500/20' : 'bg-purple-500/20'
          }`}>
            <Pill className={`w-6 h-6 ${isPaused ? 'text-amber-400' : 'text-purple-400'}`} />
          </div>
          <div>
            <p className="font-semibold text-white">{subscription.medicine_name}</p>
            <p className="text-xs text-zinc-400">Qty: {subscription.quantity} • {frequency.label}</p>
          </div>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
          isPaused ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'
        }`}>
          {isPaused ? 'Paused' : 'Active'}
        </div>
      </div>

      {/* Next Order */}
      <div className="flex items-center gap-2 mb-4 p-2 bg-zinc-800/50 rounded-lg">
        <Calendar className="w-4 h-4 text-zinc-400" />
        <span className="text-sm text-zinc-300">
          Next order: <span className="font-medium text-white">{nextOrderDate}</span>
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {isActive ? (
          <Button
            onClick={onPause}
            disabled={loading}
            variant="outline"
            size="sm"
            className="flex-1 border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Pause className="w-4 h-4 mr-1" /> Pause</>}
          </Button>
        ) : (
          <Button
            onClick={onResume}
            disabled={loading}
            size="sm"
            className="flex-1 bg-green-500 hover:bg-green-600 text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Play className="w-4 h-4 mr-1" /> Resume</>}
          </Button>
        )}
        <Button
          onClick={onCancel}
          disabled={loading}
          variant="outline"
          size="sm"
          className="border-red-500/50 text-red-400 hover:bg-red-500/10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800">
        <span className="text-xs text-zinc-500">
          Orders placed: {subscription.orders_placed || 0}
        </span>
        <span className="text-xs text-zinc-500">
          ID: {subscription.subscription_id}
        </span>
      </div>
    </div>
  );
};

/**
 * Add to Subscription Button
 * Use in cart or medicine detail
 */
export const AddToSubscriptionButton = ({ medicine, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [showFrequency, setShowFrequency] = useState(false);
  const [selectedFrequency, setSelectedFrequency] = useState('monthly');

  const phone = localStorage.getItem('guestMobile') || localStorage.getItem('patientPhone');

  const handleSubscribe = async () => {
    if (!phone) {
      toast.error('Please login to subscribe');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/subscription/create?phone=${phone}`, {
        medicine_id: medicine.id,
        medicine_name: medicine.name,
        quantity: medicine.quantity || 1,
        frequency: selectedFrequency
      });

      if (response.data.success) {
        toast.success('Auto-refill enabled!');
        setShowFrequency(false);
        onSuccess?.();
      }
    } catch (error) {
      toast.error('Failed to enable auto-refill');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      {!showFrequency ? (
        <button
          onClick={() => setShowFrequency(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-xs font-medium hover:bg-purple-500/30 transition-colors"
          data-testid="enable-auto-refill-btn"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Auto-refill
        </button>
      ) : (
        <div className="absolute bottom-full right-0 mb-2 p-3 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl min-w-[200px] z-10">
          <p className="text-xs text-zinc-400 mb-2">Select frequency:</p>
          <div className="space-y-1">
            {FREQUENCIES.map((freq) => (
              <button
                key={freq.id}
                onClick={() => setSelectedFrequency(freq.id)}
                className={`w-full px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                  selectedFrequency === freq.id
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                {freq.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              onClick={() => setShowFrequency(false)}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubscribe}
              disabled={loading}
              size="sm"
              className="flex-1 bg-purple-500 hover:bg-purple-600"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enable'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Subscription Badge (for Profile page)
 */
export const SubscriptionBadge = ({ count, onClick }) => {
  if (!count) return null;
  
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 bg-purple-500/20 border border-purple-500/30 rounded-xl hover:bg-purple-500/30 transition-colors"
    >
      <RefreshCw className="w-4 h-4 text-purple-400" />
      <span className="text-sm font-medium text-purple-300">{count} Active Refills</span>
    </button>
  );
};

export default SubscriptionRefills;

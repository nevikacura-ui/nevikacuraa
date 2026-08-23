import { useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

export const useSubscriptionRedirect = () => {
  const navigate = useNavigate();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [trial, setTrial] = useState(null); // { active, days_remaining, allowed_features }
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const check = async () => {
      // Staff bypass
      const staffToken = localStorage.getItem('staffToken');
      const staffInfo = localStorage.getItem('staffInfo');
      if (staffToken && staffInfo) {
        try {
          const staff = JSON.parse(staffInfo);
          const allowed = ['super_admin', 'admin', 'doctor', 'clinic_staff', 'pharmacy_staff', 'lab_staff'];
          if (staff.role && allowed.includes(staff.role)) {
            setIsSubscribed(true);
            setChecked(true);
            return;
          }
        } catch (e) {}
      }

      const email = localStorage.getItem('userEmail') || localStorage.getItem('pending_membership_email');
      const phone = localStorage.getItem('userPhone');

      if (!email && !phone) {
        setIsSubscribed(false);
        setChecked(true);
        return;
      }

      try {
        const params = new URLSearchParams();
        if (email) params.set('email', email);
        else if (phone) params.set('phone', phone);
        const res = await fetch(`${API}/api/membership-tiers/check-active?${params}`);
        const data = await res.json();
        setIsSubscribed(!!data.active);
        if (data.trial && data.trial.active) {
          setTrial(data.trial);
        }
      } catch (e) {
        setIsSubscribed(false);
      }
      setChecked(true);
    };
    check();
  }, []);

  const startTrial = useCallback(async () => {
    const email = localStorage.getItem('userEmail') || localStorage.getItem('pending_membership_email');
    const phone = localStorage.getItem('userPhone');
    if (!email && !phone) {
      toast.info('Please log in to start your free trial');
      navigate('/one');
      return false;
    }
    try {
      const res = await fetch(`${API}/api/membership-tiers/start-trial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone })
      });
      const data = await res.json();
      if (data.success) {
        setTrial(data.trial);
        toast.success('7-day free trial activated!', { duration: 4000 });
        return true;
      } else {
        toast.error(data.detail || 'Could not start trial');
        return false;
      }
    } catch (e) {
      toast.error('Failed to start trial');
      return false;
    }
  }, [navigate]);

  // gate(callback, featureId, portal)
  // featureId: string like 'period_tracker', 'diet_plans' etc
  // portal: 'evara' | 'glydex'
  const gate = useCallback((callback, featureId, portal) => {
    return (...args) => {
      if (isSubscribed) {
        if (callback) callback(...args);
        return true;
      }

      // Check trial
      if (trial && trial.active && featureId && portal) {
        const portalFeatures = trial.allowed_features?.[portal] || [];
        if (portalFeatures.includes(featureId)) {
          if (callback) callback(...args);
          return true;
        }
      }

      toast.info('Subscribe to Nevika Cura ONE to unlock this feature', {
        duration: 3000,
        action: { label: 'Subscribe', onClick: () => navigate('/one') }
      });
      setTimeout(() => navigate('/one'), 1500);
      return false;
    };
  }, [isSubscribed, trial, navigate]);

  // Check if a specific feature is accessible (subscribed OR in trial)
  const canAccess = useCallback((featureId, portal) => {
    if (isSubscribed) return true;
    if (trial && trial.active && featureId && portal) {
      const portalFeatures = trial.allowed_features?.[portal] || [];
      return portalFeatures.includes(featureId);
    }
    return false;
  }, [isSubscribed, trial]);

  return { isSubscribed, trial, checked, gate, canAccess, startTrial };
};

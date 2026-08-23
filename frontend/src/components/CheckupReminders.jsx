import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { Bell, AlertTriangle, Clock, ChevronRight, FlaskConical, CalendarClock } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

export const CheckupReminders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchReminders();
    else setLoading(false);
  }, [user]);

  const fetchReminders = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('patientToken');
      if (!token) return;
      const res = await axios.get(`${API}/reminders/checkup-due`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReminders(res.data.reminders || []);
    } catch (e) {
      // silent - might not have booking history
    } finally {
      setLoading(false);
    }
  };

  if (loading || reminders.length === 0) return null;

  const urgentReminders = reminders.filter(r => r.status === 'overdue' || r.status === 'upcoming');
  if (urgentReminders.length === 0) return null;

  return (
    <div className="space-y-2" data-testid="checkup-reminders">
      {urgentReminders.map((r, i) => (
        <button key={i} onClick={() => navigate('/mango')}
          className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all ${
            r.status === 'overdue'
              ? 'bg-red-500/10 border-red-500/20 hover:bg-red-500/15'
              : 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/15'
          }`}
          data-testid={`checkup-reminder-${r.category.toLowerCase()}`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            r.status === 'overdue' ? 'bg-red-500/20' : 'bg-amber-500/20'
          }`}>
            {r.status === 'overdue' ? (
              <AlertTriangle className="w-5 h-5 text-red-400" />
            ) : (
              <CalendarClock className="w-5 h-5 text-amber-400" />
            )}
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold text-white">{r.category} Checkup {r.status === 'overdue' ? 'Overdue' : 'Due Soon'}</p>
            <p className="text-xs text-gray-400">{r.message}</p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </button>
      ))}
    </div>
  );
};

export default CheckupReminders;

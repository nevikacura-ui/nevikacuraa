import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, RefreshCw, Clock, IndianRupee, ChevronRight } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PastVisitRebook = ({ phone, onRebook }) => {
  const [lastVisit, setLastVisit] = useState(null);

  useEffect(() => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    axios.get(`${API}/appointments/history?phone=${cleanPhone}`)
      .then(res => {
        const completed = (res.data.appointments || []).find(a => a.status === 'Completed');
        if (completed) setLastVisit(completed);
      })
      .catch(() => {});
  }, [phone]);

  if (!lastVisit) return null;

  const handleRebook = () => {
    onRebook({
      doctor: lastVisit.doctor,
      clinic: lastVisit.clinic
    });
  };

  return (
    <div className="mb-4 p-3.5 rounded-2xl border border-teal-500/20 bg-teal-500/5" data-testid="past-visit-rebook">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-teal-400 uppercase tracking-wide mb-0.5">Your Last Visit</p>
          <p className="text-sm font-bold text-white truncate">{lastVisit.doctor}</p>
          <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {lastVisit.date}
            </span>
            {lastVisit.total_amount > 0 && (
              <span className="flex items-center gap-0.5">
                <IndianRupee className="w-3 h-3" />
                {lastVisit.total_amount}
              </span>
            )}
          </div>
          {lastVisit.follow_up_date && (
            <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Follow-up: {lastVisit.follow_up_date}
            </p>
          )}
        </div>
        <button
          onClick={handleRebook}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-semibold hover:bg-teal-500/30 transition-all"
          data-testid="rebook-btn"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Book Again
        </button>
      </div>
    </div>
  );
};

export default PastVisitRebook;

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import HealthCalendar from '@/components/HealthCalendar';

const HealthCalendarPage = () => {
  const navigate = useNavigate();
  const phone = localStorage.getItem('patient_phone') || '';

  return (
    <div className="min-h-screen" style={{ background: '#FFF8F0' }} data-testid="health-calendar-page">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-stone-100">
          <ArrowLeft className="w-5 h-5 text-stone-600" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-stone-800">Health Calendar</h1>
          <p className="text-[10px] text-stone-400">All your health events in one place</p>
        </div>
      </div>

      {/* Calendar */}
      <HealthCalendar phone={phone} />

      {/* Info */}
      <div className="mx-4 mt-3 p-3 rounded-xl bg-white/60 border border-stone-100">
        <p className="text-[10px] text-stone-500 text-center">
          Appointments, medicine reminders, lab bookings, and pharmacy orders — all synced automatically across DiaGyn, Orange, Mango, and Cura platforms.
        </p>
      </div>
    </div>
  );
};

export default HealthCalendarPage;

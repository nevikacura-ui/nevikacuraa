import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Pill, TestTube, Clock, ChevronRight, Package, Bell, History, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SmartHomeFeed = ({ user, className = '' }) => {
  const navigate = useNavigate();
  const [feedItems, setFeedItems] = useState([]);
  const API = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    if (!user) return;

    const fetchFeedData = async () => {
      const items = [];

      // Check for upcoming appointments
      try {
        const token = localStorage.getItem('patientToken');
        if (token) {
          const response = await fetch(`${API}/api/patients/portal/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            
            // Upcoming appointments
            if (data.upcoming_appointments && data.upcoming_appointments.length > 0) {
              const apt = data.upcoming_appointments[0];
              items.push({
                type: 'appointment',
                title: 'Upcoming Appointment',
                subtitle: `${apt.doctor_name || 'Doctor'} • ${apt.clinic || 'Clinic'}`,
                time: apt.date,
                icon: Calendar,
                color: 'teal',
                action: () => navigate('/patient-portal'),
                priority: 1
              });
            }

            // Pending lab reports
            if (data.pending_reports && data.pending_reports > 0) {
              items.push({
                type: 'lab',
                title: 'Lab Reports Ready',
                subtitle: `${data.pending_reports} report(s) ready to view`,
                icon: TestTube,
                color: 'blue',
                action: () => navigate('/patient-portal'),
                priority: 2
              });
            }
          }
        }
      } catch (err) {
        console.log('Error fetching user data');
      }

      // Check for medicine reminders
      const reminders = JSON.parse(localStorage.getItem('medicineReminders') || '[]');
      const activeReminders = reminders.filter(r => r.active);
      if (activeReminders.length > 0) {
        items.push({
          type: 'reminder',
          title: 'Medicine Reminder',
          subtitle: `${activeReminders.length} active reminder(s)`,
          icon: Pill,
          color: 'orange',
          action: () => navigate('/smart-reminders'),
          priority: 3
        });
      }

      // Check for recent orders
      const recentOrder = localStorage.getItem('lastPharmacyOrder');
      if (recentOrder) {
        const order = JSON.parse(recentOrder);
        items.push({
          type: 'order',
          title: 'Track Your Order',
          subtitle: `Order #${order.id?.slice(-6) || 'Recent'}`,
          icon: Package,
          color: 'purple',
          action: () => navigate('/track'),
          priority: 4
        });
      }

      // Sort by priority and limit
      items.sort((a, b) => a.priority - b.priority);
      setFeedItems(items.slice(0, 4));
    };

    fetchFeedData();
  }, [user, API, navigate]);

  if (!user || feedItems.length === 0) return null;

  const getColorClasses = (color) => {
    const colors = {
      teal: { bg: 'bg-teal-100', text: 'text-teal-600', border: 'border-teal-200' },
      blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
      orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' },
      purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
      green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' }
    };
    return colors[color] || colors.teal;
  };

  return (
    <div className={`${className}`} data-testid="smart-home-feed">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          For You
        </h3>
        <button 
          onClick={() => navigate('/patient-portal')}
          className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
        >
          View All
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {feedItems.map((item, idx) => {
          const colors = getColorClasses(item.color);
          return (
            <button
              key={idx}
              onClick={item.action}
              className={`flex items-center gap-4 p-4 bg-white/70 backdrop-blur rounded-2xl border ${colors.border} hover:shadow-md transition-all group text-left`}
              data-testid={`feed-item-${item.type}`}
            >
              <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                <item.icon className={`w-6 h-6 ${colors.text}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 truncate">{item.title}</p>
                <p className="text-sm text-slate-500 truncate">{item.subtitle}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-teal-500 transition-colors flex-shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Continue where you left off */}
      <div className="mt-4 p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl border border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center">
              <History className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="font-medium text-slate-700">Continue where you left off</p>
              <p className="text-sm text-slate-500">View your recent activity</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/patient-portal')}
            className="rounded-full"
          >
            View
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SmartHomeFeed;

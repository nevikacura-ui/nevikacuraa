import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Calendar, FlaskConical, ChevronRight, Sparkles, History } from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

const PersonalizedActions = ({ className = '' }) => {
  const navigate = useNavigate();
  const [lastOrder, setLastOrder] = useState(null);
  const [lastAppointment, setLastAppointment] = useState(null);
  const [lastLabTest, setLastLabTest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuickActions = async () => {
      try {
        const token = localStorage.getItem('patientToken');

        // Fetch last pharmacy order from localStorage
        const lastPharmacyOrder = localStorage.getItem('lastPharmacyOrder');
        if (lastPharmacyOrder) {
          try {
            setLastOrder(JSON.parse(lastPharmacyOrder));
          } catch (e) {}
        }

        // Fetch last appointment from localStorage
        const lastApt = localStorage.getItem('lastAppointment');
        if (lastApt) {
          try {
            setLastAppointment(JSON.parse(lastApt));
          } catch (e) {}
        }

        // Fetch last lab test from localStorage
        const lastTest = localStorage.getItem('lastLabTest');
        if (lastTest) {
          try {
            setLastLabTest(JSON.parse(lastTest));
          } catch (e) {}
        }

        // Try to fetch from API if token exists
        if (token) {
          try {
            const response = await fetch(`${API}/api/patients/portal/me`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
              const data = await response.json();
              
              // Set last appointment from API
              if (data.past_appointments && data.past_appointments.length > 0) {
                const apt = data.past_appointments[0];
                setLastAppointment(apt);
                localStorage.setItem('lastAppointment', JSON.stringify(apt));
              }
              
              // Set last order from API
              if (data.past_orders && data.past_orders.length > 0) {
                const order = data.past_orders[0];
                setLastOrder(order);
                localStorage.setItem('lastPharmacyOrder', JSON.stringify(order));
              }
            }
          } catch (e) {
            console.log('API fetch error, using cached data');
          }
        }

      } catch (error) {
        console.error('PersonalizedActions fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuickActions();
  }, []);

  const handleReorder = () => {
    if (lastOrder && lastOrder.medicines) {
      localStorage.setItem('reorderMedicines', JSON.stringify(lastOrder.medicines));
      toast.success('Medicines added to cart!');
    }
    navigate('/pharmacy');
  };

  const handleBookAgain = () => {
    if (lastAppointment) {
      localStorage.setItem('preferredDoctor', JSON.stringify({
        id: lastAppointment.doctor_id,
        name: lastAppointment.doctor_name,
        clinic: lastAppointment.clinic
      }));
      toast.success(`Booking with ${lastAppointment.doctor_name || 'your doctor'}...`);
    }
    navigate('/diagyn');
  };

  const handleRepeatTest = () => {
    if (lastLabTest && lastLabTest.tests) {
      localStorage.setItem('selectedTests', JSON.stringify(lastLabTest.tests));
      toast.success('Tests added to selection!');
    }
    navigate('/mango');
  };

  // Check if user is logged in
  const isLoggedIn = localStorage.getItem('patientToken') || localStorage.getItem('guestMobile');
  
  if (!isLoggedIn || loading) return null;

  // Show actions only if there's history
  const hasActions = lastOrder || lastAppointment || lastLabTest;
  if (!hasActions) return null;

  return (
    <div className={`bg-gradient-to-r from-slate-50 to-white rounded-2xl p-4 border border-slate-100 ${className}`} data-testid="personalized-actions">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
          <History className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Quick Reorder</h3>
          <p className="text-xs text-slate-500">Based on your history</p>
        </div>
      </div>

      {/* Horizontal Scroll Actions */}
      <div 
        className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Reorder Medicines */}
        {lastOrder && (
          <button
            onClick={handleReorder}
            className="flex-shrink-0 flex items-center gap-3 bg-white border border-orange-200 rounded-xl px-3 py-2.5 hover:shadow-md hover:border-orange-300 transition-all group"
            data-testid="quick-reorder-btn"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center group-hover:scale-105 transition-transform">
              <RefreshCw className="w-4 h-4 text-orange-600" />
            </div>
            <div className="text-left min-w-[100px]">
              <p className="text-xs font-semibold text-slate-800">Reorder Meds</p>
              <p className="text-[10px] text-slate-500">
                {lastOrder.itemCount || lastOrder.medicines?.length || '...'} items
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-orange-400" />
          </button>
        )}

        {/* Book Again Doctor */}
        {lastAppointment && (
          <button
            onClick={handleBookAgain}
            className="flex-shrink-0 flex items-center gap-3 bg-white border border-teal-200 rounded-xl px-3 py-2.5 hover:shadow-md hover:border-teal-300 transition-all group"
            data-testid="quick-book-again-btn"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-100 to-cyan-50 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Calendar className="w-4 h-4 text-teal-600" />
            </div>
            <div className="text-left min-w-[100px]">
              <p className="text-xs font-semibold text-slate-800">Book Again</p>
              <p className="text-[10px] text-slate-500 truncate max-w-[90px]">
                {lastAppointment.doctor_name || 'Doctor'}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-teal-400" />
          </button>
        )}

        {/* Repeat Lab Test */}
        {lastLabTest && (
          <button
            onClick={handleRepeatTest}
            className="flex-shrink-0 flex items-center gap-3 bg-white border border-purple-200 rounded-xl px-3 py-2.5 hover:shadow-md hover:border-purple-300 transition-all group"
            data-testid="quick-repeat-test-btn"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-100 to-violet-50 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FlaskConical className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-left min-w-[100px]">
              <p className="text-xs font-semibold text-slate-800">Repeat Test</p>
              <p className="text-[10px] text-slate-500">
                {lastLabTest.testCount || lastLabTest.tests?.length || '...'} tests
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-purple-400" />
          </button>
        )}
      </div>
    </div>
  );
};

export default PersonalizedActions;

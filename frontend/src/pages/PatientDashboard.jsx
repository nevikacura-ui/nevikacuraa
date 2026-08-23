import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Stethoscope, FlaskConical, Package, Calendar, Clock,
  ChevronRight, Search, RefreshCw, Loader2, User,
  FileText, Download, Phone, MapPin, Truck, RotateCcw
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import ActiveTrackingSection from '../components/ActiveTrackingSection';

const API = process.env.REACT_APP_BACKEND_URL;

const StatusBadge = ({ status, type }) => {
  const colors = {
    confirmed: 'bg-green-100 text-green-700',
    booked: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-blue-100 text-blue-700',
    delivered: 'bg-blue-100 text-blue-700',
    cancelled: 'bg-red-100 text-red-700',
    processing: 'bg-orange-100 text-orange-700',
    out_for_delivery: 'bg-purple-100 text-purple-700',
    sample_collected: 'bg-teal-100 text-teal-700',
  };
  const c = colors[status] || 'bg-gray-100 text-gray-600';
  const label = status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
  return <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${c}`}>{label}</span>;
};

const PatientDashboard = () => {
  const navigate = useNavigate();
  const { addToPharmacyCart, clearPharmacyCart } = useCart();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  const savedPhone = localStorage.getItem('guestMobile') || '';

  useEffect(() => {
    if (savedPhone) {
      setPhone(savedPhone);
      fetchDashboard(savedPhone);
    }
  }, []);

  const fetchDashboard = useCallback(async (ph) => {
    const p = (ph || phone).replace(/\D/g, '').slice(-10);
    if (p.length < 10) { toast.error('Enter a valid 10-digit phone number'); return; }
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/patient-dashboard/${p}`);
      if (res.data.success) {
        setData(res.data);
        localStorage.setItem('guestMobile', p);
      } else {
        toast.error('Unable to fetch data');
      }
    } catch { toast.error('Something went wrong'); }
    setLoading(false);
  }, [phone]);

  const tabs = [
    { key: 'all', label: 'Overview', icon: User },
    { key: 'appointments', label: 'Visits', icon: Stethoscope },
    { key: 'lab', label: 'Lab Tests', icon: FlaskConical },
    { key: 'pharmacy', label: 'Pharmacy', icon: Package },
  ];

  const handleReorder = (order) => {
    const items = order.items || [];
    if (!items.length) { toast.error('No items to reorder'); return; }
    clearPharmacyCart();
    items.forEach(item => {
      addToPharmacyCart({
        name: item.name || item.medicine_name || 'Medicine',
        price: item.price || item.mrp || 0,
        mrp: item.mrp || item.price || 0,
        quantity: item.quantity || 1,
        image: item.image || '',
      });
    });
    toast.success(`${items.length} item${items.length > 1 ? 's' : ''} added to cart`);
    navigate('/cart');
  };

  const statCards = data ? [
    { label: 'Upcoming Visits', value: data.stats.upcoming_appointments, icon: Calendar, color: '#5b2d8e', bg: '#f3f0f8' },
    { label: 'Active Lab Tests', value: data.stats.active_lab_orders, icon: FlaskConical, color: '#16a34a', bg: '#f0fdf4' },
    { label: 'Active Orders', value: data.stats.active_pharmacy_orders, icon: Truck, color: '#ea580c', bg: '#fff7ed' },
  ] : [];

  return (
    <div className="min-h-screen bg-gray-50" data-testid="patient-dashboard">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-1">My Health Portal</h1>
          <p className="text-sm text-white/60">All your bookings in one place</p>

          {!data && (
            <div className="mt-4 flex gap-2">
              <div className="flex-1 relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="tel"
                  placeholder="Enter your mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  onKeyPress={(e) => e.key === 'Enter' && fetchDashboard()}
                  className="pl-10 h-12 bg-white text-gray-900 border-0 rounded-xl"
                  data-testid="phone-input"
                />
              </div>
              <Button onClick={() => fetchDashboard()} disabled={loading} className="h-12 px-6 bg-white/20 hover:bg-white/30 rounded-xl" data-testid="search-btn">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              </Button>
            </div>
          )}

          {data && (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm text-white/70">Showing results for <span className="font-bold text-white">{phone}</span></p>
              <Button variant="ghost" size="sm" onClick={() => fetchDashboard()} className="text-white/60 hover:text-white" data-testid="refresh-btn">
                <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />Refresh
              </Button>
            </div>
          )}
        </div>
      </div>

      {data && (
        <div className="max-w-2xl mx-auto p-4 space-y-4">
          {/* Active Tracking — Top Priority */}
          <ActiveTrackingSection data={data} onRefresh={() => fetchDashboard(phone)} />
          {/* Stats Summary */}
          <div className="grid grid-cols-3 gap-3" data-testid="stats-cards">
            {statCards.map((s) => (
              <Card key={s.label} className="p-3 border-0 shadow-sm rounded-2xl" style={{ backgroundColor: s.bg }}>
                <s.icon className="w-6 h-6 mb-2" style={{ color: s.color }} />
                <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px] text-gray-500 font-semibold mt-0.5">{s.label}</p>
              </Card>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 overflow-x-auto pb-2" data-testid="quick-actions">
            <Button onClick={() => navigate('/diagyn')} className="flex-shrink-0 h-10 rounded-full bg-purple-600 hover:bg-purple-700 text-xs font-bold gap-1.5">
              <Stethoscope className="w-3.5 h-3.5" />Book Appointment
            </Button>
            <Button onClick={() => navigate('/mango')} className="flex-shrink-0 h-10 rounded-full bg-green-600 hover:bg-green-700 text-xs font-bold gap-1.5">
              <FlaskConical className="w-3.5 h-3.5" />Book Lab Test
            </Button>
            <Button onClick={() => navigate('/pharmacy')} className="flex-shrink-0 h-10 rounded-full bg-orange-600 hover:bg-orange-700 text-xs font-bold gap-1.5">
              <Package className="w-3.5 h-3.5" />Order Medicines
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-white p-1 rounded-2xl shadow-sm border border-gray-100">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === tab.key ? 'bg-slate-900 text-white shadow' : 'text-gray-500 hover:bg-gray-100'
                }`}
                data-testid={`tab-${tab.key}`}
              >
                <tab.icon className="w-3.5 h-3.5" />{tab.label}
              </button>
            ))}
          </div>

          {/* Appointments */}
          {(activeTab === 'all' || activeTab === 'appointments') && data.appointments.length > 0 && (
            <div>
              {activeTab === 'all' && <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2"><Stethoscope className="w-4 h-4 text-purple-600" />Recent Appointments</h3>}
              <div className="space-y-2">
                {data.appointments.map((apt, i) => (
                  <Card key={i} className="p-4 border-0 shadow-sm rounded-2xl bg-white hover:shadow-md transition-shadow cursor-pointer" data-testid={`appointment-card-${i}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                          <Stethoscope className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-gray-800">{apt.doctor || 'Doctor'}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{apt.clinic || 'DiaGyn'}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-xs text-gray-500 flex items-center gap-1"><Calendar className="w-3 h-3" />{apt.date || 'N/A'}</span>
                            <span className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3 h-3" />{apt.time || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={apt.status} type="appointment" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Lab Orders */}
          {(activeTab === 'all' || activeTab === 'lab') && data.lab_orders.length > 0 && (
            <div>
              {activeTab === 'all' && <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2"><FlaskConical className="w-4 h-4 text-green-600" />Lab Tests</h3>}
              <div className="space-y-2">
                {data.lab_orders.map((lab, i) => {
                  const tests = lab.tests || [];
                  const testNames = tests.map(t => typeof t === 'string' ? t : t.name).filter(Boolean);
                  return (
                    <Card key={i} className="p-4 border-0 shadow-sm rounded-2xl bg-white" data-testid={`lab-card-${i}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                            <FlaskConical className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-gray-800">{lab.booking_id || 'Lab Order'}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{testNames.slice(0, 3).join(', ')}{testNames.length > 3 ? ` +${testNames.length - 3} more` : ''}</p>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="text-xs text-gray-500">{lab.preferred_date || 'N/A'}</span>
                              <span className="text-xs text-gray-500">{lab.collection_type || 'Lab'}</span>
                              <span className="text-xs font-bold text-green-600">&#8377;{lab.total_amount || '0'}</span>
                            </div>
                          </div>
                        </div>
                        <StatusBadge status={lab.status} type="lab" />
                      </div>
                      {lab.report_url && (
                        <a href={lab.report_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 mt-2 px-3 py-2 bg-green-50 border border-green-200 rounded-xl text-xs font-bold text-green-700 hover:bg-green-100 transition-colors w-fit">
                          <Download className="w-3.5 h-3.5" />Download Report
                        </a>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pharmacy Orders */}
          {(activeTab === 'all' || activeTab === 'pharmacy') && data.pharmacy_orders.length > 0 && (
            <div>
              {activeTab === 'all' && <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2"><Package className="w-4 h-4 text-orange-600" />Pharmacy Orders</h3>}
              <div className="space-y-2">
                {data.pharmacy_orders.map((ord, i) => {
                  const items = ord.items || [];
                  const itemNames = items.map(it => typeof it === 'string' ? it : it.name).filter(Boolean);
                  const orderId = ord.order_id || ord.booking_id || 'Order';
                  const total = ord.total_amount || ord.total || 0;
                  return (
                    <Card key={i} className="p-4 border-0 shadow-sm rounded-2xl bg-white hover:shadow-md transition-shadow"
                      data-testid={`pharmacy-card-${i}`}>
                      <div className="flex items-start justify-between cursor-pointer" onClick={() => navigate(`/track?id=${orderId}`)}>
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                            <Package className="w-5 h-5 text-orange-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-gray-800">{orderId}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{itemNames.slice(0, 2).join(', ')}{itemNames.length > 2 ? ` +${itemNames.length - 2}` : ''}</p>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="text-xs font-bold text-orange-600">&#8377;{total}</span>
                              <span className="text-xs text-gray-400">{ord.payment_method || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <StatusBadge status={ord.status} type="pharmacy" />
                          <ChevronRight className="w-4 h-4 text-gray-300" />
                        </div>
                      </div>
                      {['delivered', 'completed', 'cancelled'].includes(ord.status?.toLowerCase()) && items.length > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReorder(ord); }}
                          className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-orange-50 border border-orange-200 rounded-xl text-xs font-bold text-orange-700 hover:bg-orange-100 transition-colors active:scale-[0.97]"
                          data-testid={`reorder-btn-${i}`}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />Reorder
                        </button>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty states */}
          {activeTab === 'appointments' && data.appointments.length === 0 && (
            <Card className="p-8 text-center border-0 shadow-sm rounded-2xl">
              <Stethoscope className="w-12 h-12 mx-auto text-purple-300 mb-3" />
              <p className="text-gray-500 font-medium">No appointments yet</p>
              <Button onClick={() => navigate('/diagyn')} className="mt-3 bg-purple-600 rounded-xl">Book Now</Button>
            </Card>
          )}
          {activeTab === 'lab' && data.lab_orders.length === 0 && (
            <Card className="p-8 text-center border-0 shadow-sm rounded-2xl">
              <FlaskConical className="w-12 h-12 mx-auto text-green-300 mb-3" />
              <p className="text-gray-500 font-medium">No lab tests yet</p>
              <Button onClick={() => navigate('/mango')} className="mt-3 bg-green-600 rounded-xl">Book Test</Button>
            </Card>
          )}
          {activeTab === 'pharmacy' && data.pharmacy_orders.length === 0 && (
            <Card className="p-8 text-center border-0 shadow-sm rounded-2xl">
              <Package className="w-12 h-12 mx-auto text-orange-300 mb-3" />
              <p className="text-gray-500 font-medium">No orders yet</p>
              <Button onClick={() => navigate('/pharmacy')} className="mt-3 bg-orange-600 rounded-xl">Order Medicines</Button>
            </Card>
          )}

          <div className="h-8" />
        </div>
      )}

      {/* No data initial state */}
      {!data && !loading && (
        <div className="max-w-2xl mx-auto p-4 text-center py-12">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
            <User className="w-10 h-10 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Your Health Portal</h2>
          <p className="text-gray-500 text-sm mb-6">Enter your mobile number to view all your bookings, lab tests, and pharmacy orders in one place.</p>
        </div>
      )}
    </div>
  );
};

export default PatientDashboard;

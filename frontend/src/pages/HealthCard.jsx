import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';
import {
  ArrowLeft, Heart, FileText, FlaskConical, Pill, Calendar,
  Shield, CreditCard, Download, ChevronRight, Activity,
  AlertTriangle, Clock, Droplets, User, Phone, Mail,
  Edit3, Save, X, Loader2, Star, Award
} from 'lucide-react';
import BottomNav from '@/components/BottomNav';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const HealthCard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState({});
  const [saving, setSaving] = useState(false);

  const userId = user?.id || user?.patient_id;

  useEffect(() => {
    if (userId) fetchHealthCard();
    else setLoading(false);
  }, [userId]);

  const fetchHealthCard = async () => {
    try {
      const res = await axios.get(`${API}/health-card/${userId}`);
      setData(res.data);
      setProfile({
        blood_group: res.data.user?.blood_group || '',
        date_of_birth: res.data.user?.date_of_birth || '',
        gender: res.data.user?.gender || '',
        allergies: res.data.user?.allergies?.join(', ') || '',
        chronic_conditions: res.data.user?.chronic_conditions?.join(', ') || '',
        height: res.data.user?.height || '',
        weight: res.data.user?.weight || ''
      });
    } catch (e) {
      console.error('Failed to fetch health card:', e);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('patientToken');
      await axios.put(`${API}/health-card/${userId}/profile`, {
        ...profile,
        allergies: profile.allergies ? profile.allergies.split(',').map(s => s.trim()).filter(Boolean) : [],
        chronic_conditions: profile.chronic_conditions ? profile.chronic_conditions.split(',').map(s => s.trim()).filter(Boolean) : []
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Profile updated');
      setEditing(false);
      fetchHealthCard();
    } catch (e) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <Shield className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Sign in Required</h2>
        <p className="text-gray-500 text-center mb-6">Log in to view your Digital Health Card</p>
        <button onClick={() => navigate('/login')} className="px-6 py-3 bg-teal-500 text-white rounded-2xl font-medium"
          data-testid="health-card-login-btn">Sign In</button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  const sections = [
    { id: 'overview', label: 'Overview', icon: Heart },
    { id: 'appointments', label: 'Visits', icon: Calendar },
    { id: 'lab_orders', label: 'Lab Tests', icon: FlaskConical },
    { id: 'prescriptions', label: 'Rx', icon: Pill },
    { id: 'reports', label: 'Reports', icon: FileText },
  ];

  const u = data?.user || {};
  const stats = data?.stats || {};

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-24" data-testid="health-card-page">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-600 via-teal-500 to-cyan-500 text-white px-4 pt-12 pb-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-white/20" data-testid="health-card-back">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">Digital Health Card</h1>
        </div>

        {/* Card */}
        <div className="bg-white/15 backdrop-blur-lg rounded-2xl p-5 border border-white/20">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-white/70 uppercase tracking-wider">Patient</p>
              <h2 className="text-2xl font-bold">{u.name || 'Patient'}</h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-white/80">
                {u.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{u.phone}</span>}
                {u.blood_group && <span className="flex items-center gap-1"><Droplets className="w-3 h-3" />{u.blood_group}</span>}
              </div>
            </div>
            <div className="text-right">
              {data?.membership?.membership_code && (
                <div className="bg-white/20 rounded-lg px-3 py-1.5 mb-2">
                  <p className="text-[10px] text-white/70 uppercase">Membership</p>
                  <p className="text-xs font-mono font-bold">{data.membership.membership_code}</p>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-amber-300" />
                <span className="text-sm font-semibold">{data?.loyalty_points || 0} pts</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 mt-3">
            {[
              { label: 'Visits', value: stats.total_appointments, icon: Calendar },
              { label: 'Lab Tests', value: stats.total_lab_tests, icon: FlaskConical },
              { label: 'Prescriptions', value: stats.total_prescriptions, icon: Pill },
              { label: 'Reports', value: stats.total_reports, icon: FileText },
            ].map(s => (
              <div key={s.label} className="bg-white/10 rounded-xl p-2 text-center">
                <s.icon className="w-4 h-4 mx-auto mb-1 text-white/80" />
                <p className="text-lg font-bold">{s.value || 0}</p>
                <p className="text-[10px] text-white/70">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-2 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {sections.map(s => (
            <button key={s.id} onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all ${
                activeSection === s.id
                  ? 'bg-teal-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              data-testid={`health-card-tab-${s.id}`}>
              <s.icon className="w-3.5 h-3.5" />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-4">
        {activeSection === 'overview' && (
          <>
            {/* Health Profile */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <User className="w-4 h-4 text-teal-500" />
                  Health Profile
                </h3>
                <button onClick={() => setEditing(!editing)} className="text-xs text-teal-500 font-medium flex items-center gap-1"
                  data-testid="health-card-edit-profile">
                  {editing ? <><X className="w-3 h-3" />Cancel</> : <><Edit3 className="w-3 h-3" />Edit</>}
                </button>
              </div>

              {editing ? (
                <div className="space-y-3">
                  {[
                    { key: 'blood_group', label: 'Blood Group', placeholder: 'e.g. B+' },
                    { key: 'date_of_birth', label: 'Date of Birth', placeholder: 'YYYY-MM-DD', type: 'date' },
                    { key: 'gender', label: 'Gender', placeholder: 'Male/Female/Other' },
                    { key: 'height', label: 'Height (cm)', placeholder: '165', type: 'number' },
                    { key: 'weight', label: 'Weight (kg)', placeholder: '70', type: 'number' },
                    { key: 'allergies', label: 'Allergies', placeholder: 'Penicillin, Dust (comma separated)' },
                    { key: 'chronic_conditions', label: 'Conditions', placeholder: 'Diabetes, Hypertension (comma separated)' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="text-xs text-gray-500 mb-1 block">{f.label}</label>
                      <input type={f.type || 'text'} value={profile[f.key] || ''} placeholder={f.placeholder}
                        onChange={e => setProfile({...profile, [f.key]: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:border-teal-400 focus:ring-1 focus:ring-teal-400 outline-none text-gray-800"
                        data-testid={`health-card-input-${f.key}`} />
                    </div>
                  ))}
                  <button onClick={saveProfile} disabled={saving}
                    className="w-full py-2.5 bg-teal-500 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                    data-testid="health-card-save-profile">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Profile
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Blood Group', value: u.blood_group },
                    { label: 'Gender', value: u.gender },
                    { label: 'DOB', value: u.date_of_birth },
                    { label: 'Allergies', value: u.allergies?.join(', ') },
                  ].map(item => (
                    <div key={item.label} className="bg-gray-50 rounded-xl p-2.5">
                      <p className="text-[10px] text-gray-400 uppercase">{item.label}</p>
                      <p className="text-sm font-medium text-gray-800">{item.value || '—'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Book Lab Test', icon: FlaskConical, color: 'bg-blue-500', route: '/mango' },
                { label: 'Book Appointment', icon: Calendar, color: 'bg-purple-500', route: '/diagyn' },
                { label: 'Order Medicine', icon: Pill, color: 'bg-green-500', route: '/pharmacy' },
                { label: 'View Reports', icon: FileText, color: 'bg-orange-500', onClick: () => setActiveSection('reports') },
              ].map(a => (
                <button key={a.label} onClick={a.onClick || (() => navigate(a.route))}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-left hover:shadow-md transition-shadow"
                  data-testid={`health-card-action-${a.label.toLowerCase().replace(/\s/g, '-')}`}>
                  <div className={`w-10 h-10 ${a.color} rounded-xl flex items-center justify-center mb-2`}>
                    <a.icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-sm font-medium text-gray-800">{a.label}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {activeSection === 'appointments' && (
          <RecordsList
            title="Appointment History"
            icon={Calendar}
            items={data?.appointments || []}
            renderItem={(apt) => (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-800">{apt.doctor || apt.doctor_name || 'Doctor'}</p>
                    <p className="text-xs text-gray-500">{apt.clinic || 'Clinic'}</p>
                  </div>
                  <StatusBadge status={apt.status} />
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span>{apt.date || ''}</span>
                  <span>{apt.time_slot || ''}</span>
                </div>
              </div>
            )} />
        )}

        {activeSection === 'lab_orders' && (
          <RecordsList
            title="Lab Test History"
            icon={FlaskConical}
            items={data?.lab_orders || []}
            renderItem={(order) => (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 text-sm">
                      {(order.tests || []).slice(0, 3).map(t => typeof t === 'string' ? t : t.name).join(', ')}
                    </p>
                    {(order.tests || []).length > 3 && (
                      <p className="text-xs text-gray-400">+{order.tests.length - 3} more</p>
                    )}
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                  <span>{(order.created_at || '').slice(0, 10)}</span>
                  {order.total_amount && <span className="font-medium text-gray-600">Rs. {order.total_amount}</span>}
                </div>
              </div>
            )} />
        )}

        {activeSection === 'prescriptions' && (
          <RecordsList
            title="Prescriptions"
            icon={Pill}
            items={data?.prescriptions || []}
            renderItem={(rx) => (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <p className="font-medium text-gray-800 text-sm">{rx.doctor_name || 'Doctor'}</p>
                <p className="text-xs text-gray-500 mt-1">{(rx.medicines || []).slice(0, 3).map(m => m.name || m).join(', ')}</p>
                <p className="text-xs text-gray-400 mt-2">{(rx.date || '').slice(0, 10)}</p>
              </div>
            )} />
        )}

        {activeSection === 'reports' && (
          <RecordsList
            title="Lab Reports"
            icon={FileText}
            items={data?.reports || []}
            renderItem={(report) => (
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{report.patient_name || 'Report'}</p>
                    <p className="text-xs text-gray-500">{report.test_name || report.booking_id || ''}</p>
                  </div>
                  {report.report_url && (
                    <a href={report.report_url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 text-xs text-teal-500 font-medium"
                      data-testid="health-card-download-report">
                      <Download className="w-3.5 h-3.5" />View
                    </a>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-2">{(report.created_at || '').slice(0, 10)}</p>
              </div>
            )} />
        )}
      </div>

      <BottomNav />
    </div>
  );
};

const RecordsList = ({ title, icon: Icon, items, renderItem }) => (
  <div>
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-teal-500" />
      <h3 className="font-semibold text-gray-800">{title}</h3>
      <span className="text-xs text-gray-400 ml-auto">{items.length} records</span>
    </div>
    {items.length === 0 ? (
      <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
        <Icon className="w-10 h-10 text-gray-200 mx-auto mb-2" />
        <p className="text-sm text-gray-400">No records found</p>
      </div>
    ) : (
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={item.id || item.booking_id || i}>{renderItem(item)}</div>
        ))}
      </div>
    )}
  </div>
);

const StatusBadge = ({ status }) => {
  const statusColors = {
    'Completed': 'bg-green-100 text-green-700',
    'completed': 'bg-green-100 text-green-700',
    'report_generated': 'bg-blue-100 text-blue-700',
    'Booked': 'bg-amber-100 text-amber-700',
    'test_booked': 'bg-amber-100 text-amber-700',
    'sample_collected': 'bg-purple-100 text-purple-700',
    'in_process': 'bg-indigo-100 text-indigo-700',
    'cancelled': 'bg-red-100 text-red-700',
    'Cancelled': 'bg-red-100 text-red-700',
  };

  const color = statusColors[status] || 'bg-gray-100 text-gray-600';
  const label = (status || 'Unknown').replace(/_/g, ' ');

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${color}`}>
      {label}
    </span>
  );
};

export default HealthCard;

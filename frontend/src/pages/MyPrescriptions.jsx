import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, FileText, FlaskConical, Pill, Download, ChevronRight, Clock, User, Stethoscope } from 'lucide-react';
import { Button } from '../components/ui/button';

const API = process.env.REACT_APP_BACKEND_URL;

export default function MyPrescriptions() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [phone, setPhone] = useState(searchParams.get('phone') || '');
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const fetchPrescriptions = useCallback(async (phoneNum) => {
    if (!phoneNum || phoneNum.length < 10) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/emr/patient/prescriptions?phone=${phoneNum}`);
      const data = await res.json();
      if (data.success) setPrescriptions(data.prescriptions || []);
    } catch (err) {
      console.error('Failed to fetch prescriptions:', err);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }, []);

  useEffect(() => {
    const phoneParam = searchParams.get('phone');
    if (phoneParam && phoneParam.length >= 10) {
      setPhone(phoneParam);
      fetchPrescriptions(phoneParam);
    }
  }, [searchParams, fetchPrescriptions]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPrescriptions(phone);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
  };

  return (
    <div className="min-h-screen bg-white" data-testid="my-prescriptions-page">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1" data-testid="back-btn">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div>
          <h1 className="text-base font-bold text-gray-900">My Prescriptions</h1>
          <p className="text-[10px] text-gray-500">View & manage your medical prescriptions</p>
        </div>
      </div>

      {/* Phone Search */}
      <form onSubmit={handleSearch} className="px-4 pt-4 pb-2" data-testid="phone-search-form">
        <div className="flex gap-2">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter your phone number"
            maxLength={10}
            className="flex-1 h-11 px-4 border border-gray-200 rounded-xl text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
            data-testid="phone-input"
          />
          <Button type="submit" disabled={phone.length < 10 || loading}
            className="h-11 px-5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-medium"
            data-testid="search-btn"
          >
            {loading ? 'Loading...' : 'Search'}
          </Button>
        </div>
      </form>

      {/* Results */}
      <div className="px-4 py-2 space-y-3" data-testid="prescriptions-list">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && searched && prescriptions.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No prescriptions found</p>
            <p className="text-gray-400 text-xs mt-1">Check your phone number and try again</p>
          </div>
        )}

        {prescriptions.map((rx) => (
          <PrescriptionCard key={rx.prescription_id} rx={rx} navigate={navigate} formatDate={formatDate} />
        ))}
      </div>
    </div>
  );
}

function PrescriptionCard({ rx, navigate, formatDate }) {
  const smartLinks = rx.smart_links || {};
  const medCount = (rx.medicines || []).length;
  const testCount = (rx.investigations || []).length;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm" data-testid={`prescription-card-${rx.prescription_id}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{rx.doctor_name || 'Doctor'}</p>
            <p className="text-[10px] text-gray-500">{rx.doctor_specialty || rx.clinic_name}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-gray-400">
            <Clock className="w-3 h-3" />
            <span className="text-[10px]">{formatDate(rx.created_at || rx.date)}</span>
          </div>
        </div>
      </div>

      {/* Diagnosis */}
      {rx.diagnosis && (
        <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-1.5 mb-3">
          <span className="font-semibold">Diagnosis:</span> {Array.isArray(rx.diagnosis) ? rx.diagnosis.join(', ') : rx.diagnosis}
        </p>
      )}

      {/* Summary Row */}
      <div className="flex items-center gap-3 mb-3">
        {medCount > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full">
            <Pill className="w-3 h-3" /> {medCount} medicine{medCount > 1 ? 's' : ''}
          </span>
        )}
        {testCount > 0 && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
            <FlaskConical className="w-3 h-3" /> {testCount} test{testCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {/* Download PDF */}
        <a
          href={`${API}/api/emr/patient/prescription/${rx.prescription_id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 h-9 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
          data-testid={`download-pdf-${rx.prescription_id}`}
        >
          <Download className="w-3.5 h-3.5" /> Download Rx
        </a>

        {/* Order Medicines */}
        {smartLinks.has_medicines && (
          <button
            onClick={() => navigate(smartLinks.pharmacy_link)}
            className="flex-1 flex items-center justify-center gap-1.5 h-9 text-xs font-medium text-white bg-orange-600 rounded-xl hover:bg-orange-700 transition-colors"
            data-testid={`order-meds-${rx.prescription_id}`}
          >
            <Pill className="w-3.5 h-3.5" /> Order Meds <ChevronRight className="w-3 h-3" />
          </button>
        )}

        {/* Book Tests */}
        {smartLinks.has_investigations && (
          <button
            onClick={() => navigate(smartLinks.lab_link)}
            className="flex-1 flex items-center justify-center gap-1.5 h-9 text-xs font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors"
            data-testid={`book-tests-${rx.prescription_id}`}
          >
            <FlaskConical className="w-3.5 h-3.5" /> Book Tests <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

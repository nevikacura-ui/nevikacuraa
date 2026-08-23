import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  ArrowLeft, Upload, FileText, Trash2, Loader2, 
  Plus, Camera, Image, Clock, User
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const PrescriptionWallet = () => {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('patientInfo');
    if (stored) {
      const info = JSON.parse(stored);
      setPatientName(info.name || '');
      setPhone(info.mobile || info.phone || '');
    }
    const guestPhone = localStorage.getItem('guestMobile') || localStorage.getItem('guestPhone');
    if (guestPhone) setPhone(guestPhone);
  }, []);

  useEffect(() => {
    if (phone) fetchPrescriptions();
    else setLoading(false);
  }, [phone]);

  const fetchPrescriptions = async () => {
    try {
      const res = await fetch(`${API}/api/prescriptions/wallet/${phone}`);
      const data = await res.json();
      setPrescriptions(data.prescriptions || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!phone) { toast.error('Please log in first'); return; }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('phone', phone);
    formData.append('patient_name', patientName || 'Patient');

    try {
      const res = await fetch(`${API}/api/prescriptions/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.status === 'success') {
        toast.success('Prescription uploaded!');
        fetchPrescriptions();
      }
    } catch {
      toast.error('Upload failed');
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`${API}/api/prescriptions/${id}`, { method: 'DELETE' });
      setPrescriptions(prev => prev.filter(p => p.id !== id));
      toast.success('Prescription removed');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-[#0A0A1A] text-white" data-testid="prescription-wallet">
      <input type="file" ref={fileRef} accept="image/*,.pdf" className="hidden" onChange={handleUpload} />

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0F0F1F] border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-white/10" data-testid="back-btn">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold text-lg">My Prescriptions</h1>
              <p className="text-xs text-gray-400">{prescriptions.length} saved</p>
            </div>
          </div>
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="bg-orange-500 hover:bg-orange-600 rounded-xl h-9 px-4"
            data-testid="upload-prescription-btn"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> Upload</>}
          </Button>
        </div>
      </div>

      <div className="px-4 py-4 max-w-lg mx-auto space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
          </div>
        ) : !phone ? (
          <div className="text-center py-16">
            <User className="w-12 h-12 mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400">Please log in to view your prescriptions</p>
            <Button onClick={() => navigate('/login')} className="mt-4 bg-orange-500 hover:bg-orange-600 rounded-xl" data-testid="login-btn">
              Login
            </Button>
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400 mb-1">No prescriptions saved yet</p>
            <p className="text-xs text-gray-500 mb-4">Upload your prescriptions for easy access</p>
            <Button onClick={() => fileRef.current?.click()} className="bg-orange-500 hover:bg-orange-600 rounded-xl" data-testid="first-upload-btn">
              <Camera className="w-4 h-4 mr-2" /> Upload Prescription
            </Button>
          </div>
        ) : (
          prescriptions.map(rx => (
            <div key={rx.id} className="bg-[#141428] rounded-2xl border border-white/10 overflow-hidden" data-testid={`prescription-${rx.id}`}>
              <div className="flex items-start gap-3 p-4">
                <div className="w-16 h-16 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {rx.file_url ? (
                    <img src={`${API}${rx.file_url}`} alt="Rx" className="w-full h-full object-cover" />
                  ) : (
                    <Image className="w-6 h-6 text-orange-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{rx.patient_name || 'Prescription'}</p>
                  {rx.doctor_name && <p className="text-xs text-gray-400 mt-0.5">Dr. {rx.doctor_name}</p>}
                  {rx.notes && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{rx.notes}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <Clock className="w-3 h-3 text-gray-500" />
                    <span className="text-xs text-gray-500">{formatDate(rx.created_at)}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      rx.status === 'active' ? 'bg-green-500/15 text-green-400' : 'bg-gray-500/15 text-gray-400'
                    }`}>{rx.status || 'active'}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(rx.id)}
                  className="p-2 rounded-lg hover:bg-red-500/15 text-gray-500 hover:text-red-400 transition-colors"
                  data-testid={`delete-rx-${rx.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {rx.file_url && (
                <a
                  href={`${API}${rx.file_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block border-t border-white/5 px-4 py-2.5 text-center text-xs text-orange-400 hover:bg-orange-500/5 transition-colors"
                >
                  View Full Prescription
                </a>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PrescriptionWallet;

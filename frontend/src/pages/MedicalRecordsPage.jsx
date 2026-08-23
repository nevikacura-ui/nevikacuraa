import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import ServiceHeader from '@/components/ServiceHeader';
import BottomNav from '@/components/BottomNav';
import { toast } from 'sonner';
import {
  ArrowLeft, Upload, FileText, Search, Filter, Star, StarOff,
  Trash2, Download, Share2, ChevronRight, Plus, X, FolderOpen,
  Image, File, Shield, Clock, User, Calendar, MoreVertical,
  CheckCircle, AlertCircle, Paperclip
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const CATEGORY_CONFIG = {
  prescription: { label: 'Prescription', color: '#F472B6', bg: '#F472B620' },
  lab_report: { label: 'Lab Report', color: '#3B82F6', bg: '#3B82F620' },
  discharge_summary: { label: 'Discharge', color: '#10B981', bg: '#10B98120' },
  imaging: { label: 'Imaging', color: '#F59E0B', bg: '#F59E0B20' },
  vaccination: { label: 'Vaccination', color: '#8B5CF6', bg: '#8B5CF620' },
  insurance: { label: 'Insurance', color: '#06B6D4', bg: '#06B6D420' },
  other: { label: 'Other', color: '#6B7280', bg: '#6B728020' },
};

const FILE_ICONS = {
  pdf: { icon: FileText, color: '#EF4444' },
  jpg: { icon: Image, color: '#3B82F6' },
  jpeg: { icon: Image, color: '#3B82F6' },
  png: { icon: Image, color: '#10B981' },
  webp: { icon: Image, color: '#8B5CF6' },
  doc: { icon: File, color: '#2563EB' },
  docx: { icon: File, color: '#2563EB' },
  default: { icon: File, color: '#6B7280' },
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const MedicalRecordsPage = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const user = authUser || (localStorage.getItem('patientInfo') ? JSON.parse(localStorage.getItem('patientInfo')) : null);
  const phone = user?.phone || localStorage.getItem('guestMobile') || localStorage.getItem('userPhone');

  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Upload form state
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadCategory, setUploadCategory] = useState('prescription');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadDoctor, setUploadDoctor] = useState('');
  const [uploadDate, setUploadDate] = useState('');

  const fetchRecords = useCallback(async () => {
    if (!phone) return;
    try {
      const params = new URLSearchParams();
      if (activeCategory !== 'all') params.append('category', activeCategory);
      if (searchQuery) params.append('search', searchQuery);
      const res = await fetch(`${API}/api/medical-records/list/${phone}?${params}`);
      const data = await res.json();
      if (data.success) setRecords(data.records || []);
    } catch { /* silent */ }
  }, [phone, activeCategory, searchQuery]);

  const fetchStats = useCallback(async () => {
    if (!phone) return;
    try {
      const res = await fetch(`${API}/api/medical-records/stats/${phone}`);
      const data = await res.json();
      if (data.success) setStats(data);
    } catch { /* silent */ }
  }, [phone]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchRecords(), fetchStats()]);
      setLoading(false);
    };
    load();
  }, [fetchRecords, fetchStats]);

  const handleUpload = async () => {
    if (!uploadFile) { toast.error('Please select a file'); return; }
    if (!phone) { toast.error('Please login first'); return; }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('phone', phone);
      formData.append('category', uploadCategory);
      formData.append('title', uploadTitle || uploadFile.name);
      formData.append('notes', uploadNotes);
      formData.append('doctor_name', uploadDoctor);
      formData.append('record_date', uploadDate);

      const res = await fetch(`${API}/api/medical-records/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success) {
        toast.success('Record uploaded successfully');
        setShowUpload(false);
        resetUploadForm();
        fetchRecords();
        fetchStats();
      } else {
        toast.error(data.detail || 'Upload failed');
      }
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadCategory('prescription');
    setUploadTitle('');
    setUploadNotes('');
    setUploadDoctor('');
    setUploadDate('');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record permanently?')) return;
    try {
      const res = await fetch(`${API}/api/medical-records/delete/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Record deleted');
        fetchRecords();
        fetchStats();
        setSelectedRecord(null);
      }
    } catch { toast.error('Delete failed'); }
  };

  const handleStar = async (id) => {
    try {
      const res = await fetch(`${API}/api/medical-records/star/${id}`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) {
        setRecords(prev => prev.map(r => r.id === id ? { ...r, is_starred: data.is_starred } : r));
      }
    } catch { /* silent */ }
  };

  const handleDownload = (id) => {
    window.open(`${API}/api/medical-records/download/${id}`, '_blank');
  };

  const getFileIcon = (type) => FILE_ICONS[type] || FILE_ICONS.default;

  if (!phone) {
    return (
      <div className="min-h-screen bg-[#0a0b14]">
        <ServiceHeader />
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <Shield className="w-16 h-16 text-white/20 mb-4" />
          <p className="text-white/60 text-center">Please login to access your Medical Records Vault</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0b14]">
      <ServiceHeader />

      <main className="max-w-lg mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center" data-testid="back-btn">
              <ArrowLeft className="w-4 h-4 text-white/60" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>Records Vault</h1>
              <p className="text-xs text-white/40">{stats?.total_records || 0} documents stored</p>
            </div>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95"
            style={{ background: 'linear-gradient(145deg, #14B8A6, #10B981)', color: '#fff' }}
            data-testid="upload-record-btn"
          >
            <Plus className="w-4 h-4" /> Upload
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-3 gap-2 mb-5" data-testid="vault-stats">
            <div className="rounded-2xl p-3 text-center" style={{ background: '#14B8A610', border: '1px solid #14B8A620' }}>
              <p className="text-lg font-bold text-white">{stats.total_records}</p>
              <p className="text-[10px] text-white/40">Total Files</p>
            </div>
            <div className="rounded-2xl p-3 text-center" style={{ background: '#F59E0B10', border: '1px solid #F59E0B20' }}>
              <p className="text-lg font-bold text-white">{stats.starred_records}</p>
              <p className="text-[10px] text-white/40">Starred</p>
            </div>
            <div className="rounded-2xl p-3 text-center" style={{ background: '#3B82F610', border: '1px solid #3B82F620' }}>
              <p className="text-lg font-bold text-white">{stats.total_size_mb}</p>
              <p className="text-[10px] text-white/40">MB Used</p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search records..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder:text-white/30 outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            data-testid="search-records-input"
          />
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide" data-testid="category-filters">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${activeCategory === 'all' ? 'bg-white text-black' : 'bg-white/5 text-white/50'}`}
          >
            All
          </button>
          {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
              style={{
                background: activeCategory === key ? cfg.color : 'rgba(255,255,255,0.05)',
                color: activeCategory === key ? '#fff' : 'rgba(255,255,255,0.5)',
              }}
            >
              {cfg.label}
              {stats?.category_counts?.[key] ? ` (${stats.category_counts[key]})` : ''}
            </button>
          ))}
        </div>

        {/* Records List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl skeleton" />)}
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-16" data-testid="empty-state">
            <FolderOpen className="w-14 h-14 text-white/10 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No records found</p>
            <p className="text-white/25 text-xs mt-1">Upload your first medical document</p>
          </div>
        ) : (
          <div className="space-y-2.5" data-testid="records-list">
            {records.map(record => {
              const fileIcon = getFileIcon(record.file_type);
              const catCfg = CATEGORY_CONFIG[record.category] || CATEGORY_CONFIG.other;
              return (
                <div
                  key={record.id}
                  className="rounded-2xl p-3.5 transition-all active:scale-[0.98] cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                  onClick={() => setSelectedRecord(record)}
                  data-testid={`record-item-${record.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${fileIcon.color}15` }}>
                      <fileIcon.icon className="w-5 h-5" style={{ color: fileIcon.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white truncate">{record.title}</p>
                        {record.is_starred && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400 flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: catCfg.bg, color: catCfg.color }}>{catCfg.label}</span>
                        <span className="text-[10px] text-white/30">{formatFileSize(record.file_size)}</span>
                        <span className="text-[10px] text-white/30">{record.record_date}</span>
                      </div>
                      {record.doctor_name && <p className="text-[10px] text-white/25 mt-1">Dr. {record.doctor_name}</p>}
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20 flex-shrink-0 mt-1" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" data-testid="upload-modal">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowUpload(false)} />
          <div className="relative w-full max-w-lg rounded-t-3xl p-6 pb-8 max-h-[85vh] overflow-y-auto" style={{ background: '#151621' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">Upload Record</h2>
              <button onClick={() => setShowUpload(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>

            {/* File Drop Zone */}
            <label
              className="block rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all mb-4 hover:border-teal-500/40"
              style={{ borderColor: uploadFile ? '#14B8A650' : 'rgba(255,255,255,0.1)', background: uploadFile ? '#14B8A608' : 'transparent' }}
              data-testid="file-drop-zone"
            >
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.txt,.csv,.heic"
                className="hidden"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
              {uploadFile ? (
                <div className="flex items-center justify-center gap-2">
                  <Paperclip className="w-5 h-5 text-teal-400" />
                  <span className="text-sm text-teal-300 truncate max-w-[200px]">{uploadFile.name}</span>
                  <span className="text-xs text-white/30">({formatFileSize(uploadFile.size)})</span>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <p className="text-sm text-white/40">Tap to select a file</p>
                  <p className="text-[10px] text-white/20 mt-1">PDF, Images, Documents (max 10MB)</p>
                </>
              )}
            </label>

            {/* Category */}
            <div className="mb-3">
              <label className="text-xs text-white/40 mb-1.5 block">Category</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setUploadCategory(key)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                    style={{
                      background: uploadCategory === key ? cfg.color : 'rgba(255,255,255,0.05)',
                      color: uploadCategory === key ? '#fff' : 'rgba(255,255,255,0.4)',
                    }}
                    data-testid={`category-btn-${key}`}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="mb-3">
              <label className="text-xs text-white/40 mb-1.5 block">Title</label>
              <input
                type="text"
                placeholder="e.g. Blood Test Report - Feb 2026"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder:text-white/20 outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                data-testid="upload-title-input"
              />
            </div>

            {/* Doctor & Date */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">Doctor</label>
                <input
                  type="text"
                  placeholder="Doctor name"
                  value={uploadDoctor}
                  onChange={(e) => setUploadDoctor(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder:text-white/20 outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  data-testid="upload-doctor-input"
                />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">Date</label>
                <input
                  type="date"
                  value={uploadDate}
                  onChange={(e) => setUploadDate(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder:text-white/20 outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  data-testid="upload-date-input"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="mb-5">
              <label className="text-xs text-white/40 mb-1.5 block">Notes (optional)</label>
              <textarea
                placeholder="Any additional notes..."
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder:text-white/20 outline-none resize-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                data-testid="upload-notes-input"
              />
            </div>

            <button
              onClick={handleUpload}
              disabled={!uploadFile || uploading}
              className="w-full py-3 rounded-2xl text-sm font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-40"
              style={{ background: 'linear-gradient(145deg, #14B8A6, #10B981)' }}
              data-testid="submit-upload-btn"
            >
              {uploading ? 'Uploading...' : 'Upload Record'}
            </button>
          </div>
        </div>
      )}

      {/* Record Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" data-testid="record-detail-modal">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedRecord(null)} />
          <div className="relative w-full max-w-lg rounded-t-3xl p-6 pb-8" style={{ background: '#151621' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white truncate pr-4">{selectedRecord.title}</h2>
              <button onClick={() => setSelectedRecord(null)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>

            <div className="space-y-3 mb-5">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: (CATEGORY_CONFIG[selectedRecord.category] || CATEGORY_CONFIG.other).bg, color: (CATEGORY_CONFIG[selectedRecord.category] || CATEGORY_CONFIG.other).color }}>
                  {(CATEGORY_CONFIG[selectedRecord.category] || CATEGORY_CONFIG.other).label}
                </span>
                <span className="text-xs text-white/30">{formatFileSize(selectedRecord.file_size)}</span>
                <span className="text-xs text-white/30">.{selectedRecord.file_type}</span>
              </div>
              {selectedRecord.doctor_name && (
                <div className="flex items-center gap-2 text-xs text-white/40">
                  <User className="w-3 h-3" /> Dr. {selectedRecord.doctor_name}
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-white/40">
                <Calendar className="w-3 h-3" /> {selectedRecord.record_date}
              </div>
              {selectedRecord.notes && (
                <p className="text-xs text-white/30 bg-white/5 rounded-xl p-3">{selectedRecord.notes}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleDownload(selectedRecord.id)}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all active:scale-95"
                style={{ background: '#3B82F615' }}
                data-testid="download-record-btn"
              >
                <Download className="w-5 h-5 text-blue-400" />
                <span className="text-[10px] text-blue-400">Download</span>
              </button>
              <button
                onClick={() => handleStar(selectedRecord.id)}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all active:scale-95"
                style={{ background: '#F59E0B15' }}
                data-testid="star-record-btn"
              >
                {selectedRecord.is_starred ? <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" /> : <StarOff className="w-5 h-5 text-yellow-400" />}
                <span className="text-[10px] text-yellow-400">{selectedRecord.is_starred ? 'Unstar' : 'Star'}</span>
              </button>
              <button
                onClick={() => handleDelete(selectedRecord.id)}
                className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all active:scale-95"
                style={{ background: '#EF444415' }}
                data-testid="delete-record-btn"
              >
                <Trash2 className="w-5 h-5 text-red-400" />
                <span className="text-[10px] text-red-400">Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default MedicalRecordsPage;

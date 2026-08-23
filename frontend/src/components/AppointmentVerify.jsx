import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle2, Calendar, Clock, MapPin, 
  Stethoscope, FlaskConical, Package, User, Phone, Shield, Edit3
} from 'lucide-react';
import { toast } from 'sonner';

const AppointmentVerify = ({
  type = 'diagyn',
  orderDetails = {},
  onConfirm,
  onEdit,
  isSubmitting = false,
}) => {
  const navigate = useNavigate();
  const [confirmed, setConfirmed] = useState(false);

  const normalizedType = type === 'orange' ? 'pharmacy' : type;

  const config = {
    diagyn: { name: 'DiaGyn', accent: '#0d9488', accentRgb: '13,148,136', icon: Stethoscope },
    mango: { name: 'Mango Labs', accent: '#16a34a', accentRgb: '22,163,74', icon: FlaskConical },
    pharmacy: { name: 'Orange Pharmacy', accent: '#ea580c', accentRgb: '234,88,12', icon: Package },
  }[normalizedType] || { name: 'DiaGyn', accent: '#0d9488', accentRgb: '13,148,136', icon: Stethoscope };

  const formatDate = (dateStr) => {
    if (!dateStr) return '---';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return dateStr; }
  };

  const getShortDate = (dateStr) => {
    if (!dateStr) return { day: '--', weekday: '---', month: '---', year: '' };
    try {
      const d = new Date(dateStr);
      return {
        day: d.getDate(),
        weekday: d.toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase(),
        month: d.toLocaleDateString('en-IN', { month: 'long' }).toUpperCase(),
        year: d.getFullYear()
      };
    } catch { return { day: '--', weekday: '---', month: '---', year: '' }; }
  };

  const handleConfirm = () => {
    setConfirmed(true);
    if (onConfirm) onConfirm();
  };

  const dt = getShortDate(orderDetails.date);

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #f0fdfa 0%, #e0f2fe 30%, #faf5ff 60%, #fdf2f8 100%)' }} data-testid="appointment-verify-page">
      <style>{`
        @keyframes orbFloat1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(25px,-15px) scale(1.08); } }
        @keyframes orbFloat2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-15px,25px) scale(1.04); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .v-fade { animation: fadeUp 0.45s ease-out both; }
        .glass-card {
          background: rgba(255,255,255,0.55);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.7);
          box-shadow: 0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.8);
        }
        .glass-card-accent {
          background: rgba(255,255,255,0.4);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.5);
          box-shadow: 0 2px 16px rgba(0,0,0,0.04);
        }
      `}</style>

      {/* Floating translucent orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-[280px] h-[280px] rounded-full blur-[100px] opacity-40"
          style={{ background: `rgba(${config.accentRgb},0.35)`, top: '-6%', right: '-8%', animation: 'orbFloat1 9s ease-in-out infinite' }} />
        <div className="absolute w-[220px] h-[220px] rounded-full blur-[80px] opacity-30"
          style={{ background: 'rgba(168,85,247,0.25)', bottom: '20%', left: '-6%', animation: 'orbFloat2 11s ease-in-out infinite' }} />
        <div className="absolute w-[160px] h-[160px] rounded-full blur-[70px] opacity-25"
          style={{ background: 'rgba(59,130,246,0.2)', top: '50%', right: '10%', animation: 'orbFloat1 14s ease-in-out infinite' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 p-4 flex items-center justify-between">
        <button onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full glass-card-accent flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
          data-testid="verify-back-btn">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-gray-400 text-sm font-semibold tracking-wide">{config.name}</span>
        <div className="w-10" />
      </header>

      {/* Content */}
      <div className="relative z-10 px-5 pb-36">
        {/* Title */}
        <div className="text-center pt-2 pb-5 v-fade">
          <div className="w-14 h-14 rounded-2xl glass-card mx-auto flex items-center justify-center mb-3">
            <CheckCircle2 className="w-7 h-7" style={{ color: config.accent }} />
          </div>
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">Verify your details</h1>
          <p className="text-gray-400 text-sm mt-1">Please review before confirming</p>
        </div>

        {/* Date + Time Card */}
        {orderDetails.date && (
          <div className="glass-card rounded-2xl p-4 mb-3 v-fade" style={{ animationDelay: '0.08s' }} data-testid="verify-date-card">
            <div className="flex items-center gap-4">
              {/* Date block */}
              <div className="flex items-center gap-3">
                <div className="text-xs font-bold tracking-widest text-gray-400" style={{ writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}>
                  {dt.month}
                </div>
                <div className="w-16 h-16 rounded-xl flex flex-col items-center justify-center" style={{ background: `rgba(${config.accentRgb},0.08)`, border: `1px solid rgba(${config.accentRgb},0.15)` }}>
                  <span className="text-xs font-bold" style={{ color: config.accent }}>{dt.weekday}</span>
                  <span className="text-2xl font-black text-gray-800 leading-none">{dt.day}</span>
                </div>
              </div>
              {/* Date text */}
              <div className="flex-1">
                <p className="font-bold text-gray-800">{formatDate(orderDetails.date).split(',')[0]}</p>
                <p className="text-gray-400 text-sm">{dt.month} {dt.year}</p>
                {orderDetails.time && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span className="font-semibold text-gray-700 text-sm">{orderDetails.time}</span>
                  </div>
                )}
              </div>
              <Calendar className="w-5 h-5 text-gray-300" />
            </div>
          </div>
        )}

        {/* Doctor + Clinic + Patient Card */}
        <div className="glass-card rounded-2xl p-4 space-y-4 v-fade" style={{ animationDelay: '0.16s' }}>
          {/* Doctor */}
          {orderDetails.doctor && (
            <div className="flex items-center gap-3" data-testid="verify-doctor">
              {orderDetails.doctorImage ? (
                <img src={orderDetails.doctorImage} alt="" className="w-12 h-12 rounded-xl object-cover border border-white/50" />
              ) : (
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `rgba(${config.accentRgb},0.1)`, border: `1px solid rgba(${config.accentRgb},0.15)` }}>
                  <Stethoscope className="w-5 h-5" style={{ color: config.accent }} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-gray-800 font-bold text-sm">{orderDetails.doctor}</p>
                {orderDetails.specialty && <p className="text-gray-400 text-xs">{orderDetails.specialty}</p>}
              </div>
              <Phone className="w-4 h-4 text-gray-300" />
            </div>
          )}

          {/* Clinic */}
          {orderDetails.clinic && (
            <div className="flex items-center gap-3" data-testid="verify-clinic">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(13,148,136,0.1)', border: '1px solid rgba(13,148,136,0.15)' }}>
                <MapPin className="w-5 h-5 text-teal-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-800 font-bold text-sm">{orderDetails.clinic}</p>
                {orderDetails.address && <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">{orderDetails.address}</p>}
              </div>
            </div>
          )}

          {/* Patient */}
          {orderDetails.patientName && (
            <div className="flex items-center gap-3" data-testid="verify-patient">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.15)' }}>
                <User className="w-5 h-5 text-violet-500" />
              </div>
              <div className="flex-1">
                <p className="text-gray-800 font-bold text-sm">{orderDetails.patientName}</p>
                {orderDetails.patientPhone && <p className="text-gray-400 text-xs">{orderDetails.patientPhone}</p>}
              </div>
              <Shield className="w-4 h-4 text-gray-200" />
            </div>
          )}

          {/* Tests/Items */}
          {(orderDetails.items?.length > 0 || orderDetails.tests?.length > 0) && (
            <>
              <div className="h-[1px] bg-gray-200/50" />
              <div>
                <p className="text-gray-400 text-[10px] uppercase tracking-wider font-medium mb-2">
                  {normalizedType === 'mango' ? 'Tests Selected' : 'Items'}
                </p>
                <div className="space-y-1.5">
                  {(orderDetails.items || orderDetails.tests)?.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <CheckCircle2 className="w-3 h-3 flex-shrink-0" style={{ color: config.accent }} />
                      <span className="text-gray-600">{typeof item === 'string' ? item : item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Edit details */}
        {onEdit && (
          <button onClick={onEdit} className="flex items-center justify-center gap-2 mt-4 mx-auto text-gray-400 hover:text-gray-600 transition-colors v-fade" style={{ animationDelay: '0.24s' }} data-testid="verify-edit-btn">
            <Edit3 className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Edit details</span>
          </button>
        )}
      </div>

      {/* Fixed Bottom Confirm */}
      <div className="fixed bottom-0 left-0 right-0 z-20 p-5" style={{ background: 'linear-gradient(to top, rgba(240,253,250,0.95) 60%, transparent)' }}>
        <button
          onClick={handleConfirm}
          disabled={isSubmitting || confirmed}
          className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-60"
          style={{ background: `linear-gradient(135deg, ${config.accent}, ${config.accent}dd)`, boxShadow: `0 8px 32px rgba(${config.accentRgb},0.3)` }}
          data-testid="verify-confirm-btn"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : confirmed ? (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Confirmed
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              Confirm
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AppointmentVerify;

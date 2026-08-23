import React from 'react';
import { useStaff } from './StaffContext';
import { COLORS } from './staffConstants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ClipboardList, Search, Loader2, User, Phone, Calendar
} from 'lucide-react';

const StaffHistoryView = () => {
  const s = useStaff();

  return (
    <div className="space-y-4">
      {/* Search Card */}
      <div className="rounded-2xl p-4 shadow-sm" style={{ background: COLORS.bgCard }}>
        <label className="text-xs font-bold mb-3 block" style={{ color: COLORS.textMuted }}>
          <ClipboardList className="w-4 h-4 inline mr-1.5" />
          PATIENT VISIT HISTORY
        </label>
        <div className="flex gap-2">
          <Input value={s.historyPhone} maxLength={10}
            onChange={(e) => s.setHistoryPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="Enter patient mobile (10 digits)"
            className="h-11 rounded-xl"
            style={{ background: COLORS.bgCardHover, color: COLORS.textLight, borderColor: 'transparent' }}
            onKeyDown={(e) => e.key === 'Enter' && s.lookupPatientHistory()}
            data-testid="history-phone-input"
          />
          <Button onClick={s.lookupPatientHistory} disabled={s.historyLoading || s.historyPhone.length < 10}
            className="h-11 px-5 rounded-xl font-bold"
            style={{ background: COLORS.gold }}
            data-testid="history-search-btn">
            {s.historyLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Results */}
      {s.historyData && (
        <>
          {/* Patient Info */}
          {s.historyData.patient ? (
            <div className="rounded-2xl p-4 shadow-sm" style={{ background: COLORS.cream }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: COLORS.gold + '25' }}>
                  <User className="w-6 h-6" style={{ color: COLORS.gold }} />
                </div>
                <div>
                  <p className="font-bold text-base" style={{ color: COLORS.textDark }}>{s.historyData.patient.name}</p>
                  <p className="text-xs" style={{ color: COLORS.textMuted }}>
                    <Phone className="w-3 h-3 inline mr-1" />{s.historyData.patient.phone}
                    {s.historyData.patient.gender && <span className="ml-2 capitalize">{s.historyData.patient.gender}</span>}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="text-center rounded-lg p-2" style={{ background: COLORS.teal + '15' }}>
                  <p className="text-lg font-bold" style={{ color: COLORS.teal }}>{s.historyData.total_visits}</p>
                  <p className="text-[10px]" style={{ color: COLORS.textMuted }}>Visits</p>
                </div>
                <div className="text-center rounded-lg p-2" style={{ background: COLORS.info + '15' }}>
                  <p className="text-lg font-bold" style={{ color: COLORS.info }}>{s.historyData.total_orders}</p>
                  <p className="text-[10px]" style={{ color: COLORS.textMuted }}>Orders</p>
                </div>
                <div className="text-center rounded-lg p-2" style={{ background: COLORS.gold + '15' }}>
                  <p className="text-lg font-bold" style={{ color: COLORS.gold }}>{s.historyData.wallet_transactions?.length || 0}</p>
                  <p className="text-[10px]" style={{ color: COLORS.textMuted }}>Wallet Txns</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 rounded-2xl" style={{ background: COLORS.bgCard }}>
              <User className="w-10 h-10 mx-auto mb-2" style={{ color: COLORS.textMuted }} />
              <p className="text-sm" style={{ color: COLORS.textMuted }}>No patient found with this number</p>
            </div>
          )}

          {/* Appointments List */}
          {s.historyData.appointments?.length > 0 && (
            <div className="rounded-2xl p-4 shadow-sm" style={{ background: COLORS.bgCard }}>
              <h3 className="text-xs font-bold mb-3" style={{ color: COLORS.textMuted }}>
                <Calendar className="w-3.5 h-3.5 inline mr-1.5" />
                APPOINTMENTS ({s.historyData.appointments.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {s.historyData.appointments.map((apt, i) => (
                  <div key={i} className="rounded-xl p-3 flex items-center justify-between"
                    style={{ background: COLORS.bgCardHover }}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate" style={{ color: COLORS.textLight }}>
                        {apt.doctor || 'N/A'}
                      </p>
                      <p className="text-[11px]" style={{ color: COLORS.textMuted }}>
                        {apt.date} &middot; {apt.time || 'N/A'} &middot; {apt.clinic || ''}
                        {apt.source && <> &middot; <span style={{ color: apt.source === 'WhatsApp' ? '#25D366' : apt.source === 'Staff' ? '#818CF8' : '#60A5FA' }}>{apt.source}</span></>}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-1 rounded-lg ml-2 flex-shrink-0"
                      style={{
                        background: apt.status === 'Completed' ? COLORS.teal + '20' : COLORS.gold + '20',
                        color: apt.status === 'Completed' ? COLORS.teal : COLORS.gold
                      }}>
                      {apt.status || 'N/A'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Orders List */}
          {(s.historyData.orders?.length > 0 || s.historyData.lab_orders?.length > 0) && (
            <div className="rounded-2xl p-4 shadow-sm" style={{ background: COLORS.bgCard }}>
              <h3 className="text-xs font-bold mb-3" style={{ color: COLORS.textMuted }}>
                ORDERS ({(s.historyData.orders?.length || 0) + (s.historyData.lab_orders?.length || 0)})
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {[...(s.historyData.orders || []), ...(s.historyData.lab_orders || [])].map((order, i) => (
                  <div key={i} className="rounded-xl p-3" style={{ background: COLORS.bgCardHover }}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium" style={{ color: COLORS.textLight }}>
                        {order.order_id || order.booking_id || `Order #${i + 1}`}
                      </p>
                      <span className="text-[10px] font-bold px-2 py-1 rounded-lg"
                        style={{ background: COLORS.info + '20', color: COLORS.info }}>
                        {order.status || 'N/A'}
                      </span>
                    </div>
                    <p className="text-[11px] mt-1" style={{ color: COLORS.textMuted }}>
                      {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}
                      {order.total && <span> &middot; &#8377;{order.total}</span>}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {s.historyData.patient && s.historyData.total_visits === 0 && s.historyData.total_orders === 0 && (
            <div className="text-center py-8 rounded-2xl" style={{ background: COLORS.bgCard }}>
              <ClipboardList className="w-10 h-10 mx-auto mb-2" style={{ color: COLORS.textMuted }} />
              <p className="text-sm" style={{ color: COLORS.textMuted }}>No visit or order history found</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StaffHistoryView;

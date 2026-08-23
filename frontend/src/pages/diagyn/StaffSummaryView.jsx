import React from 'react';
import { useStaff } from './StaffContext';
import { COLORS } from './staffConstants';
import { IndianRupee, Users } from 'lucide-react';

const StaffSummaryView = () => {
  const s = useStaff();

  return (
    <div className="space-y-4">
      {/* Today's Revenue */}
      <div className="rounded-2xl p-5 shadow-lg" style={{ background: COLORS.cream }}>
        <h3 className="text-sm font-medium" style={{ color: COLORS.textMuted }}>Today at {s.selectedClinic.replace(' Clinic', '')}</h3>
        <div className="text-4xl font-bold mt-2" style={{ color: COLORS.textDark }}>
          &#8377;{(s.dailySummary?.total_collection || 0).toLocaleString('en-IN')}
        </div>
        <p className="text-sm mt-1" style={{ color: COLORS.textMuted }}>{s.dailySummary?.total_patients || 0} patients</p>
      </div>

      {/* Weekly Stats */}
      <div className="rounded-2xl p-5 shadow-sm" style={{ background: COLORS.bgCard }}>
        <h3 className="font-bold mb-4" style={{ color: COLORS.textLight }}>This Week</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-4" style={{ background: COLORS.gold + '15' }}>
            <IndianRupee className="w-5 h-5 mb-2" style={{ color: COLORS.gold }} />
            <p className="text-2xl font-bold" style={{ color: COLORS.gold }}>
              &#8377;{(s.weeklySummary?.total_collection || 0).toLocaleString('en-IN')}
            </p>
            <p className="text-xs" style={{ color: COLORS.textMuted }}>Collection</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: COLORS.teal + '15' }}>
            <Users className="w-5 h-5 mb-2" style={{ color: COLORS.teal }} />
            <p className="text-2xl font-bold" style={{ color: COLORS.teal }}>{s.weeklySummary?.total_patients || 0}</p>
            <p className="text-xs" style={{ color: COLORS.textMuted }}>Patients</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffSummaryView;

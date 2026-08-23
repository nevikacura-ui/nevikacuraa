import React, { useState } from 'react';
import { useCart } from '@/context/CartContext';
import { Users, X, CheckCircle2, UserPlus, ChevronDown, ChevronUp } from 'lucide-react';

export default function FamilyMemberBooking({ variant = 'dark' }) {
  const {
    labCart,
    labMembers,
    addLabMember,
    updateLabMember,
    removeLabMember,
    assignAllTestsToMember,
    assignTestToMember,
    getTestMember,
  } = useCart();

  const [expanded, setExpanded] = useState(true);

  if (labCart.length === 0) return null;

  const isLight = variant === 'light';

  const styles = {
    container: isLight
      ? 'bg-white border border-[#D2DAD7] rounded-2xl'
      : 'bg-[#1a1a1a] border border-white/5 rounded-2xl',
    headerTitle: isLight ? 'text-[#1E293B]' : 'text-white',
    headerSub: isLight ? 'text-slate-500' : 'text-white/40',
    iconBg: isLight ? 'bg-green-100' : 'bg-green-500/20',
    iconColor: isLight ? 'text-green-600' : 'text-green-400',
    chevron: isLight ? 'text-slate-400' : 'text-white/40',
    cardBg: isLight ? 'bg-slate-50' : 'rgba(255,255,255,0.03)',
    cardBorder: isLight ? 'border-slate-200' : 'border-white/10',
    cardActiveBg: isLight ? 'bg-green-50' : 'rgba(16,185,129,0.08)',
    cardActiveBorder: isLight ? 'border-green-300' : 'rgba(16,185,129,0.3)',
    inputBg: isLight ? 'bg-white border-slate-200 text-[#1E293B] placeholder:text-slate-400' : 'bg-white/5 border-white/10 text-white placeholder:text-white/30',
    inputFocus: 'focus:border-green-500/50 focus:outline-none',
    removeBtn: isLight ? 'text-red-400 hover:text-red-500' : 'text-red-400/60 hover:text-red-400',
    selectAllActive: isLight
      ? 'bg-green-100 text-green-700 border border-green-300'
      : 'bg-green-500/20 text-green-400 border border-green-500/30',
    selectAllInactive: isLight
      ? 'bg-slate-100 text-slate-500 border border-slate-200 hover:text-slate-700 hover:border-slate-300'
      : 'bg-white/5 text-white/50 border border-white/10 hover:text-white/80 hover:border-white/20',
    chipActive: isLight
      ? 'bg-green-100 text-green-700 border border-green-300'
      : 'bg-green-500/20 text-green-400 border border-green-500/30',
    chipInactive: isLight
      ? 'bg-slate-50 text-slate-400 border border-slate-200 hover:border-slate-300'
      : 'bg-white/5 text-white/30 border border-white/8 hover:border-white/15',
    countText: isLight ? 'text-slate-400' : 'text-white/30',
    addBtnBorder: isLight
      ? 'border-dashed border-slate-300 text-slate-400 hover:text-green-600 hover:border-green-400'
      : 'border-dashed border-white/15 text-white/50 hover:text-green-400 hover:border-green-500/30',
  };

  return (
    <div className={`overflow-hidden ${styles.container}`} data-testid="family-member-booking">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left"
        data-testid="family-booking-toggle"
      >
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl ${styles.iconBg} flex items-center justify-center`}>
            <Users className={`w-5 h-5 ${styles.iconColor}`} />
          </div>
          <div>
            <h3 className={`font-semibold text-sm ${styles.headerTitle}`}>Book for Family Members</h3>
            <p className={`text-[11px] ${styles.headerSub}`}>
              {labMembers.length === 1
                ? 'Add name & age for the patient'
                : `${labMembers.length} members added`}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className={`w-4 h-4 ${styles.chevron}`} />
        ) : (
          <ChevronDown className={`w-4 h-4 ${styles.chevron}`} />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {labMembers.map((member, idx) => {
            const allAssigned =
              labCart.length > 0 &&
              labCart.every((t) => getTestMember(t.name) === member.id);
            const assignedCount = labCart.filter(
              (t) => getTestMember(t.name) === member.id
            ).length;

            return (
              <div
                key={member.id}
                className={`rounded-xl border overflow-hidden transition-all ${
                  allAssigned
                    ? `${styles.cardActiveBg} ${styles.cardActiveBorder}`
                    : `${styles.cardBg} ${styles.cardBorder}`
                }`}
                data-testid={`member-card-${member.id}`}
              >
                <div className="p-3 flex items-start gap-2">
                  <div className="flex-1 grid grid-cols-[1fr_80px] gap-2">
                    <input
                      type="text"
                      value={member.name}
                      onChange={(e) =>
                        updateLabMember(member.id, 'name', e.target.value)
                      }
                      placeholder={member.isDefault ? 'Your Name' : `Member ${idx + 1} Name`}
                      className={`h-10 px-3 rounded-lg text-sm border ${styles.inputBg} ${styles.inputFocus} transition-colors`}
                      data-testid={`member-name-${member.id}`}
                    />
                    <input
                      type="text"
                      value={member.age}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 3);
                        updateLabMember(member.id, 'age', val);
                      }}
                      placeholder="Age"
                      inputMode="numeric"
                      className={`h-10 px-3 rounded-lg text-sm border ${styles.inputBg} ${styles.inputFocus} transition-colors text-center`}
                      data-testid={`member-age-${member.id}`}
                    />
                  </div>
                  {!member.isDefault && (
                    <button
                      onClick={() => removeLabMember(member.id)}
                      className={`w-8 h-10 flex items-center justify-center ${styles.removeBtn} transition-colors`}
                      data-testid={`remove-member-${member.id}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="px-3 pb-3 flex items-center justify-between">
                  <button
                    onClick={() => assignAllTestsToMember(member.id)}
                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
                      allAssigned ? styles.selectAllActive : styles.selectAllInactive
                    }`}
                    data-testid={`select-all-${member.id}`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {allAssigned ? 'All tests assigned' : 'Select all tests'}
                  </button>
                  {assignedCount > 0 && !allAssigned && (
                    <span className={`text-[10px] ${styles.countText}`}>
                      {assignedCount}/{labCart.length} tests
                    </span>
                  )}
                </div>

                {labMembers.length > 1 && (
                  <div className="px-3 pb-3 flex flex-wrap gap-1.5">
                    {labCart.map((test) => {
                      const isAssigned = getTestMember(test.name) === member.id;
                      return (
                        <button
                          key={test.name}
                          onClick={() =>
                            assignTestToMember(test.name, isAssigned ? 'self' : member.id)
                          }
                          className={`text-[11px] px-2.5 py-1 rounded-full transition-all ${
                            isAssigned ? styles.chipActive : styles.chipInactive
                          }`}
                          data-testid={`assign-${test.name.replace(/\s+/g, '-')}-${member.id}`}
                        >
                          {test.name.length > 22 ? test.name.slice(0, 22) + '...' : test.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          <button
            onClick={addLabMember}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border ${styles.addBtnBorder} transition-all text-sm font-medium`}
            data-testid="add-family-member-btn"
          >
            <UserPlus className="w-4 h-4" />
            Add Family Member
          </button>
        </div>
      )}
    </div>
  );
}

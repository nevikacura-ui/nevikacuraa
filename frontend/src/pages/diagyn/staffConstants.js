// Shared constants for DiaGyn Staff Portal
export const COLORS = {
  bgDark: '#FAFAF8',
  bgCard: 'rgba(255,255,255,0.6)',
  bgCardHover: 'rgba(255,255,255,0.8)',
  cream: '#FFF8F0',
  creamDark: '#FFF0E0',
  creamText: '#1E293B',
  gold: '#E88D2A',
  goldLight: '#F5A623',
  goldDark: '#D4790F',
  teal: '#0D9488',
  tealDark: '#0F766E',
  tealLight: '#14B8A6',
  purple: '#7C3AED',
  textDark: '#0F172A',
  textLight: '#1E293B',
  textMuted: '#64748B',
  textFaded: '#64748B',
  danger: '#DC2626',
  warning: '#F59E0B',
  success: '#16A34A',
  info: '#2563EB',
  error: '#EF4444',
  divider: '#E2E8F0',
};

export const STATUS_STYLES = {
  'Booked': { bg: '#DBEAFE', text: '#2563EB', label: 'Booked' },
  'pending': { bg: '#DBEAFE', text: '#2563EB', label: 'Pending' },
  'CheckedIn': { bg: '#FEF3C7', text: '#D97706', label: 'Checked In' },
  'Checked In': { bg: '#FEF3C7', text: '#D97706', label: 'Checked In' },
  'WithDoctor': { bg: '#E0E7FF', text: '#6366F1', label: 'With Doctor' },
  'With Doctor': { bg: '#E0E7FF', text: '#6366F1', label: 'With Doctor' },
  'billing_pending': { bg: '#FEF3C7', text: '#F59E0B', label: 'Billing' },
  'Completed': { bg: '#D1FAE5', text: '#059669', label: 'Completed' },
  'completed': { bg: '#D1FAE5', text: '#059669', label: 'Done' },
  'Cancelled': { bg: '#FEE2E2', text: '#DC2626', label: 'Cancelled' },
  'cancelled': { bg: '#FEE2E2', text: '#DC2626', label: 'Cancelled' },
  'No Show': { bg: '#F3F4F6', text: '#6B7280', label: 'No Show' },
  'NoShow': { bg: '#F3F4F6', text: '#6B7280', label: 'No Show' },
};

export const TYPE_STYLES = {
  'SCHEDULED': { bg: '#DBEAFE', text: '#2563EB' },
  'WALK_IN': { bg: '#FEF3C7', text: '#D97706' },
  'EMERGENCY': { bg: '#FEE2E2', text: '#991B1B' },
};

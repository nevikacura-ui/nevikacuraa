/**
 * Shared Claymorphism style tokens for light-mode cards.
 * Import: import { clay } from '@/utils/clayStyles';
 * Usage: style={isDarkMode ? darkFallback : clay.card}
 */
export const clay = {
  card: {
    background: 'rgba(255,255,255,0.7)',
    border: '1px solid rgba(255,255,255,0.8)',
    borderRadius: '20px',
    boxShadow:
      '8px 8px 20px rgba(166,160,154,0.18), -6px -6px 16px rgba(255,255,255,0.85), inset 2px 2px 4px rgba(255,255,255,0.6), inset -1px -1px 3px rgba(0,0,0,0.02)',
  },
  cardSmall: {
    background: 'rgba(255,255,255,0.65)',
    border: '1px solid rgba(255,255,255,0.75)',
    borderRadius: '16px',
    boxShadow:
      '6px 6px 14px rgba(166,160,154,0.14), -4px -4px 10px rgba(255,255,255,0.8), inset 1px 1px 3px rgba(255,255,255,0.5)',
  },
  btn: {
    background: 'rgba(255,255,255,0.6)',
    border: '1px solid rgba(255,255,255,0.7)',
    borderRadius: '16px',
    boxShadow:
      '5px 5px 12px rgba(166,160,154,0.15), -4px -4px 10px rgba(255,255,255,0.8), inset 1px 1px 3px rgba(255,255,255,0.5)',
  },
  pill: {
    background: 'rgba(255,255,255,0.55)',
    borderRadius: '12px',
    boxShadow:
      '4px 4px 10px rgba(166,160,154,0.12), -3px -3px 8px rgba(255,255,255,0.7)',
  },
  header: {
    background: 'rgba(245,240,235,0.75)',
    backdropFilter: 'blur(24px) saturate(1.3)',
    WebkitBackdropFilter: 'blur(24px) saturate(1.3)',
    borderBottom: '1px solid rgba(255,255,255,0.5)',
    boxShadow: '0 4px 16px rgba(166,160,154,0.1)',
  },
  activePill: {
    background: 'rgba(255,255,255,0.8)',
    boxShadow:
      '5px 5px 12px rgba(166,160,154,0.15), -4px -4px 10px rgba(255,255,255,0.85), inset 1px 1px 2px rgba(255,255,255,0.5)',
    border: '1px solid rgba(255,255,255,0.7)',
  },
  banner: {
    background: 'rgba(255,255,255,0.5)',
    border: '1px solid rgba(255,255,255,0.65)',
    borderRadius: '20px',
    boxShadow:
      '6px 6px 16px rgba(166,160,154,0.14), -5px -5px 12px rgba(255,255,255,0.8), inset 1px 1px 3px rgba(255,255,255,0.5)',
  },
};

/** Quick theme helper: returns clay style for light, dark fallback otherwise */
export const clayIf = (isDark, darkStyle = {}) => (isDark ? darkStyle : clay.card);
export const claySmallIf = (isDark, darkStyle = {}) => (isDark ? darkStyle : clay.cardSmall);
export const clayBtnIf = (isDark, darkStyle = {}) => (isDark ? darkStyle : clay.btn);

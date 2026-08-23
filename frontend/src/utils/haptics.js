/**
 * Haptic Feedback Utilities
 * Context-specific tactile micro-interactions for premium feel
 */

// Check if haptic feedback is supported
export const isHapticSupported = () => {
  return 'vibrate' in navigator;
};

// Light tap - button clicks, switches
export const lightTap = () => {
  if (isHapticSupported()) navigator.vibrate(10);
};

// Medium tap - important actions
export const mediumTap = () => {
  if (isHapticSupported()) navigator.vibrate(25);
};

// Heavy tap - confirmations, navigation changes
export const heavyTap = () => {
  if (isHapticSupported()) navigator.vibrate(50);
};

// Success pattern - booking confirmed, payment success
export const successPattern = () => {
  if (isHapticSupported()) navigator.vibrate([15, 50, 30]);
};

// Error pattern - failed actions, validation errors
export const errorPattern = () => {
  if (isHapticSupported()) navigator.vibrate([50, 30, 50]);
};

// Selection change - tab switches, service changes
export const selectionTap = () => {
  if (isHapticSupported()) navigator.vibrate(15);
};

// --- Enhanced contextual patterns ---

// Booking confirmed — celebratory triple pulse
export const bookingConfirmed = () => {
  if (isHapticSupported()) navigator.vibrate([20, 60, 20, 60, 40]);
};

// Payment processing — slow heartbeat while waiting
export const paymentPulse = () => {
  if (isHapticSupported()) navigator.vibrate([30, 200, 30]);
};

// Queue advance — your turn is approaching
export const queueBuzz = () => {
  if (isHapticSupported()) navigator.vibrate([10, 30, 10, 30, 50]);
};

// Pull to refresh — rubber band feel
export const pullRefresh = () => {
  if (isHapticSupported()) navigator.vibrate([5, 10, 5, 10, 5, 10, 20]);
};

// Swipe action — card dismissed
export const swipeDismiss = () => {
  if (isHapticSupported()) navigator.vibrate([8, 15, 25]);
};

// Alert / notification — attention grabber
export const alertBuzz = () => {
  if (isHapticSupported()) navigator.vibrate([40, 80, 40, 80, 60]);
};

// Long press / hold — confirmation
export const holdConfirm = () => {
  if (isHapticSupported()) navigator.vibrate([10, 20, 10, 20, 10, 20, 50]);
};

export default {
  isHapticSupported,
  lightTap,
  mediumTap,
  heavyTap,
  successPattern,
  errorPattern,
  selectionTap,
  bookingConfirmed,
  paymentPulse,
  queueBuzz,
  pullRefresh,
  swipeDismiss,
  alertBuzz,
  holdConfirm,
};

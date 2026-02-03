/**
 * Haptic Feedback Utilities
 * Provides tactile feedback for user interactions
 */

// Check if haptic feedback is supported
export const isHapticSupported = () => {
  return 'vibrate' in navigator;
};

// Light tap - for button clicks, switches
export const lightTap = () => {
  if (isHapticSupported()) {
    navigator.vibrate(10);
  }
};

// Medium tap - for important actions
export const mediumTap = () => {
  if (isHapticSupported()) {
    navigator.vibrate(25);
  }
};

// Heavy tap - for confirmations, navigation changes
export const heavyTap = () => {
  if (isHapticSupported()) {
    navigator.vibrate(50);
  }
};

// Success pattern - for successful actions
export const successPattern = () => {
  if (isHapticSupported()) {
    navigator.vibrate([15, 50, 30]);
  }
};

// Error pattern - for errors
export const errorPattern = () => {
  if (isHapticSupported()) {
    navigator.vibrate([50, 30, 50]);
  }
};

// Selection change - for tab switches, service changes
export const selectionTap = () => {
  if (isHapticSupported()) {
    navigator.vibrate(15);
  }
};

export default {
  isHapticSupported,
  lightTap,
  mediumTap,
  heavyTap,
  successPattern,
  errorPattern,
  selectionTap
};

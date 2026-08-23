/**
 * Intercept sonner's toast and redirect to CuraNotification (Radial Pulse).
 * Call setupCuraToast() once at app init — all existing toast.success/error/etc.
 * calls across the codebase will automatically use the new UI.
 */
import { toast as sonnerToast } from 'sonner';
import { pushNotification } from '@/components/CuraNotification';

export function setupCuraToast() {
  // Store originals (in case we ever need fallback)
  const _origSuccess = sonnerToast.success;
  const _origError = sonnerToast.error;
  const _origInfo = sonnerToast.info;
  const _origWarning = sonnerToast.warning;
  const _origLoading = sonnerToast.loading;

  sonnerToast.success = (message, options = {}) => {
    return pushNotification('success', message, { duration: options?.duration || 2800, description: options?.description });
  };

  sonnerToast.error = (message, options = {}) => {
    return pushNotification('error', message, { duration: options?.duration || 3500, description: options?.description });
  };

  sonnerToast.info = (message, options = {}) => {
    return pushNotification('info', message, { duration: options?.duration || 2800, description: options?.description });
  };

  sonnerToast.warning = (message, options = {}) => {
    return pushNotification('warning', message, { duration: options?.duration || 3000, description: options?.description });
  };

  sonnerToast.loading = (message, options = {}) => {
    return pushNotification('loading', message, { duration: options?.duration || 4000, description: options?.description });
  };

  // Also intercept bare toast() calls (used as toast('message'))
  // We can't easily override the default export function, but most code uses toast.success etc.
}

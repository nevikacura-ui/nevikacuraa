import { useState, useEffect, useCallback } from 'react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Convert base64 URL-safe to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [subscription, setSubscription] = useState(null);

  // Check if push notifications are supported
  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
    
    if (supported && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Check current subscription status
  const checkSubscription = useCallback(async () => {
    if (!isSupported) return;
    
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      setIsSubscribed(!!sub);
      setSubscription(sub);
    } catch (err) {
      console.error('Error checking subscription:', err);
    }
  }, [isSupported]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (token = null) => {
    if (!isSupported) {
      setError('Push notifications not supported');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        setError('Notification permission denied');
        setIsLoading(false);
        return false;
      }

      // Get VAPID public key from server
      const vapidResponse = await fetch(`${API_URL}/api/push/vapid-public-key`);
      if (!vapidResponse.ok) {
        throw new Error('Failed to get VAPID key');
      }
      const { publicKey } = await vapidResponse.json();

      // Subscribe to push manager
      const registration = await navigator.serviceWorker.ready;
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      // Send subscription to server
      const headers = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/api/push/subscribe`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          endpoint: pushSubscription.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode.apply(null, new Uint8Array(pushSubscription.getKey('p256dh')))),
            auth: btoa(String.fromCharCode.apply(null, new Uint8Array(pushSubscription.getKey('auth'))))
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      setIsSubscribed(true);
      setSubscription(pushSubscription);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Subscribe error:', err);
      setError(err.message);
      setIsLoading(false);
      return false;
    }
  }, [isSupported]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!subscription) return false;

    setIsLoading(true);
    setError(null);

    try {
      // Unsubscribe from push manager
      await subscription.unsubscribe();

      // Remove from server
      await fetch(`${API_URL}/api/push/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {}
        })
      });

      setIsSubscribed(false);
      setSubscription(null);
      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Unsubscribe error:', err);
      setError(err.message);
      setIsLoading(false);
      return false;
    }
  }, [subscription]);

  // Send test notification
  const sendTestNotification = useCallback(async (token) => {
    if (!token) {
      setError('Authentication required');
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/api/push/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      return data.success;
    } catch (err) {
      console.error('Test notification error:', err);
      setError(err.message);
      return false;
    }
  }, []);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    sendTestNotification,
    checkSubscription
  };
}

export default usePushNotifications;

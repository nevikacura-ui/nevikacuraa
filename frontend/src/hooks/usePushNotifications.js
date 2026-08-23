import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { requestNotificationPermission, onForegroundMessage } from '@/lib/firebase';

const API = process.env.REACT_APP_BACKEND_URL;

export function usePushNotifications(userEmail) {
  const registered = useRef(false);
  const fcmToken = useRef(null);
  const [isSupported] = useState(() => 'Notification' in window && 'serviceWorker' in navigator);
  const [permission, setPermission] = useState(() => ('Notification' in window ? Notification.permission : 'denied'));
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const subscribe = useCallback(async () => {
    if (!isSupported) return false;
    setIsLoading(true);
    setError(null);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') { setError('Permission denied'); setIsLoading(false); return false; }

      const token = await requestNotificationPermission();
      if (token) {
        fcmToken.current = token;
        await fetch(`${API}/api/fcm/register-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, user_email: userEmail || null, device_info: navigator.userAgent }),
        });
        setIsSubscribed(true);
        setIsLoading(false);
        return true;
      }
    } catch (e) {
      setError(e.message);
      console.warn('Push subscribe failed:', e);
    }
    setIsLoading(false);
    return false;
  }, [isSupported, userEmail]);

  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      if (fcmToken.current) {
        await fetch(`${API}/api/fcm/unregister/${encodeURIComponent(fcmToken.current)}`, { method: 'DELETE' });
      }
      setIsSubscribed(false);
    } catch (e) {
      console.warn('Unsubscribe failed:', e);
    }
    setIsLoading(false);
    return true;
  }, []);

  const sendTestNotification = useCallback(async () => {
    if (!fcmToken.current) throw new Error('No FCM token');
    const res = await fetch(`${API}/api/fcm/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Nevika Cura',
        body: 'Your appointment reminder: Dr. Vikas Jha tomorrow at 10:30 AM',
        target_token: fcmToken.current,
        data: { type: 'test', click_action: '/' },
      }),
    });
    if (!res.ok) throw new Error('Send failed');
    return true;
  }, []);

  useEffect(() => {
    if (registered.current) return;
    registered.current = true;

    if (permission === 'granted' && isSupported) {
      requestNotificationPermission().then((token) => {
        if (token) {
          fcmToken.current = token;
          fetch(`${API}/api/fcm/register-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, user_email: userEmail || null, device_info: navigator.userAgent }),
          }).catch(() => {});
          setIsSubscribed(true);
        }
      }).catch(() => {});
    }

    const unsub = onForegroundMessage((payload) => {
      const { title, body } = payload.notification || {};
      if (title) {
        toast(title, { description: body, duration: 6000 });
      }
    });
    return unsub;
  }, [userEmail, permission, isSupported]);

  return { isSupported, permission, isSubscribed, isLoading, error, subscribe, unsubscribe, sendTestNotification };
}

export default usePushNotifications;

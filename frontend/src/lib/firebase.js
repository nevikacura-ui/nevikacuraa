import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let messagingInstance = null;

async function getMessagingInstance() {
  if (messagingInstance) return messagingInstance;
  if (typeof window === 'undefined') return null;
  try {
    const supported = await isSupported();
    if (supported) {
      messagingInstance = getMessaging(app);
    }
  } catch (e) {
    console.warn('Firebase Messaging not supported:', e);
  }
  return messagingInstance;
}

export async function requestNotificationPermission() {
  if (!('Notification' in window)) return null;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const msg = await getMessagingInstance();
  if (!msg) return null;

  try {
    // Use the existing service worker (no separate firebase-messaging-sw.js needed)
    const swReg = await navigator.serviceWorker.getRegistration('/');
    const token = await getToken(msg, {
      vapidKey: process.env.REACT_APP_VAPID_PUBLIC_KEY,
      serviceWorkerRegistration: swReg || undefined,
    });
    return token;
  } catch (err) {
    console.warn('FCM getToken failed:', err);
    return null;
  }
}

export function onForegroundMessage(callback) {
  getMessagingInstance().then((msg) => {
    if (msg) {
      onMessage(msg, (payload) => {
        callback(payload);
      });
    }
  });
  return () => {};
}

export { app };

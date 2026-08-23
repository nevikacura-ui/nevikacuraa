/* eslint-disable no-restricted-globals */
// Firebase Cloud Messaging Service Worker

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyA0o8yAtNq6ABkCrXKnXt4dqpzwGTGAezM",
  authDomain: "nevika-cura.firebaseapp.com",
  projectId: "nevika-cura",
  storageBucket: "nevika-cura.firebasestorage.app",
  messagingSenderId: "678463328429",
  appId: "1:678463328429:web:fb893ebf4970c121b63624",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  const notificationTitle = title || 'Nevika Cura';
  const notificationOptions = {
    body: body || 'You have a new notification',
    icon: '/logo192.png',
    badge: '/logo192.png',
    data: payload.data || {},
    vibrate: [100, 50, 100],
    actions: [
      { action: 'open', title: 'Open App' },
    ],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.link || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

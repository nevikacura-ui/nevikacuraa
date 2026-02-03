const CACHE_NAME = 'nevika-cura-v4';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/diagyn',
  '/mango',
  '/pharmacy',
  '/profile',
  '/admin',
  '/smart-reminders',
  '/staff-portal'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Nevika Cura SW: Installing v3...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Nevika Cura SW: Cache opened');
        return cache.addAll(urlsToCache);
      })
      .catch((err) => {
        console.log('Cache install failed:', err);
      })
  );
  // Force activation immediately
  self.skipWaiting();
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', (event) => {
  console.log('Nevika Cura SW: Activating...');
  event.waitUntil(
    Promise.all([
      // Clean old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Claim all clients immediately
      self.clients.claim()
    ])
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and API calls
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      })
  );
});

// ============ PUSH NOTIFICATION HANDLER ============
// This is the KEY for background notifications
self.addEventListener('push', (event) => {
  console.log('Nevika Cura SW: Push received in background!');
  
  let data = {
    title: 'Nevika Cura',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    url: '/'
  };
  
  // Parse push data
  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  // Notification options optimized for Android/iOS background delivery
  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/icon-72x72.png',
    image: data.image || null,
    vibrate: [100, 50, 100, 50, 100], // Alert pattern
    tag: data.tag || `nevika-${Date.now()}`, // Unique tag prevents grouping
    renotify: true, // Always alert even if same tag
    requireInteraction: true, // Keep notification visible until user interacts
    silent: false,
    timestamp: Date.now(),
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now(),
      type: data.type || 'general',
      notificationId: data.tag || `nevika-${Date.now()}`
    },
    actions: data.actions || [
      { action: 'open', title: '👁️ View', icon: '/icons/icon-72x72.png' },
      { action: 'dismiss', title: '✕ Dismiss' }
    ]
  };

  // CRITICAL: waitUntil keeps SW alive until notification is shown
  event.waitUntil(
    self.registration.showNotification(data.title, options)
      .then(() => {
        console.log('Nevika Cura SW: Notification displayed successfully');
      })
      .catch((err) => {
        console.error('Nevika Cura SW: Failed to show notification', err);
      })
  );
});

// ============ NOTIFICATION CLICK HANDLER ============
self.addEventListener('notificationclick', (event) => {
  console.log('Nevika Cura SW: Notification clicked', event.action);
  
  // Close the notification
  event.notification.close();

  // Handle dismiss action
  if (event.action === 'dismiss') {
    return;
  }

  // Get URL from notification data
  const urlToOpen = new URL(
    event.notification.data?.url || '/',
    self.location.origin
  ).href;

  // Open or focus the app window
  event.waitUntil(
    clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    }).then((windowClients) => {
      // Check if app is already open
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          // Navigate existing window to the URL
          return client.navigate(urlToOpen).then(() => client.focus());
        }
      }
      // No existing window, open new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// ============ NOTIFICATION CLOSE HANDLER ============
self.addEventListener('notificationclose', (event) => {
  console.log('Nevika Cura SW: Notification closed by user');
});

// ============ BACKGROUND SYNC (for offline actions) ============
self.addEventListener('sync', (event) => {
  console.log('Nevika Cura SW: Background sync triggered', event.tag);
  
  if (event.tag === 'medicine-reminder-sync') {
    event.waitUntil(
      // Sync pending medicine logs when back online
      fetch('/api/medicine-reminders/sync', { method: 'POST' })
        .then(response => response.json())
        .then(data => console.log('Sync completed:', data))
        .catch(err => console.log('Sync failed:', err))
    );
  }
});

// ============ PERIODIC BACKGROUND SYNC (for regular checks) ============
self.addEventListener('periodicsync', (event) => {
  console.log('Nevika Cura SW: Periodic sync', event.tag);
  
  if (event.tag === 'check-reminders') {
    event.waitUntil(
      // Check for upcoming reminders
      checkUpcomingReminders()
    );
  }
});

async function checkUpcomingReminders() {
  try {
    // This runs even when app is closed
    const response = await fetch('/api/medicine-reminders/upcoming');
    const data = await response.json();
    
    if (data.reminders && data.reminders.length > 0) {
      // Show notification for upcoming medicines
      for (const reminder of data.reminders) {
        await self.registration.showNotification('💊 Medicine Reminder', {
          body: `Time to take ${reminder.medicine_name}`,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-72x72.png',
          tag: `med-${reminder.id}`,
          renotify: true,
          requireInteraction: true,
          data: { url: '/smart-reminders' }
        });
      }
    }
  } catch (err) {
    console.log('Failed to check reminders:', err);
  }
}

// ============ MESSAGE HANDLER (for foreground/background communication) ============
self.addEventListener('message', (event) => {
  console.log('Nevika Cura SW: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'TEST_NOTIFICATION') {
    self.registration.showNotification('🔔 Test Notification', {
      body: 'Background notifications are working!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: 'test-' + Date.now(),
      renotify: true,
      data: { url: '/smart-reminders' }
    });
  }
});

console.log('Nevika Cura SW: Service Worker v3 loaded');

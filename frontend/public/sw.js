/* Service Worker for Nevika Cura PWA — Auto-update & cache management */
const CACHE_VERSION = 7;
const CACHE_NAME = `nevikacura-v${CACHE_VERSION}`;

const PRECACHE = [
  '/',
  '/manifest.json'
];

// Install: Precache essentials, activate immediately
self.addEventListener('install', (event) => {
  console.log(`[SW v${CACHE_VERSION}] Installing...`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()) // Force activate immediately
  );
});

// Activate: Purge ALL old caches, claim clients, notify about update
self.addEventListener('activate', (event) => {
  console.log(`[SW v${CACHE_VERSION}] Activating...`);
  event.waitUntil(
    caches.keys().then(names =>
      Promise.all(
        names.filter(n => n !== CACHE_NAME).map(n => {
          console.log(`[SW] Deleting old cache: ${n}`);
          return caches.delete(n);
        })
      )
    ).then(() => self.clients.claim())
     .then(() => {
       // Notify all open tabs about the update
       self.clients.matchAll({ type: 'window' }).then(clients => {
         clients.forEach(client => {
           client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
         });
       });
     })
  );
});

// Fetch: Network-first for everything (always fresh content)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // Skip API calls and third-party requests
  if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache fresh response for offline fallback
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() =>
        // Offline fallback
        caches.match(event.request).then(cached => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') return caches.match('/');
          return new Response('Offline', { status: 503 });
        })
      )
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  let data = { title: 'Nevika Cura', body: 'New notification', url: '/' };
  if (event.data) {
    try {
      const payload = event.data.json();
      if (payload.notification) {
        data.title = payload.notification.title || data.title;
        data.body = payload.notification.body || data.body;
      }
      if (payload.data) data.url = payload.data.link || payload.data.url || data.url;
      if (payload.title) data.title = payload.title;
      if (payload.body) data.body = payload.body;
    } catch { data.body = event.data.text(); }
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      tag: `nevika-${Date.now()}`,
      vibrate: [100, 50, 100],
      data: { url: data.url }
    })
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(wins => {
      for (const win of wins) {
        if (win.url.startsWith(self.location.origin)) return win.navigate(url).then(() => win.focus());
      }
      return self.clients.openWindow(url);
    })
  );
});

// Message handler: SKIP_WAITING, FORCE_UPDATE (cache nuke)
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'FORCE_UPDATE') {
    console.log('[SW] Force update: nuking all caches');
    caches.keys().then(names =>
      Promise.all(names.map(n => caches.delete(n)))
    ).then(() => {
      self.skipWaiting();
      self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(c => c.postMessage({ type: 'CACHE_CLEARED' }));
      });
    });
  }
});

console.log(`[SW v${CACHE_VERSION}] Loaded`);

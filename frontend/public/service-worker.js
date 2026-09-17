/* eslint-disable no-undef */
/* global clients */
const CACHE_VERSION = 13;
const CACHE_NAME = `nevika-cura-v${CACHE_VERSION}`;
const OFFLINE_CACHE = `nevika-offline-v${CACHE_VERSION}`;

// Core app shell to pre-cache
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/offline.html'
];

// Key pages to cache on first visit (stale-while-revalidate)
const CACHE_FIRST_PATHS = [
  '/pharmacy',
  '/appointments',
  '/diagyn',
  '/mango',
  '/order-tracking',
  '/login'
];

// Static assets - cache for longer
const STATIC_ASSET_PATTERNS = [
  /\.(?:js|css|woff2?|ttf|eot)$/,
  /\/icons\//,
  /\/static\//,
  /fonts\.googleapis\.com/,
  /fonts\.gstatic\.com/,
  /cdnjs\.cloudflare\.com/
];

// Install: Precache critical assets
self.addEventListener('install', (event) => {
  console.log(`Nevika Cura SW v${CACHE_VERSION}: Installing...`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => {
        console.log(`Nevika Cura SW v${CACHE_VERSION}: Installed, activating immediately`);
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error(`Nevika Cura SW v${CACHE_VERSION}: Install failed`, err);
      })
  );
});

// Activate: Purge ALL old caches and take control
self.addEventListener('activate', (event) => {
  console.log(`Nevika Cura SW v${CACHE_VERSION}: Activating...`);
  event.waitUntil(
    Promise.all([
      caches.keys().then((names) =>
        Promise.all(
          names.filter(n => n !== CACHE_NAME && n !== OFFLINE_CACHE).map(n => {
            console.log(`Nevika Cura SW: Deleting old cache: ${n}`);
            return caches.delete(n);
          })
        )
      ),
      self.clients.claim()
    ]).then(() => {
      console.log(`Nevika Cura SW v${CACHE_VERSION}: Activated, notifying clients`);
      self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
        });
      });
    })
  );
});

// Check if URL matches static asset patterns
function isStaticAsset(url) {
  return STATIC_ASSET_PATTERNS.some(pattern => pattern.test(url.href));
}

// Check if path is a key cacheable page
function isCacheablePage(pathname) {
  return CACHE_FIRST_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
}

// Fetch handler with tiered caching strategy
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip API calls entirely - always go to network
  if (url.pathname.startsWith('/api/')) return;

  // Skip external requests (except fonts/CDN which we cache)
  if (url.origin !== self.location.origin && !isStaticAsset(url)) return;

  // Strategy 1: Static assets - Cache First (fast, long-lived)
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => new Response('', { status: 503 }));
      })
    );
    return;
  }

  // Strategy 2: Key pages - Stale While Revalidate (fast + fresh)
  if (event.request.mode === 'navigate' && isCacheablePage(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const fetchPromise = fetch(event.request).then(response => {
          if (response.ok && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => {
          // Offline: serve cached version or app shell
          if (cached) return cached;
          return caches.match('/').then(shell => shell || caches.match('/offline.html'));
        });

        // Return cached immediately, update in background
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Strategy 3: Navigation - Network First with offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then(cached => {
            if (cached) return cached;
            return caches.match('/').then(shell => shell || caches.match('/offline.html'));
          });
        })
    );
    return;
  }

  // Strategy 4: Other same-origin requests - Network First
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(cached => {
          return cached || new Response('Offline', { status: 503 });
        });
      })
  );
});

// Push notifications (Firebase Cloud Messaging compatible)
self.addEventListener('push', (event) => {
  let data = { title: 'Nevika Cura', body: 'New notification', url: '/' };

  if (event.data) {
    try {
      const payload = event.data.json();
      if (payload.notification) {
        data.title = payload.notification.title || data.title;
        data.body = payload.notification.body || data.body;
      }
      if (payload.data) {
        data.url = payload.data.link || payload.data.url || data.url;
      }
      if (payload.title) data.title = payload.title;
      if (payload.body) data.body = payload.body;
      if (payload.url) data.url = payload.url;
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      tag: data.tag || `nevika-${Date.now()}`,
      vibrate: [100, 50, 100],
      data: { url: data.url || '/' }
    })
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windows) => {
      for (const win of windows) {
        if (win.url.startsWith(self.location.origin) && 'focus' in win) {
          return win.navigate(url).then(() => win.focus());
        }
      }
      return clients.openWindow(url);
    })
  );
});

// Message handler for forced updates
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'FORCE_UPDATE') {
    caches.keys().then(names => {
      Promise.all(names.map(name => caches.delete(name))).then(() => {
        self.skipWaiting();
        self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: 'CACHE_CLEARED' });
          });
        });
      });
    });
  }
});

console.log(`Nevika Cura SW v${CACHE_VERSION}: Loaded`);

const CACHE_NAME = 'nevika-cura-v5';

// Minimal cache for fast installation - only essential files
const PRECACHE_URLS = [
  '/',
  '/manifest.json'
];

// Install: Quick precache with minimal files for fast PWA install
self.addEventListener('install', (event) => {
  console.log('Nevika Cura SW v5: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => {
        console.log('Nevika Cura SW v5: Installed successfully');
        self.skipWaiting();
      })
      .catch((err) => {
        console.error('Nevika Cura SW v5: Install failed', err);
        self.skipWaiting();
      })
  );
});

// Activate: Clean old caches and take control immediately
self.addEventListener('activate', (event) => {
  console.log('Nevika Cura SW v5: Activating...');
  event.waitUntil(
    Promise.all([
      caches.keys().then((names) => 
        Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n)))
      ),
      self.clients.claim()
    ]).then(() => console.log('Nevika Cura SW v5: Activated'))
  );
});

// Fetch: Network-first for HTML/API, cache-first for assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // Skip API calls and external requests
  if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) return;
  
  // Network-first for navigation requests (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match('/') || caches.match(event.request))
    );
    return;
  }
  
  // Cache-first for static assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  let data = { title: 'Nevika Cura', body: 'New notification', url: '/' };
  
  if (event.data) {
    try { data = { ...data, ...event.data.json() }; } 
    catch { data.body = event.data.text(); }
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || `nevika-${Date.now()}`,
      renotify: true,
      requireInteraction: true,
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

// Message handler for skip waiting
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

console.log('Nevika Cura SW v5: Loaded');

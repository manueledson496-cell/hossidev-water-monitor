// Hossidev Water Monitor Service Worker (PWA, Push Notifications & Widget Sync)
const CACHE_NAME = 'hossidev-water-v2.5';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/favicon.svg',
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[SW] Cache addAll skipped optional assets:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event (Network-First with Cache Fallback for dynamic telemetry)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip API routes from static caching to ensure fresh real-time data
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;

        // If navigation request (e.g. reload or open app offline), fallback to index.html
        if (event.request.mode === 'navigate') {
          const indexCached = await caches.match('/index.html') || await caches.match('/');
          if (indexCached) return indexCached;
        }

        return new Response('Offline - Conteúdo indisponível', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' },
        });
      })
  );
});

// Push Notification Event (Handles Rich Alerts with Brand Icon, Vibration & Action Buttons)
self.addEventListener('push', (event) => {
  let data = {
    title: 'Hossidev - Alerta de Nível de Água',
    body: 'Atualização de status dos reservatórios recebida.',
    icon: '/icon.svg',
    badge: '/icon.svg',
    level: 50,
    tag: 'hossidev-alert',
  };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    image: data.image || undefined,
    vibrate: [200, 100, 200, 100, 400],
    tag: data.tag || 'hossidev-water-alert',
    renotify: true,
    requireInteraction: data.level <= 15, // Require user interaction if level is critical
    data: {
      url: data.url || '/',
      timestamp: Date.now(),
      tankId: data.tankId || 1,
    },
    actions: [
      { action: 'open_app', title: 'Abrir Painel Hossidev', icon: '/icon.svg' },
      { action: 'silence', title: 'Silenciar Alarme' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'silence') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Periodic Background Sync (Used by modern mobile widgets)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'hossidev-water-widget-update') {
    event.waitUntil(
      fetch('/api/telemetry/live')
        .then((res) => res.json())
        .then((data) => {
          // Broadcast to connected widgets / clients
          return self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
              client.postMessage({ type: 'WIDGET_TELEMETRY_UPDATE', payload: data });
            });
          });
        })
        .catch((err) => console.warn('[SW] Periodic sync widget error:', err))
    );
  }
});

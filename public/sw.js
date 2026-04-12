// Pangea Service Worker — Push Notifications + App Shell Cache
// This file MUST be in /public to be served at the root scope

const CACHE_NAME = 'pangea-v2';

// App shell: static assets to pre-cache for offline support
const APP_SHELL = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Install event — pre-cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// Activate event — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// Fetch event — network-first for API/auth, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // Network-first for API, auth, and dynamic pages
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return;

  // Cache-first for static files (icons, manifest, etc.)
  if (url.pathname.match(/\.(png|ico|svg|webp|woff2?|css|js)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  // Network-first with cache fallback for pages
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// Push event — received a push notification from the server
self.addEventListener('push', (event) => {
  let data = {
    title: 'Pangea',
    body: 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    url: '/dashboard',
    tag: 'pangea-notification',
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...data, ...payload };
    }
  } catch (e) {
    // If JSON parsing fails, use text
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/badge-72.png',
    tag: data.tag || 'pangea-notification',
    data: {
      url: data.url || '/dashboard',
    },
    actions: data.actions || [],
    vibrate: [100, 50, 100],
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click — open the relevant page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If there's already an open window, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Otherwise, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// Notification close event (optional analytics)
self.addEventListener('notificationclose', (event) => {
  // Could send analytics about dismissed notifications
});

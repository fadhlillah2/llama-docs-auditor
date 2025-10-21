// Contract Advisor RAG Service Worker
const CACHE_NAME = 'contract-advisor-v1';
const STATIC_CACHE = 'contract-advisor-static-v1';
const DYNAMIC_CACHE = 'contract-advisor-dynamic-v1';

// Static assets to cache for offline functionality
const STATIC_ASSETS = [
  '/',
  '/_next/static/css/',
  '/_next/static/chunks/',
  '/manifest.json',
  // Add other static assets as needed
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and external requests
  if (request.method !== 'GET' || url.origin !== location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        // Return cached response if available
        if (cachedResponse) {
          console.log('Service Worker: Serving from cache:', request.url);
          return cachedResponse;
        }

        // Network request for dynamic content
        return fetch(request)
          .then((response) => {
            // Cache successful responses
            if (response.ok) {
              const responseClone = response.clone();

              caches.open(DYNAMIC_CACHE)
                .then((cache) => {
                  console.log('Service Worker: Caching dynamic content:', request.url);
                  cache.put(request, responseClone);
                });
            }

            return response;
          })
          .catch(() => {
            // Return fallback for failed requests
            console.log('Service Worker: Network request failed, serving fallback');

            // Fallback page for HTML requests
            if (request.headers.get('accept')?.includes('text/html')) {
              return caches.match('/') || new Response('Offline', {
                status: 503,
                statusText: 'Service Unavailable'
              });
            }

            // Fallback response for other requests
            return new Response('Offline', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});

// Background sync for when app comes back online
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered:', event.tag);

  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background sync tasks
      // This could include syncing failed API calls, updating cache, etc.
      Promise.resolve()
    );
  }
});

// Push notifications (future enhancement)
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');

  const options = {
    body: event.data.text(),
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'contract-notification',
    renotify: true,
    requireInteraction: false,
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Contract Advisor', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Cleanup cache on message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_UPDATE') {
    caches.open(DYNAMIC_CACHE).then((cache) => {
      cache.keys().then((requests) => {
        requests.forEach((request) => {
          if (event.data.urls?.includes(request.url)) {
            cache.delete(request);
          }
        });
      });
    });
  }
});
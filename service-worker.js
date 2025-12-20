// Service Worker for Quick Capture Lists PWA
const CACHE_NAME = 'quick-capture-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/login.html',
  '/app.js',
  '/firebase-service.js',
  '/firebase-config.js',
  '/styles.css',
  '/manifest.json'
];

// Install event - cache files
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[ServiceWorker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Cache the fetched response for future offline use
          caches.open(CACHE_NAME).then(cache => {
            // Don't cache Firebase URLs or external resources
            if (!event.request.url.includes('firebasestorage') &&
                !event.request.url.includes('googleapis') &&
                !event.request.url.includes('gstatic')) {
              cache.put(event.request, responseToCache);
            }
          });

          return response;
        }).catch(() => {
          // Network failed, check if we have a cached fallback
          return caches.match('/index.html');
        });
      })
  );
});

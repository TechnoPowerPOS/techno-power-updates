const CACHE_NAME = 'techno-pos-cache-v2'; // Bumped version

const urlsToCache = [
  '/',
  '/index.html',
  // Local assets are cached on the fly by the fetch handler.
  // We explicitly cache third-party resources.
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&display=swap',
  'https://aistudiocdn.com/react@^19.2.0',
  'https://aistudiocdn.com/react-dom@^19.2.0',
  'https://aistudiocdn.com/react-router-dom@^7.9.4',
  'https://aistudiocdn.com/lucide-react@^0.545.0',
  'https://aistudiocdn.com/@google/genai@^1.23.0',
  'https://aistudiocdn.com/recharts@^3.2.1',
];

// Install event: open cache and add core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache, pre-caching core assets.');
        // cache.addAll is atomic: if one asset fails, the whole operation fails.
        // We add a catch to prevent the entire SW install from failing.
        return cache.addAll(urlsToCache).catch(error => {
          console.error('Failed to cache all initial resources during install:', error);
        });
      })
  );
});

// Fetch event: use a "Network falling back to cache" strategy
self.addEventListener('fetch', event => {
  // We only want to handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip caching for external APIs and Firebase
  const url = new URL(event.request.url);
  if (
    url.hostname.includes('googleapis.com') || 
    url.hostname.includes('firebaseapp.com') || 
    url.hostname.includes('firebase.io') ||
    url.hostname.includes('ipify.org')
  ) {
    return;
  }

  event.respondWith(
    // 1. Try to fetch from the network
    fetch(event.request)
      .then(networkResponse => {
        // 1a. If successful, cache the response and return it
        // This keeps the cache up-to-date.
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      })
      .catch(() => {
        // 1b. If the network request fails (e.g., offline), try the cache
        return caches.match(event.request).then(cachedResponse => {
          // 2a. If there's a match in the cache, return it
          if (cachedResponse) {
            return cachedResponse;
          }
          // 2b. If not in cache and network failed, the browser will handle the failure.
        });
      })
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

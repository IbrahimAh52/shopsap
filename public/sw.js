const CACHE_NAME = 'shopsnap-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/dashboard',
  '/dashboard/new'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('Failed to cache some initial files during install:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Cache-first fallback to network for static files, Network-first fallback to cache for pages/APIs
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip API routes, Supabase calls, and dev server sockets
  if (url.pathname.startsWith('/api') || url.hostname.includes('supabase') || url.pathname.includes('_next') || url.pathname.includes('webpack')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful requests for later offline use
        if (response.status === 200 && event.request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if network is unavailable
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Optional: Return a custom offline fallback page for document requests
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/dashboard');
          }
        });
      })
  );
});

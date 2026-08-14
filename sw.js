const CACHE_NAME = 'court-iq-v8';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fdmw4tuurixhnt6l.public.blob.vercel-storage.com/icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(URLS_TO_CACHE.map(url => new Request(url, {credentials: 'same-origin'})));
      })
      .catch((err) => {
        console.error('Failed to cache:', err);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Для навигационных запросов (страниц)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html', {ignoreSearch: true})
        .then((response) => {
          if (response) {
            return response;
          }
          // Если не в кэше, загружаем с сервера
          return fetch(event.request).catch(() => {
            // Если и это не сработало, возвращаем fallback
            return caches.match('./index.html');
          });
        })
    );
    return;
  }

  // Для остальных запросов (ресурсов)
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Возвращаем из кэша если есть
        if (response) {
          return response;
        }
        
        // Иначе загружаем из сети
        return fetch(event.request).then((networkResponse) => {
          // Не кэшируем CORS запросы к другим доменам
          if (!event.request.url.startsWith('http') || 
              !networkResponse || 
              networkResponse.status !== 200 || 
              networkResponse.type !== 'basic') {
            return networkResponse;
          }
          
          // Клонируем ответ для кэширования
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          
          return networkResponse;
        }).catch(() => {
          // Если ничего не сработало
          return new Response('Network error', {
            status: 408,
            headers: {'Content-Type': 'text/plain'}
          });
        });
      })
  );
});
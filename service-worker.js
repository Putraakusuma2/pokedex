const CACHE_NAME = 'pokedex-cache-v1';
const urlsToCache = [
  // '/', // Hapus root agar tidak error
  'app.js',
  'index.html',
  'pokedex.js',
  'manifest.json',
  'images/pokeball.png'
  // CDN file will be cached dynamically if needed
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      for (const url of urlsToCache) {
        try {
          await cache.add(url);
        } catch (err) {
          console.error('Gagal cache:', url, err);
        }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keyList =>
      Promise.all(
        keyList.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    }).catch(() => caches.match('/pokedex.html'))
  );
});



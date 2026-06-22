const CACHE_NAME = 'fire-study-motivation-pwa-v11';
const APP_SHELL = [
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/pdfs/')) return;
  if (url.pathname.includes('/audio/')) return;

  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetchAndCache(request))
  );
});

async function networkFirst(request) {
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response && response.status === 200) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || caches.match('./');
  }
}

async function fetchAndCache(request) {
  const response = await fetch(request);
  if (!response || response.status !== 200) return response;
  const copy = response.clone();
  caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
  return response;
}

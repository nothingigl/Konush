const SHELL_CACHE = 'turkce-duo-shell-v1';
const CONTENT_CACHE = 'turkce-duo-content-v1';
const AUDIO_CACHE = 'turkce-duo-audio-v1';

const PRECACHE_URLS = [
  '/',
  '/offline',
  '/manifest.webmanifest',
  '/tr',
  '/en',
  '/tr/units/1-1-food-and-drinks',
  '/en/units/1-1-learn-basic-phrases',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  const allowed = new Set([SHELL_CACHE, CONTENT_CACHE, AUDIO_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.map((key) => (!allowed.has(key) ? caches.delete(key) : undefined))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Audio clips: Cache-first in separate audio cache
  if (url.pathname.startsWith('/audio/')) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          void cache.put(request, response.clone());
        }
        return response;
      }),
    );
    return;
  }

  // Static Next.js bundles & icons: Cache-first
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.open(SHELL_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          void cache.put(request, response.clone());
        }
        return response;
      }),
    );
    return;
  }

  // Navigation & RSC requests: Network-first with cache fallback and /offline page fallback
  event.respondWith(
    fetch(request)
      .then(async (response) => {
        if (response.ok) {
          const cache = await caches.open(CONTENT_CACHE);
          void cache.put(request, response.clone());
        }
        return response;
      })
      .catch(async () => {
        const cachedContent = await caches.match(request);
        if (cachedContent) return cachedContent;

        if (request.mode === 'navigate') {
          const offlineFallback = await caches.match('/offline');
          if (offlineFallback) return offlineFallback;
        }

        return new Response('Offline', { status: 503 });
      }),
  );
});

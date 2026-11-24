const SHELL_CACHE = 'konus-shell-v2';
const CONTENT_CACHE = 'konus-content-v2';
const AUDIO_CACHE = 'konus-audio-v2';
const MAX_AUDIO_CACHE_ENTRIES = 800;

const PRECACHE_URLS = [
  '/',
  '/offline',
  '/manifest.webmanifest',
  '/tr',
  '/en',
  '/tr/units/1-1-food-and-drinks',
  '/en/units/1-1-learn-basic-phrases',
];

async function safeCachePut(cache, request, response) {
  try {
    await cache.put(request, response);
  } catch {
    // Gracefully ignore QuotaExceededError so offline playback never crashes
  }
}

async function trimAudioCacheIfNeeded(cache) {
  try {
    const keys = await cache.keys();
    if (keys.length <= MAX_AUDIO_CACHE_ENTRIES) return;
    const toDelete = keys.slice(0, keys.length - MAX_AUDIO_CACHE_ENTRIES);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
  } catch {
    // Ignore eviction errors
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => undefined)),
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
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

  // Audio clips: Cache-first in dedicated audio cache with size control
  if (url.pathname.startsWith('/audio/')) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          await safeCachePut(cache, request, response.clone());
          void trimAudioCacheIfNeeded(cache);
        }
        return response;
      }),
    );
    return;
  }

  // Static Next.js bundles, icons & character SVGs: Cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/characters/')
  ) {
    event.respondWith(
      caches.open(SHELL_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          await safeCachePut(cache, request, response.clone());
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
          await safeCachePut(cache, request, response.clone());
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

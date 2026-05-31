const CACHE = 'movie-kingdom-v3';
const SHELL = ['./'];

const BLOCKED_DOMAINS = [
  'doubleclick.net','googlesyndication.com','adservice.google.com',
  'popads.net','popcash.net','exoclick.com','trafficjunky.com',
  'juicyads.com','hilltopads.com','ero-advertising.com',
  'adnium.com','plugrush.com','tsyndicate.com','adspyglass.com',
  'clickaine.com','propellerads.com','adsterra.com','coinzilla.io'
];

self.addEventListener('install', e => {
  // Force this new SW to activate immediately, don't wait
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL))
  );
});

self.addEventListener('activate', e => {
  // Delete ALL old caches immediately on activation
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => {
        console.log('[SW] Deleting old cache:', k);
        return caches.delete(k);
      }))
    ).then(() => self.clients.claim()) // take control of all open tabs immediately
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Block known ad networks
  if (BLOCKED_DOMAINS.some(d => url.includes(d))) {
    e.respondWith(new Response('', { status: 200 }));
    return;
  }

  // For same-origin requests: network-first so updates always come through,
  // fall back to cache only if offline
  if (url.startsWith(self.location.origin)) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          // Update cache with fresh response
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request)) // offline fallback
    );
  }
});

const CACHE = 'movie-kingdom-v2';
const SHELL = ['./'];

// Known ad/redirect domains to block at the network level
const BLOCKED_DOMAINS = [
  'doubleclick.net','googlesyndication.com','adservice.google.com',
  'popads.net','popcash.net','exoclick.com','trafficjunky.com',
  'juicyads.com','hilltopads.com','ero-advertising.com',
  'adnium.com','plugrush.com','tsyndicate.com','adspyglass.com',
  'clickaine.com','propellerads.com','adsterra.com','coinzilla.io'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Block known ad network requests — return empty response
  if (BLOCKED_DOMAINS.some(d => url.includes(d))) {
    e.respondWith(new Response('', { status: 200 }));
    return;
  }

  // Block non-navigation requests to suspicious patterns
  if (e.request.mode === 'navigate') {
    const dest = new URL(url);
    // If something tries to navigate the top frame away from our origin, intercept
    if (dest.origin !== self.location.origin) {
      // Let it go — we handle this in the page-level blocker
      // but don't cache it
      return;
    }
  }

  // Cache-first for same-origin (app shell)
  if (url.startsWith(self.location.origin)) {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }))
    );
  }
});

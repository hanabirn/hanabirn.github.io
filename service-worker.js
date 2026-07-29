const CACHE_NAME = 'hanabi-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/base.css',
  '/css/sakura.css',
  '/css/seasons.css',
  '/css/stars.css',
  '/css/header.css',
  '/css/nav.css',
  '/css/quiz.css',
  '/css/music.css',
  '/css/osu.css',
  '/css/games.css',
  '/css/about.css',
  '/css/guestbook.css',
  '/css/guide.css',
  '/css/widgets.css',
  '/css/responsive.css',
  '/css/theme.css',
  '/js/i18n.js',
  '/js/quiz.js',
  '/js/osu.js',
  '/js/games.js',
  '/js/seasons.js',
  '/js/guestbook.js',
  '/js/widgets.js',
  '/js/theme.js',
  '/icons/web-app-manifest-192x192.png',
  '/icons/web-app-manifest-512x512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(r => {
      const clone = r.clone();
      caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      return r;
    }).catch(() => caches.match(e.request))
  );
});

const CACHE_NAME = 'hanabi-v14';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/base.css',
  '/css/sakura.css',
  '/css/particles.css',
  '/css/stars.css',
  '/css/header.css',
  '/css/nav.css',
  '/css/quiz.css',
  '/css/music.css',
  '/css/games.css',
  '/css/about.css',
  '/css/guestbook.css',
  '/css/guide.css',
  '/css/widgets.css',
  '/css/responsive.css',
  '/css/theme.css',
  '/js/i18n.js',
  '/i18n/zh.js',
  '/i18n/en.js',
  '/i18n/ja.js',
  '/i18n/ko.js',
  '/i18n/ru.js',
  '/i18n/fr.js',
  '/i18n/es.js',
  '/i18n/de.js',
  '/js/quiz.js',
  '/js/games.js',
  '/js/particles.js',
  '/js/guestbook.js',
  '/js/feedback.js',
  '/js/widgets.js',
  '/js/theme.js',
  '/js/header-anim.js',
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

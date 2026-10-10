const CACHE_NAME = 'hanabi-v40';
const ASSETS = [
  '/',
  '/index.html',
  '/privacy.html',
  '/manifest.json',
  '/css/base.css',
  '/css/header.css',
  '/css/nav.css',
  '/css/quiz.css',
  '/css/about.css',
  '/css/guestbook.css',
  '/css/notes.css',
  '/css/widgets.css',
  '/css/mascot.css',
  '/css/home.css',
  '/css/path.css',
  '/css/practice.css',
  '/css/account.css',
  '/css/dict.css',
  '/css/alphabet.css',
  '/css/grammar.css',
  '/css/reading.css',
  '/css/tour.css',
  '/css/rails.css',
  '/css/assistant.css',
  '/css/responsive.css',
  '/css/theme.css',
  '/js/i18n.js',
  '/js/speech.js',
  '/i18n/zh.js',
  '/i18n/zh-Hans.js',
  '/i18n/en.js',
  '/i18n/ja.js',
  '/i18n/ko.js',
  '/i18n/ru.js',
  '/i18n/fr.js',
  '/i18n/es.js',
  '/i18n/de.js',
  '/js/quiz.js',
  '/js/path.js',
  '/js/dict.js',
  '/js/alphabet-data.js',
  '/js/alphabet.js',
  '/js/grammar.js',
  '/js/reading.js',
  '/js/updates.js',
  '/js/tour.js',
  '/js/rails.js',
  '/js/assistant.js',
  '/js/home.js',
  '/js/practice.js',
  '/js/account.js',
  '/js/guestbook.js',
  '/js/notes.js',
  '/js/feedback.js',
  '/js/widgets.js',
  '/js/theme.js',
  '/js/mascot.js',
  '/images/mascot/body.webp',
  '/images/mascot/blush.webp',
  '/images/mascot/eyes_open.webp',
  '/images/mascot/eyes_closed.webp',
  '/images/mascot/mouth_smile.webp',
  '/images/mascot/mouth_closed.webp',
  '/js/privacy.js',
  '/icons/web-app-manifest-192x192.png',
  '/icons/web-app-manifest-512x512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())
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
  if (!e.request.url.startsWith('http')) return; // skip chrome-extension:// etc. — Cache API only supports http(s)
  // Same-origin files are revalidated with the server (a cheap 304 when
  // unchanged) instead of taken from the browser's HTTP cache, which GitHub
  // Pages lets hold a file for 10 minutes — otherwise "reload for the new
  // version" could still serve the old CSS/JS. Navigations keep their own
  // request, and cross-origin requests (CDN, fonts, Sheets) are untouched.
  const sameOrigin = new URL(e.request.url).origin === self.location.origin;
  const req = sameOrigin && e.request.mode !== 'navigate'
    ? new Request(e.request, { cache: 'no-cache' })
    : e.request;
  e.respondWith(
    fetch(req).then(r => {
      const clone = r.clone();
      caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      return r;
    }).catch(() => caches.match(e.request))
  );
});

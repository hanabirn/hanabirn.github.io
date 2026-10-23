const CACHE_NAME = 'hanabi-v47';
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
  '/css/friends.css',
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
  '/css/listening.css',
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
  '/js/topic-levels-data.js',
  '/js/quiz.js',
  '/js/learnlang.js',
  '/js/path.js',
  '/js/dict.js',
  '/js/alphabet-data.js',
  '/js/alphabet.js',
  '/js/grammar.js',
  '/js/reading.js',
  '/js/reading-exam.js',
  '/js/listening.js',
  '/js/updates.js',
  '/js/tour.js',
  '/js/rails.js',
  '/js/assistant.js',
  '/js/home.js',
  '/js/practice.js',
  '/js/account.js',
  '/js/guestbook.js',
  '/js/friends.js',
  '/js/push.js',
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
  // version" could still serve the old CSS/JS (or, for a navigation, the old
  // page). Cross-origin requests (CDN, fonts, Sheets) are untouched.
  const sameOrigin = new URL(e.request.url).origin === self.location.origin;
  const fresh = !sameOrigin ? fetch(e.request)
    : e.request.mode === 'navigate' ? fetch(e.request, { cache: 'no-cache' })
    : fetch(new Request(e.request, { cache: 'no-cache' }));
  e.respondWith(
    fresh.then(r => {
      const clone = r.clone();
      caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      return r;
    }).catch(() => caches.match(e.request))
  );
});

// 每日提醒 and friends' 🔔 (js/push.js, worker/assistant/src/push.js): show the notification,
// and a tap opens the site (or the tab already open) at the page it is about
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch {}
  e.waitUntil(self.registration.showNotification(d.title || 'Hanabi', {
    body: d.body || '',
    icon: '/icons/web-app-manifest-192x192.png',
    badge: '/icons/web-app-manifest-192x192.png',
    tag: d.tag || 'hanabi',
    data: { url: d.url || '/' }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || '/', self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const open = list.find(c => new URL(c.url).origin === self.location.origin);
    if (open) { open.focus(); return open.navigate ? open.navigate(url) : null; }
    return self.clients.openWindow(url);
  }));
});

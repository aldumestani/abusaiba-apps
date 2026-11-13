/* يعمل التطبيق دون إنترنت بعد أول فتح. custom.json (تعديلات المعلم) يُجلب من الشبكة أولاً ليصل أي تحديث. */
const CACHE = 'guardians-11146f40c65b';
const FILES = ["./", "fonts/cairo-arabic-400-normal.woff2", "fonts/cairo-arabic-700-normal.woff2", "fonts/cairo-arabic-900-normal.woff2", "fonts/cairo-latin-400-normal.woff2", "fonts/cairo-latin-700-normal.woff2", "icon-192.png", "icon-512.png", "icon.png", "index.html", "instagram.png", "js/app.js", "js/art.js", "js/codes.js", "js/content-1.js", "js/content-2.js", "js/content-3.js", "js/content-4.js", "js/content-5.js", "js/content-6.js", "js/content.js", "js/qrcode.js", "js/sw-register.js", "letterhead.png", "manifest.webmanifest", "sounds/badge.mp3", "sounds/correct.mp3", "sounds/defeat.mp3", "sounds/hit.mp3", "sounds/music.mp3", "sounds/pop.mp3", "sounds/tap.mp3", "sounds/tick.mp3", "sounds/whoosh.mp3", "sounds/win.mp3", "sounds/wrong.mp3", "style.css"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k.split('-')[0] === CACHE.split('-')[0]).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.endsWith('/custom.json')) {
    e.respondWith(fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); } return r; }).catch(() => caches.match(e.request).then(r => r || new Response('null', { status: 404 }))));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request)));
});

/* يعمل التطبيق دون إنترنت بعد أول فتح. custom.json (تعديلات المعلم) يُجلب من الشبكة أولاً ليصل أي تحديث. */
const CACHE = 'coder-91f0bbf8e4aa';
const FILES = ["./", "fonts/cairo-arabic-400-normal.woff2", "fonts/cairo-arabic-700-normal.woff2", "fonts/cairo-arabic-900-normal.woff2", "fonts/cairo-latin-400-normal.woff2", "fonts/cairo-latin-700-normal.woff2", "icon-192.png", "icon-512.png", "icon.png", "index.html", "js/app.js", "js/codes.js", "js/content-1.js", "js/content-2.js", "js/content-3.js", "js/content-4.js", "js/content-5.js", "js/content.js", "js/runners.js", "js/sw-register.js", "letterhead.png", "manifest.webmanifest", "style.css", "vendor/skulpt-stdlib.js", "vendor/skulpt.min.js"];
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

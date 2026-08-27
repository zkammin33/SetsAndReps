const CACHE = 'lift-v4';
const FILES = [
  './',
  './index.html',
  './workouts.html',
  './exercises.html',
  './log.html',
  './backup.html',
  './manifest.json',
  './css/styles.css',
  './js/app.js',
  './js/exercises.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // ignoreSearch: ./log.html?w=<id> must still hit the cached ./log.html offline.
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request))
  );
});

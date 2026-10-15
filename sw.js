// DrDer-Sudoku sw.js
// Service Worker متوافق مع GitHub Pages (مسار فرعي /DrDer-Sudoku/).
// يخزّن ملفات التطبيق الأساسية ويعمل دون اتصال.

var CACHE_VERSION = 'drder-sudoku-v2';
var CACHE_NAME = CACHE_VERSION;

// نحسب المسار الأساسي من موقع الـ Service Worker نفسه.
// هذا يضمن أن الروابط تعمل سواء نُشر التطبيق في جذر النطاق أو في مسار فرعي.
var SCOPE_URL = self.registration && self.registration.scope
  ? self.registration.scope
  : self.location.href.replace(/sw\.js(\?.*)?$/, '');

var APP_SHELL = [
  SCOPE_URL,
  SCOPE_URL + 'index.html',
  SCOPE_URL + 'style.css',
  SCOPE_URL + 'engine.js',
  SCOPE_URL + 'storage.js',
  SCOPE_URL + 'app.js',
  SCOPE_URL + 'manifest.json',
  SCOPE_URL + '192.png',
  SCOPE_URL + '512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL);
    }).then(function () {
      return self.skipWaiting();
    }).catch(function (error) {
      return caches.delete(CACHE_NAME).then(function () {
        throw error;
      }, function () {
        throw error;
      });
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      var toDelete = [];
      for (var i = 0; i < keys.length; i++) {
        if (keys[i] !== CACHE_NAME) toDelete.push(keys[i]);
      }
      return Promise.all(toDelete.map(function (key) {
        return caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;

  var url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return;
  }

  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then(function (cached) {
      if (cached) return cached;

      return fetch(request).then(function (response) {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        var responseClone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(request, responseClone).catch(function () {});
        }).catch(function () {});
        return response;
      }).catch(function () {
        return caches.match(SCOPE_URL + 'index.html').then(function (fallback) {
          if (fallback) return fallback;
          return new Response('', { status: 504, statusText: 'Offline' });
        });
      });
    })
  );
});

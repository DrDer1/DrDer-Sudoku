// DrDer-Sudoku sw.js
// Service Worker لتخزين ملفات التطبيق الأساسية وتشغيله دون اتصال.

var CACHE_VERSION = 'drder-sudoku-v3';
var CACHE_NAME = CACHE_VERSION;

var APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './engine.js',
  './storage.js',
  './app.js',
  './manifest.json',
  './192.png',
  './512.png'
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
        return caches.match('./index.html').then(function (fallback) {
          if (fallback) return fallback;
          return new Response('', { status: 504, statusText: 'Offline' });
        });
      });
    })
  );
});

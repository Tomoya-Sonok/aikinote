// Minimal Service Worker for PWA installability
// オフラインキャッシュは行わず、ホーム画面追加（A2HS）のみを有効化する
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});

// Minimal Service Worker for PWA installability
// オフラインキャッシュは行わず、ホーム画面追加（A2HS）のみを有効化する。
// 以前は PWA インストール条件のために何もしない fetch ハンドラを置いていたが、
// 現行のブラウザでは不要になっており、全リクエストで Service Worker の起動を
// 待たせるだけなので置かない。
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

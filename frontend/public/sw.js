// Minimal Service Worker for PWA installability
// オフラインキャッシュは行わず、ホーム画面追加（A2HS）のみを有効化する
// fetch ハンドラの存在が PWA インストール条件を満たす
// respondWith を呼ばないことでブラウザのデフォルト動作に委譲する
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", () => {
  // no-op: PWA installability requires a fetch handler to exist
});

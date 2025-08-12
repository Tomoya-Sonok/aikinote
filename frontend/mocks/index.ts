async function initMocks() {
  // 開発環境以外では何もしない
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  // サーバーサイド（Node.js環境）の場合
  if (typeof window === "undefined") {
    const { server } = await import("./server");
    server.listen();
  }
  // クライアントサイド（ブラウザ環境）の場合
  else {
    const { worker } = await import("./browser");
    await worker.start();
  }
}

initMocks();

// このファイルはアプリケーションのどこかで一度だけインポートされるようにします
export {};

"use client";

import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("Global error", error);
  }, [error]);

  return (
    <html lang="ja">
      <body>
        <main style={{ padding: "2rem" }}>
          <h1>エラーが発生しました</h1>
          <p>{error.message}</p>
          <button type="button" onClick={reset}>
            再試行する
          </button>
        </main>
      </body>
    </html>
  );
}

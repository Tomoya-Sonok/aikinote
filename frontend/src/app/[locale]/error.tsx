"use client";

import { useEffect } from "react";

interface LocaleErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function LocaleError({ error, reset }: LocaleErrorProps) {
  useEffect(() => {
    console.error("Locale boundary error", error);
  }, [error]);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>エラーが発生しました</h1>
      <p>{error.message}</p>
      <button type="button" onClick={reset}>
        再試行する
      </button>
    </div>
  );
}

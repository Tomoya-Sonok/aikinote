"use client";

import { useEffect } from "react";

export const MSWComponent = () => {
  useEffect(() => {
    // ブラウザ環境かつ開発モードの場合のみMSWを初期化
    if (
      typeof window !== "undefined" &&
      process.env.NODE_ENV === "development"
    ) {
      // msw/browserからworkerを動的にインポートして起動
      import("@/mocks/browser").then(({ worker }) => {
        worker.start();
      });
    }
  }, []);

  return null;
};

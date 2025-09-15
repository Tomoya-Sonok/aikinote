"use client";

import { useEffect } from "react";

export const MSWProvider = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    // プロダクションでは何もしない
    if (process.env.NODE_ENV !== "development") return;

    // 開発環境でのみMSWを初期化
    const initMSW = async () => {
      try {
        if (typeof window !== "undefined") {
          const { worker } = await import("@/mocks/browser");
          await worker.start({
            onUnhandledRequest: "bypass",
          });
          console.log("MSW started successfully");
        }
      } catch (error) {
        console.error("Failed to start MSW:", error);
      }
    };

    initMSW();
  }, []);

  return <>{children}</>;
};

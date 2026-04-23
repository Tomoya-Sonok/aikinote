"use client";

import { useEffect, useState } from "react";

/**
 * navigator.onLine を監視してオンライン状態をリアクティブに返す。
 * オフライン時の UI 抑止（submit ボタン付近の注意書き・disable 判定等）に使う。
 *
 * SSR 時は true を返す（hydration mismatch を避けるため、初期値は online）。
 * マウント直後に実際の navigator.onLine を反映する。
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

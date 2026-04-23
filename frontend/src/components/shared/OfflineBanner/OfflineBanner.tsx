"use client";

import { useEffect, useState } from "react";
import styles from "./OfflineBanner.module.css";

/**
 * ネットワーク切断時に画面上部へ表示するバナー。
 * navigator.onLine の変化を監視し、TanStack Query のキャッシュから表示が続く前提で
 * 「オフライン中」の可視フィードバックを提供する。
 */
export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    setIsOffline(!navigator.onLine);

    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <output className={styles.banner} aria-live="polite">
      オフラインです。キャッシュ済みの内容を表示しています。
    </output>
  );
}

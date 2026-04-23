"use client";

import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import styles from "./OfflineHint.module.css";

/**
 * submit ボタン付近にインライン表示するオフライン注意書き。
 * 常駐の OfflineBanner（画面上部・固定）とは別に、フォーム内での予告用として使う。
 * オンライン時は何も描画しない。
 */
export function OfflineHint() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;
  return (
    <p className={styles.hint} role="note">
      オフライン中です。ネットワーク接続後に送信してください。
    </p>
  );
}

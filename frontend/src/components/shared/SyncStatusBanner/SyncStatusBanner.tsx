"use client";

import { ArrowsClockwiseIcon, WarningIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  addSyncStatusListener,
  type SyncStatusPayload,
} from "@/lib/api/native-bridge";
import { useIsNativeApp } from "@/lib/hooks/useIsNativeApp";
import styles from "./SyncStatusBanner.module.css";

/**
 * ネイティブアプリ限定: 同期エンジン (PR4 + PR6) の進捗バナー。
 *
 * 表示条件:
 *   - 同期が走り始めて running になったとき
 *   - failed のとき
 *   - completed 後、しばらく (3秒) 表示してから自動で消える
 *
 * Web ブラウザでは isNative=false なので何も表示しない。
 */
export function SyncStatusBanner() {
  const isNative = useIsNativeApp();
  const t = useTranslations("syncStatus");
  const [status, setStatus] = useState<SyncStatusPayload | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isNative) return;

    const unsubscribe = addSyncStatusListener((next) => {
      setStatus(next);
      if (next.state === "running" || next.state === "failed") {
        setVisible(true);
      } else if (next.state === "completed") {
        setVisible(true);
        // 3 秒で消す
        window.setTimeout(() => setVisible(false), 3000);
      } else {
        setVisible(false);
      }
    });
    return unsubscribe;
  }, [isNative]);

  if (!isNative || !visible || !status) return null;

  const message = (() => {
    if (status.state === "running") return t("running");
    if (status.state === "completed") return t("completed");
    if (status.state === "failed")
      return status.error ? `${t("failed")} (${status.error})` : t("failed");
    return null;
  })();
  if (!message) return null;

  const isError = status.state === "failed";
  return (
    <output
      className={`${styles.banner} ${isError ? styles.error : ""}`}
      aria-live="polite"
    >
      {isError ? (
        <WarningIcon size={16} weight="bold" aria-hidden="true" />
      ) : (
        <ArrowsClockwiseIcon
          size={16}
          weight="regular"
          aria-hidden="true"
          className={status.state === "running" ? styles.spinning : ""}
        />
      )}
      <span className={styles.message}>{message}</span>
    </output>
  );
}

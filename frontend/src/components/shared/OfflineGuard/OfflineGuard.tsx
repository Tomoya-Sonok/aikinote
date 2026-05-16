"use client";

import { WifiSlashIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import styles from "./OfflineGuard.module.css";

interface OfflineGuardProps {
  /** 再試行ボタン押下時の処理。未指定なら window.location.reload() */
  onRetry?: () => void;
}

/**
 * ネットワーク未接続時にコンテンツの代わりに表示するガード画面。
 *
 * 統計・カレンダーなどの「サーバー必須」機能でオフライン状態のときに使う。
 * 「ひとりで」のページ作成・編集・閲覧は SQLite ベースのオフライン対応が
 * 入るため、こちらの guard は使わない (Native かつオフラインでも動作する)。
 */
export function OfflineGuard({ onRetry }: OfflineGuardProps) {
  const t = useTranslations("offlineGuard");

  const handleRetry = useCallback(() => {
    if (onRetry) {
      onRetry();
      return;
    }
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }, [onRetry]);

  return (
    <output className={styles.container} aria-live="polite">
      <WifiSlashIcon
        size={64}
        weight="light"
        color="var(--text-light)"
        aria-hidden="true"
      />
      <p className={styles.message}>{t("message")}</p>
      <button
        type="button"
        className={styles.retryButton}
        onClick={handleRetry}
      >
        {t("retry")}
      </button>
    </output>
  );
}

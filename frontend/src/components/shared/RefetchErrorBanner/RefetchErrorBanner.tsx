"use client";

import styles from "./RefetchErrorBanner.module.css";

type Props = {
  /** 再取得を試みるコールバック。ユーザーがタップした時に呼ばれる */
  onRetry?: () => void;
};

/**
 * リスト系の画面で、キャッシュ表示中だが最新データの取得に失敗している時に表示する警告。
 * オフライン時には別途 OfflineBanner が出るが、「オンラインでサーバが不安定」「タイムアウト」
 * など純粋な fetch 失敗も伝えるためのコンポーネント。
 */
export function RefetchErrorBanner({ onRetry }: Props) {
  return (
    <output className={styles.banner}>
      <span className={styles.text}>⚠️ 最新情報の取得に失敗しました</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={styles.retryButton}
          aria-label="再読み込み"
        >
          再試行
        </button>
      )}
    </output>
  );
}

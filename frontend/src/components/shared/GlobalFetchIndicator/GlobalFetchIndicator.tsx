"use client";

import { useIsFetching } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import styles from "./GlobalFetchIndicator.module.css";

// 一瞬で終わる取得ではバーを出さない（点滅して逆に「重い」印象になるため）
const SHOW_DELAY_MS = 300;

/**
 * まだ表示するデータが無い取得（初回ロード）の間だけ、画面上部に細いバーを出す。
 * キャッシュ済みデータの裏での再取得・通知バッジのポーリング・prefetch では出さない。
 * それらを対象にすると「一定時間ごとにローディングが入る」と感じられるため。
 */
export function GlobalFetchIndicator() {
  const initialFetchingCount = useIsFetching({
    predicate: (query) => query.state.data === undefined,
  });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (initialFetchingCount === 0) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [initialFetchingCount]);

  if (!visible) return null;

  return (
    <div className={styles.container} aria-hidden="true">
      <div className={styles.bar} />
    </div>
  );
}

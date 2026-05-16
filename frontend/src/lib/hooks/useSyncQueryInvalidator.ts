"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { addSyncStatusListener } from "@/lib/api/native-bridge";
import { useIsNativeApp } from "@/lib/hooks/useIsNativeApp";

// Pull で更新されうる「ひとりで」関連 TanStack Query の prefix 一覧。
// invalidateQueries は prefix match (exact: false がデフォルト) で動くので、
// 各フックの完全 queryKey (userId 等の suffix 付き) も網羅される。
const PERSONAL_SYNC_QUERY_KEYS: ReadonlyArray<readonly string[]> = [
  ["training-pages"],
  ["training-pages-unfiltered-count"],
  ["training-tags"],
  ["training-categories"],
  ["training-stats"],
  ["page-detail"],
  ["page-attachments"],
];

/**
 * Native (Expo WebView) で同期エンジンが Pull を含む sync を完了した際、
 * 「ひとりで」関連の TanStack Query キャッシュをまとめて invalidate する hook。
 *
 * 目的:
 *   起動時の race condition で発生する「Web 側が SQLite 空キャッシュを表示し続ける」
 *   現象を解消する。Pull 完了 (PERSONAL_SYNC_STATUS: completed) を契機に refetch を促す。
 *
 * 配線:
 *   SyncStatusBanner 内で 1 度だけ呼び出すことを想定 (banner は layout に常駐)。
 *   push-only scope は Pull が走っていないので invalidate しない。
 */
export function useSyncQueryInvalidator() {
  const isNative = useIsNativeApp();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isNative) return;
    return addSyncStatusListener((status) => {
      if (status.state !== "completed") return;
      if (status.scope === "push-only") return;
      for (const queryKey of PERSONAL_SYNC_QUERY_KEYS) {
        queryClient.invalidateQueries({ queryKey: [...queryKey] });
      }
    });
  }, [isNative, queryClient]);
}

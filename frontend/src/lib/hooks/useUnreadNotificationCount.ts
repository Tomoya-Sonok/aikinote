"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  getUnreadNotificationCount,
  getUnreadNotificationPostIds,
} from "@/lib/api/client";

// ネイティブアプリ同梱の WebView/バックグラウンド動作を考慮し、SP でのバッテリー・帯域を優先して長めに設定。
// タブ復帰直後は `refetchOnWindowFocus: true` で即反映されるので、polling 間隔を延長しても体感差は小さい。
const POLLING_INTERVAL_MS = 120_000;

export const unreadNotificationCountQueryKey = (userId: string | undefined) =>
  ["unread-notification-count", userId] as const;

export const unreadReplyPostIdsQueryKey = (userId: string | undefined) =>
  ["unread-reply-post-ids", userId] as const;

export function useUnreadNotificationCount(userId: string | undefined): number {
  const query = useQuery<number, Error>({
    queryKey: unreadNotificationCountQueryKey(userId),
    enabled: !!userId,
    queryFn: () => getUnreadNotificationCount(),
    refetchInterval: POLLING_INTERVAL_MS,
    refetchIntervalInBackground: false,
    // タブ復帰直後に次の polling を待たず即反映したいので、通知系はフォーカス時 refetch を明示的に有効化
    refetchOnWindowFocus: true,
  });

  return query.data ?? 0;
}

export function useUnreadReplyPostIds(userId: string | undefined): Set<string> {
  const query = useQuery<string[], Error>({
    queryKey: unreadReplyPostIdsQueryKey(userId),
    enabled: !!userId,
    queryFn: () => getUnreadNotificationPostIds(),
    refetchInterval: POLLING_INTERVAL_MS,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  return useMemo(() => new Set(query.data ?? []), [query.data]);
}

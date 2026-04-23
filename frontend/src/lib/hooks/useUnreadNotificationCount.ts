"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  getUnreadNotificationCount,
  getUnreadNotificationPostIds,
} from "@/lib/api/client";

const POLLING_INTERVAL_MS = 60_000;

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
  });

  return useMemo(() => new Set(query.data ?? []), [query.data]);
}

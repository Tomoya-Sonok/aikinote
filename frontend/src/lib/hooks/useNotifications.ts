"use client";

import { type InfiniteData, useInfiniteQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { getNotifications } from "@/lib/api/client";

export type NotificationTab = "all" | "reply" | "favorite";

export interface NotificationItemData {
  id: string;
  type: string;
  recipient_user_id: string;
  actor_user_id: string;
  post_id: string | null;
  reply_id: string | null;
  is_read: boolean;
  created_at: string;
  actor: {
    id: string;
    username: string;
    profile_image_url: string | null;
  } | null;
  post_preview: string | null;
  reply_is_deleted: boolean | null;
  reply_deleted_at: string | null;
}

interface UseNotificationsReturn {
  notifications: NotificationItemData[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  isRefetchError: boolean;
}

interface NotificationsPage {
  items: NotificationItemData[];
  next_offset: number | null;
}

const NOTIFICATIONS_FETCH_LIMIT = 20;

export const notificationsQueryKey = (
  userId: string | undefined,
  tab: NotificationTab,
) => ["notifications", userId, tab] as const;

export function useNotifications(
  tab: NotificationTab,
  userId: string | undefined,
): UseNotificationsReturn {
  const query = useInfiniteQuery<
    NotificationsPage,
    Error,
    InfiniteData<NotificationsPage>,
    ReturnType<typeof notificationsQueryKey>,
    number
  >({
    queryKey: notificationsQueryKey(userId, tab),
    enabled: !!userId,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      if (!userId) return { items: [], next_offset: null };
      const typeFilter = tab === "all" ? undefined : tab;
      const result = await getNotifications({
        limit: NOTIFICATIONS_FETCH_LIMIT,
        offset: pageParam,
        type: typeFilter,
      });
      const items =
        result.success && result.data
          ? (result.data as NotificationItemData[])
          : [];
      return {
        items,
        next_offset:
          items.length >= NOTIFICATIONS_FETCH_LIMIT
            ? pageParam + items.length
            : null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.next_offset ?? undefined,
  });

  const notifications = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );

  const loadMore = useCallback(() => {
    if (!query.hasNextPage || query.isFetchingNextPage) return;
    void query.fetchNextPage();
  }, [query]);

  return {
    notifications,
    isLoading: !userId ? false : query.isLoading,
    isLoadingMore: query.isFetchingNextPage,
    hasMore: !!query.hasNextPage,
    loadMore,
    isRefetchError: query.isError && !!query.data,
  };
}

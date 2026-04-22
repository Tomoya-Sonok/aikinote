"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
}

const NOTIFICATIONS_FETCH_LIMIT = 20;

export function useNotifications(
  tab: NotificationTab,
  userId: string | undefined,
): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<NotificationItemData[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  const prevTabRef = useRef(tab);

  const fetchNotifications = useCallback(
    async (offset: number, append: boolean) => {
      if (!userId) return;

      try {
        const typeFilter = tab === "all" ? undefined : tab;
        const result = await getNotifications({
          limit: NOTIFICATIONS_FETCH_LIMIT,
          offset,
          type: typeFilter,
        });

        const items =
          result.success && result.data
            ? (result.data as NotificationItemData[])
            : [];

        setNotifications((prev) => (append ? [...prev, ...items] : items));
        offsetRef.current = offset + items.length;
        setHasMore(items.length >= NOTIFICATIONS_FETCH_LIMIT);
      } catch {
        setHasMore(false);
      }
    },
    [userId, tab],
  );

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    if (prevTabRef.current !== tab) {
      prevTabRef.current = tab;
      setNotifications([]);
      offsetRef.current = 0;
      setHasMore(true);
    }

    setIsLoading(true);
    fetchNotifications(0, false).finally(() => setIsLoading(false));
  }, [userId, tab, fetchNotifications]);

  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    fetchNotifications(offsetRef.current, true).finally(() =>
      setIsLoadingMore(false),
    );
  }, [isLoadingMore, hasMore, fetchNotifications]);

  return { notifications, isLoading, isLoadingMore, hasMore, loadMore };
}

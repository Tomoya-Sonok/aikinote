"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getUnreadNotificationCount,
  getUnreadNotificationPostIds,
} from "@/lib/api/client";

const POLLING_INTERVAL_MS = 60_000;

export function useUnreadNotificationCount(userId: string | undefined): number {
  const [count, setCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCount = useCallback(async () => {
    if (!userId) return;
    const c = await getUnreadNotificationCount();
    setCount(c);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setCount(0);
      return;
    }

    void fetchCount();

    intervalRef.current = setInterval(() => {
      void fetchCount();
    }, POLLING_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [userId, fetchCount]);

  return count;
}

export function useUnreadReplyPostIds(userId: string | undefined): Set<string> {
  const [postIds, setPostIds] = useState<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPostIds = useCallback(async () => {
    if (!userId) return;
    const ids = await getUnreadNotificationPostIds();
    setPostIds(new Set(ids));
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setPostIds(new Set());
      return;
    }

    void fetchPostIds();

    intervalRef.current = setInterval(() => {
      void fetchPostIds();
    }, POLLING_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [userId, fetchPostIds]);

  return postIds;
}

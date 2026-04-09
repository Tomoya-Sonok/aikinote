"use client";

import { useCallback, useEffect, useState } from "react";
import { type DailyLimitsData, getDailyLimits } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSubscription } from "@/lib/hooks/useSubscription";

const FREE_DAILY_LIMIT = 3;
const FREE_DAILY_FAVORITE_LIMIT = 5;

export function useDailyLimits() {
  const { user } = useAuth();
  const { isPremium, loading: subLoading } = useSubscription();
  const [limits, setLimits] = useState<DailyLimitsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLimits = useCallback(async () => {
    if (!user?.id || subLoading) return;

    if (isPremium) {
      setLimits({
        posts: { used: 0, limit: -1 },
        replies: { used: 0, limit: -1 },
        favorites: { used: 0, limit: -1 },
        is_premium: true,
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await getDailyLimits();
      setLimits(data);
    } catch {
      setLimits({
        posts: { used: 0, limit: FREE_DAILY_LIMIT },
        replies: { used: 0, limit: FREE_DAILY_LIMIT },
        favorites: { used: 0, limit: FREE_DAILY_FAVORITE_LIMIT },
        is_premium: false,
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, isPremium, subLoading]);

  useEffect(() => {
    fetchLimits();
  }, [fetchLimits]);

  const incrementPostCount = useCallback(() => {
    setLimits((prev) =>
      prev
        ? { ...prev, posts: { ...prev.posts, used: prev.posts.used + 1 } }
        : prev,
    );
  }, []);

  const incrementReplyCount = useCallback(() => {
    setLimits((prev) =>
      prev
        ? {
            ...prev,
            replies: { ...prev.replies, used: prev.replies.used + 1 },
          }
        : prev,
    );
  }, []);

  const incrementFavoriteCount = useCallback(() => {
    setLimits((prev) =>
      prev
        ? {
            ...prev,
            favorites: {
              ...prev.favorites,
              used: prev.favorites.used + 1,
            },
          }
        : prev,
    );
  }, []);

  const postsRemaining = isPremium
    ? Number.POSITIVE_INFINITY
    : Math.max(0, FREE_DAILY_LIMIT - (limits?.posts.used ?? 0));
  const repliesRemaining = isPremium
    ? Number.POSITIVE_INFINITY
    : Math.max(0, FREE_DAILY_LIMIT - (limits?.replies.used ?? 0));
  const favoritesRemaining = isPremium
    ? Number.POSITIVE_INFINITY
    : Math.max(0, FREE_DAILY_FAVORITE_LIMIT - (limits?.favorites.used ?? 0));

  return {
    canPost: isPremium || postsRemaining > 0,
    canReply: isPremium || repliesRemaining > 0,
    canFavorite: isPremium || favoritesRemaining > 0,
    postsRemaining,
    repliesRemaining,
    favoritesRemaining,
    isPremium: isPremium ?? false,
    loading: loading || subLoading,
    incrementPostCount,
    incrementReplyCount,
    incrementFavoriteCount,
    refetch: fetchLimits,
  };
}

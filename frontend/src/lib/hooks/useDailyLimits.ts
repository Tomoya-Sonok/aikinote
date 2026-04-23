"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { type DailyLimitsData, getDailyLimits } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSubscription } from "@/lib/hooks/useSubscription";

const FREE_DAILY_LIMIT = 3;
const FREE_DAILY_FAVORITE_LIMIT = 5;

const FALLBACK_FREE_LIMITS: DailyLimitsData = {
  posts: { used: 0, limit: FREE_DAILY_LIMIT },
  replies: { used: 0, limit: FREE_DAILY_LIMIT },
  favorites: { used: 0, limit: FREE_DAILY_FAVORITE_LIMIT },
  is_premium: false,
};

const PREMIUM_UNLIMITED: DailyLimitsData = {
  posts: { used: 0, limit: -1 },
  replies: { used: 0, limit: -1 },
  favorites: { used: 0, limit: -1 },
  is_premium: true,
};

export const dailyLimitsQueryKey = (userId: string | undefined) =>
  ["daily-limits", userId] as const;

export function useDailyLimits() {
  const { user } = useAuth();
  const { isPremium, loading: subLoading } = useSubscription();
  const queryClient = useQueryClient();

  const query = useQuery<DailyLimitsData, Error>({
    queryKey: dailyLimitsQueryKey(user?.id),
    enabled: !!user?.id && !subLoading && !isPremium,
    queryFn: async () => {
      try {
        return await getDailyLimits();
      } catch {
        return FALLBACK_FREE_LIMITS;
      }
    },
  });

  // Premium ユーザーは API を叩かずローカルで無制限扱いにする
  const limits: DailyLimitsData | null = isPremium
    ? PREMIUM_UNLIMITED
    : (query.data ?? null);

  const loading =
    subLoading ||
    (!isPremium && !!user?.id && query.isLoading && limits === null);

  const updateLimits = useCallback(
    (updater: (prev: DailyLimitsData | undefined) => DailyLimitsData) => {
      queryClient.setQueryData<DailyLimitsData>(
        dailyLimitsQueryKey(user?.id),
        (prev) => updater(prev),
      );
    },
    [queryClient, user?.id],
  );

  const incrementPostCount = useCallback(() => {
    if (isPremium) return;
    updateLimits((prev) => {
      const base = prev ?? FALLBACK_FREE_LIMITS;
      return {
        ...base,
        posts: { ...base.posts, used: base.posts.used + 1 },
      };
    });
  }, [updateLimits, isPremium]);

  const incrementReplyCount = useCallback(() => {
    if (isPremium) return;
    updateLimits((prev) => {
      const base = prev ?? FALLBACK_FREE_LIMITS;
      return {
        ...base,
        replies: { ...base.replies, used: base.replies.used + 1 },
      };
    });
  }, [updateLimits, isPremium]);

  const incrementFavoriteCount = useCallback(() => {
    if (isPremium) return;
    updateLimits((prev) => {
      const base = prev ?? FALLBACK_FREE_LIMITS;
      return {
        ...base,
        favorites: { ...base.favorites, used: base.favorites.used + 1 },
      };
    });
  }, [updateLimits, isPremium]);

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
    loading,
    incrementPostCount,
    incrementReplyCount,
    incrementFavoriteCount,
    refetch: query.refetch,
  };
}

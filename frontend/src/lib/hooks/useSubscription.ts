"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getSubscriptionStatus,
  type SubscriptionStatusResult,
  syncSubscription,
} from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";

/**
 * sync は Stripe Portal / Checkout からの戻り時のみ実行。
 * 通常のページロードでは getSubscriptionStatus のみ（キャッシュ活用）。
 */
function shouldSync(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return (
    params.has("success") || params.has("canceled") || params.has("portal")
  );
}

export const subscriptionQueryKey = (userId: string | undefined) =>
  ["subscription", userId] as const;

export function useSubscription() {
  const { user, loading: authLoading } = useAuth();

  const query = useQuery<SubscriptionStatusResult, Error>({
    queryKey: subscriptionQueryKey(user?.id),
    enabled: !authLoading && !!user?.id,
    queryFn: async () => {
      if (shouldSync()) {
        await syncSubscription();
      }
      return await getSubscriptionStatus();
    },
  });

  return {
    loading: authLoading || query.isLoading,
    isPremium: query.data?.is_premium ?? false,
    subscription: query.data ?? null,
    refetch: query.refetch,
  };
}

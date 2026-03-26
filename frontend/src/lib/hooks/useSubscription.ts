"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getSubscriptionStatus,
  type SubscriptionStatusResult,
  syncSubscription,
} from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";

/**
 * sync は Stripe Portal / Checkout からの戻り時のみ実行
 * 通常のページロードでは getSubscriptionStatus のみ（キャッシュ活用）
 */
function shouldSync(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return (
    params.has("success") || params.has("canceled") || params.has("portal")
  );
}

export function useSubscription() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [subscription, setSubscription] =
    useState<SubscriptionStatusResult | null>(null);

  const fetchStatus = useCallback(async () => {
    if (authLoading) return;
    if (!user?.id) {
      setLoading(false);
      setIsPremium(false);
      setSubscription(null);
      return;
    }

    setLoading(true);
    try {
      if (shouldSync()) {
        await syncSubscription();
      }
      const status = await getSubscriptionStatus();
      setSubscription(status);
      setIsPremium(status.is_premium);
    } catch {
      setIsPremium(false);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [authLoading, user?.id]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return {
    loading,
    isPremium,
    subscription,
    refetch: fetchStatus,
  };
}

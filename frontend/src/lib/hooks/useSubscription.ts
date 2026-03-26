"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getSubscriptionStatus,
  type SubscriptionStatusResult,
} from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";

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

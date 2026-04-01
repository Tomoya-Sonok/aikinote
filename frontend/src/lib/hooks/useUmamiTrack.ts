"use client";

import { useLocale } from "next-intl";
import { useCallback } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSubscription } from "@/lib/hooks/useSubscription";

export function useUmamiTrack() {
  const { user } = useAuth();
  const locale = useLocale();
  const { subscription } = useSubscription();

  const track = useCallback(
    (eventName: string, extraProps?: Record<string, unknown>) => {
      if (typeof window === "undefined" || !window.umami) return;

      const commonProps: Record<string, unknown> = {
        user_id: user?.id ?? null,
        publicity_setting: user?.publicity_setting ?? null,
        language: locale,
        subscription_tier: subscription?.tier ?? "free",
        dojo_style_id: user?.dojo_style_id ?? null,
        aikido_rank: user?.aikido_rank ?? null,
        gender: user?.gender ?? null,
        age_range: user?.age_range ?? null,
      };

      window.umami.track(eventName, { ...commonProps, ...extraProps });
    },
    [user, locale, subscription],
  );

  return { track };
}

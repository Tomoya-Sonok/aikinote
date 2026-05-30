import {
  AI_COACH_FREE_LIFETIME_LIMIT,
  AI_COACH_PREMIUM_DAILY_LIMIT,
} from "./constants";

export type AiCoachTier = "free" | "premium";

export type AiCoachLimitReason = "free_limit" | "premium_daily_limit";

export type AiCoachUsageCheck = {
  allowed: boolean;
  reason?: AiCoachLimitReason;
};

// 利用可否を判定する。
// - Free: 生涯メッセージ数が上限(2)に達したら不可（PremiumUpgradeModal を出す）
// - Premium: 当日メッセージ数が上限(20)に達したら不可
export function checkAiCoachUsageAllowed(params: {
  tier: AiCoachTier;
  lifetimeCount: number;
  todayCount: number;
}): AiCoachUsageCheck {
  const { tier, lifetimeCount, todayCount } = params;
  if (tier === "premium") {
    if (todayCount >= AI_COACH_PREMIUM_DAILY_LIMIT) {
      return { allowed: false, reason: "premium_daily_limit" };
    }
    return { allowed: true };
  }
  if (lifetimeCount >= AI_COACH_FREE_LIFETIME_LIMIT) {
    return { allowed: false, reason: "free_limit" };
  }
  return { allowed: true };
}

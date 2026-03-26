import type { SupabaseClient } from "@supabase/supabase-js";

export type SubscriptionTier = "free" | "premium";

export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "expired"
  | "billing_issue"
  | "inactive";

export interface UserSubscription {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  revenuecat_customer_id: string | null;
  platform: "web" | "ios" | "android" | null;
  entitlement_id: string | null;
  product_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  status: SubscriptionStatus;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionStatusResponse {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  is_premium: boolean;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

/**
 * ユーザーのサブスクリプション状態を取得
 */
export async function getSubscriptionStatus(
  supabase: SupabaseClient,
  userId: string,
): Promise<SubscriptionStatusResponse> {
  const { data } = await supabase
    .from("UserSubscription")
    .select("tier, status, current_period_end, cancel_at_period_end")
    .eq("user_id", userId)
    .single();

  if (!data || data.status !== "active") {
    return {
      tier: "free",
      status: data?.status ?? "inactive",
      is_premium: false,
      current_period_end: null,
      cancel_at_period_end: false,
    };
  }

  // 期限切れチェック
  if (
    data.current_period_end &&
    new Date(data.current_period_end) < new Date()
  ) {
    return {
      tier: "free",
      status: "expired",
      is_premium: false,
      current_period_end: data.current_period_end,
      cancel_at_period_end: data.cancel_at_period_end ?? false,
    };
  }

  return {
    tier: data.tier as SubscriptionTier,
    status: data.status as SubscriptionStatus,
    is_premium: data.tier === "premium",
    current_period_end: data.current_period_end,
    cancel_at_period_end: data.cancel_at_period_end ?? false,
  };
}

/**
 * ユーザーが Premium かどうかを高速判定（User テーブルのキャッシュカラムを使用）
 */
export async function isPremiumUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("User")
    .select("subscription_tier")
    .eq("id", userId)
    .single();

  return data?.subscription_tier === "premium";
}

/**
 * RevenueCat Webhook イベントに基づいてサブスクリプションを更新
 */
export async function upsertSubscriptionFromWebhook(
  supabase: SupabaseClient,
  params: {
    userId: string;
    revenuecatCustomerId: string;
    tier: SubscriptionTier;
    status: SubscriptionStatus;
    platform: "web" | "ios" | "android";
    entitlementId?: string;
    productId?: string;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    cancelAtPeriodEnd?: boolean;
  },
): Promise<UserSubscription> {
  const { data, error } = await supabase
    .from("UserSubscription")
    .upsert(
      {
        user_id: params.userId,
        revenuecat_customer_id: params.revenuecatCustomerId,
        tier: params.tier,
        status: params.status,
        platform: params.platform,
        entitlement_id: params.entitlementId ?? null,
        product_id: params.productId ?? null,
        current_period_start: params.currentPeriodStart ?? null,
        current_period_end: params.currentPeriodEnd ?? null,
        cancel_at_period_end: params.cancelAtPeriodEnd ?? false,
      },
      { onConflict: "user_id" },
    )
    .select()
    .single();

  if (error) {
    throw new Error(`サブスクリプション更新エラー: ${error.message}`);
  }

  return data as UserSubscription;
}

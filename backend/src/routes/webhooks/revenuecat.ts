import type { SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import {
  type SubscriptionStatus,
  type SubscriptionTier,
  upsertSubscriptionFromWebhook,
} from "../../lib/subscription.js";

type WebhookBindings = {
  REVENUECAT_WEBHOOK_TOKEN?: string;
};

type WebhookVariables = {
  supabase: SupabaseClient | null;
};

const app = new Hono<{
  Bindings: WebhookBindings;
  Variables: WebhookVariables;
}>();

const getEnvVar = (
  env: WebhookBindings | undefined,
  key: string,
): string | undefined => {
  const value = env?.[key as keyof WebhookBindings];
  if (value) return value;
  return typeof process !== "undefined" ? process.env?.[key] : undefined;
};

/**
 * RevenueCat イベントタイプからサブスクリプション状態をマッピング
 */
function mapRevenueCatEvent(eventType: string): {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
} {
  switch (eventType) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "UNCANCELLATION":
    case "PRODUCT_CHANGE":
      return { tier: "premium", status: "active" };

    case "CANCELLATION":
      return { tier: "premium", status: "canceled" };

    case "EXPIRATION":
      return { tier: "free", status: "expired" };

    case "BILLING_ISSUE":
      return { tier: "premium", status: "billing_issue" };

    case "SUBSCRIBER_ALIAS":
    case "TRANSFER":
      // エイリアス・トランスファーはステータス変更なし
      return { tier: "premium", status: "active" };

    default:
      return { tier: "free", status: "inactive" };
  }
}

/**
 * RevenueCat の store を AikiNote の platform にマッピング
 */
function mapStore(store: string | undefined): "web" | "ios" | "android" {
  switch (store) {
    case "APP_STORE":
    case "MAC_APP_STORE":
      return "ios";
    case "PLAY_STORE":
      return "android";
    case "STRIPE":
      return "web";
    default:
      return "web";
  }
}

// POST /api/webhooks/revenuecat — RevenueCat Webhook
app.post("/revenuecat", async (c) => {
  try {
    // 認証: RevenueCat Webhook トークン検証
    const authHeader = c.req.header("Authorization") ?? "";
    const expectedToken = getEnvVar(c.env, "REVENUECAT_WEBHOOK_TOKEN");

    if (expectedToken) {
      // RevenueCat はダッシュボードの値をそのまま Authorization ヘッダーとして送信する
      // "Bearer <token>" 形式でも生トークンでもマッチするように比較
      const stripped = authHeader.replace(/^Bearer\s+/i, "");
      const matches =
        authHeader === expectedToken ||
        stripped === expectedToken ||
        authHeader === `Bearer ${expectedToken}`;

      if (!matches) {
        console.error("[RevenueCat Webhook] 認証失敗:", {
          receivedLength: authHeader.length,
          receivedPrefix: authHeader.substring(0, 20),
          expectedLength: expectedToken.length,
        });
        return c.json({ success: false, error: "認証に失敗しました" }, 401);
      }
    }

    const body = await c.req.json();
    const event = body?.event;

    if (!event) {
      return c.json({ success: false, error: "無効なイベントデータ" }, 400);
    }

    const eventType: string = event.type ?? "";
    const appUserId: string | undefined = event.app_user_id;
    const revenuecatCustomerId: string | undefined = event.id;

    // テストイベントはスキップ
    if (eventType === "TEST") {
      console.log("[RevenueCat Webhook] テストイベント受信 — OK");
      return c.json({ success: true, message: "テストイベント受信" });
    }

    if (!appUserId) {
      console.warn("[RevenueCat Webhook] app_user_id が未設定:", eventType);
      return c.json({ success: true, message: "app_user_id なし、スキップ" });
    }

    // UUID 形式チェック（Supabase の user.id は UUID）
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(appUserId)) {
      console.warn("[RevenueCat Webhook] 無効な app_user_id:", appUserId);
      return c.json({
        success: true,
        message: "無効な app_user_id、スキップ",
      });
    }

    const supabase = c.get("supabase");
    if (!supabase) {
      return c.json({ success: false, error: "サーバー設定が不正です" }, 500);
    }

    const { tier, status } = mapRevenueCatEvent(eventType);
    const platform = mapStore(event.store);

    // entitlement_ids から最初の entitlement を取得
    const entitlementIds: string[] = event.subscriber_attributes
      ?.$entitlementIds?.value
      ? JSON.parse(event.subscriber_attributes.$entitlementIds.value)
      : [];
    const entitlementId = entitlementIds[0] ?? event.entitlement_id ?? null;

    await upsertSubscriptionFromWebhook(supabase, {
      userId: appUserId,
      revenuecatCustomerId: revenuecatCustomerId ?? appUserId,
      tier,
      status,
      platform,
      entitlementId,
      productId: event.product_id ?? null,
      currentPeriodStart: event.period_start_ms
        ? new Date(event.period_start_ms).toISOString()
        : undefined,
      currentPeriodEnd: event.expiration_at_ms
        ? new Date(event.expiration_at_ms).toISOString()
        : undefined,
      cancelAtPeriodEnd:
        eventType === "CANCELLATION" || event.cancel_reason != null,
    });

    console.log(
      `[RevenueCat Webhook] ${eventType} processed for user ${appUserId}: tier=${tier}, status=${status}`,
    );

    return c.json({ success: true });
  } catch (error) {
    console.error("[RevenueCat Webhook] 処理エラー:", error);
    return c.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Webhook 処理に失敗しました",
      },
      500,
    );
  }
});

export default app;

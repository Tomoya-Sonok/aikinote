import type { SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import Stripe from "stripe";
import { extractTokenFromHeader, verifyToken } from "../../lib/jwt.js";
import {
  getSubscriptionStatus,
  isPremiumUser,
  type SubscriptionStatusResponse,
  upsertSubscriptionFromWebhook,
} from "../../lib/subscription.js";
import type { ApiResponse } from "../../lib/validation.js";

type SubscriptionBindings = {
  JWT_SECRET?: string;
  STRIPE_SECRET_KEY?: string;
  NEXT_PUBLIC_APP_URL?: string;
  APP_URL?: string;
};

type SubscriptionVariables = {
  supabase: SupabaseClient | null;
};

const app = new Hono<{
  Bindings: SubscriptionBindings;
  Variables: SubscriptionVariables;
}>();

const getEnv = (
  env: SubscriptionBindings | undefined,
  key: string,
): string | undefined => {
  const value = env?.[key as keyof SubscriptionBindings];
  if (value) return value;
  return typeof process !== "undefined" ? process.env?.[key] : undefined;
};

// GET /api/subscription/status — サブスクリプション状態取得
app.get("/status", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const token = extractTokenFromHeader(authHeader);
    const payload = await verifyToken(token, c.env);

    const supabase = c.get("supabase");
    if (!supabase) {
      return c.json({ success: false, error: "サーバー設定が不正です" }, 500);
    }

    const status = await getSubscriptionStatus(supabase, payload.userId);

    const response: ApiResponse<SubscriptionStatusResponse> = {
      success: true,
      data: status,
      message: "サブスクリプション状態を取得しました",
    };

    return c.json(response, 200);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("token") ||
        error.message.includes("Authorization"))
    ) {
      return c.json({ success: false, error: "認証に失敗しました" }, 401);
    }
    console.error("サブスクリプション状態取得エラー:", error);
    return c.json(
      { success: false, error: "サブスクリプション状態の取得に失敗しました" },
      500,
    );
  }
});

// POST /api/subscription/checkout — Stripe Checkout Session 作成
app.post("/checkout", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const token = extractTokenFromHeader(authHeader);
    const payload = await verifyToken(token, c.env);

    const stripeKey = getEnv(c.env, "STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return c.json(
        { success: false, error: "Stripe が設定されていません" },
        500,
      );
    }

    const supabase = c.get("supabase");
    if (!supabase) {
      return c.json({ success: false, error: "サーバー設定が不正です" }, 500);
    }

    // 二重課金防止: 既に Premium の場合は Checkout を作成しない
    const premium = await isPremiumUser(supabase, payload.userId);
    if (premium) {
      return c.json(
        {
          success: false,
          error: "既に Premium プランに加入済みです",
          code: "ALREADY_PREMIUM",
        },
        409,
      );
    }

    const body = await c.req.json();
    const priceId: string | undefined = body?.priceId;
    if (!priceId) {
      return c.json(
        { success: false, error: "priceId が指定されていません" },
        400,
      );
    }

    // ユーザー情報を取得
    const { data: user } = await supabase
      .from("User")
      .select("email")
      .eq("id", payload.userId)
      .single();

    const stripe = new Stripe(stripeKey);
    const appUrl =
      getEnv(c.env, "NEXT_PUBLIC_APP_URL") ??
      getEnv(c.env, "APP_URL") ??
      "https://aikinote.com";

    // 既存の Stripe Customer を検索、なければ作成
    let customerId: string | undefined;
    if (user?.email) {
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { supabase_user_id: payload.userId },
        });
        customerId = customer.id;
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : (user?.email ?? undefined),
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/ja/settings/subscription?success=1`,
      cancel_url: `${appUrl}/ja/settings/subscription?canceled=1`,
      metadata: {
        supabase_user_id: payload.userId,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: payload.userId,
        },
      },
    });

    return c.json({
      success: true,
      data: { url: session.url },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("token") ||
        error.message.includes("Authorization"))
    ) {
      return c.json({ success: false, error: "認証に失敗しました" }, 401);
    }
    console.error("Checkout Session 作成エラー:", error);
    return c.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Checkout Session の作成に失敗しました",
      },
      500,
    );
  }
});

// POST /api/subscription/portal — Stripe Customer Portal セッション作成
app.post("/portal", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const token = extractTokenFromHeader(authHeader);
    const payload = await verifyToken(token, c.env);

    const stripeKey = getEnv(c.env, "STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return c.json(
        { success: false, error: "Stripe が設定されていません" },
        500,
      );
    }

    const supabase = c.get("supabase");
    if (!supabase) {
      return c.json({ success: false, error: "サーバー設定が不正です" }, 500);
    }

    // ユーザーの email を取得して Stripe Customer を検索
    const { data: user } = await supabase
      .from("User")
      .select("email")
      .eq("id", payload.userId)
      .single();

    if (!user?.email) {
      return c.json(
        { success: false, error: "ユーザー情報が見つかりません" },
        404,
      );
    }

    const stripe = new Stripe(stripeKey);
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      return c.json(
        { success: false, error: "Stripe の顧客情報が見つかりません" },
        404,
      );
    }

    const appUrl =
      getEnv(c.env, "NEXT_PUBLIC_APP_URL") ??
      getEnv(c.env, "APP_URL") ??
      "https://aikinote.com";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customers.data[0].id,
      return_url: `${appUrl}/ja/settings/subscription`,
    });

    return c.json({
      success: true,
      data: { url: portalSession.url },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("token") ||
        error.message.includes("Authorization"))
    ) {
      return c.json({ success: false, error: "認証に失敗しました" }, 401);
    }
    console.error("Customer Portal セッション作成エラー:", error);
    return c.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "管理画面の表示に失敗しました",
      },
      500,
    );
  }
});

// POST /api/subscription/sync — Stripe の実際の状態と DB を同期
app.post("/sync", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const token = extractTokenFromHeader(authHeader);
    const payload = await verifyToken(token, c.env);

    const stripeKey = getEnv(c.env, "STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return c.json(
        { success: false, error: "Stripe が設定されていません" },
        500,
      );
    }

    const supabase = c.get("supabase");
    if (!supabase) {
      return c.json({ success: false, error: "サーバー設定が不正です" }, 500);
    }

    const { data: user } = await supabase
      .from("User")
      .select("email")
      .eq("id", payload.userId)
      .single();

    if (!user?.email) {
      return c.json(
        { success: false, error: "ユーザー情報が見つかりません" },
        404,
      );
    }

    const stripe = new Stripe(stripeKey);
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    if (customers.data.length === 0) {
      // Stripe に顧客がいない → DB の現在の値を信頼して返す
      // （手動 Premium 付与など、Stripe を経由しないケースに対応）
      const currentStatus = await getSubscriptionStatus(
        supabase,
        payload.userId,
      );
      return c.json({
        success: true,
        data: { tier: currentStatus.tier, status: currentStatus.status },
      });
    }

    const customerId = customers.data[0].id;

    // アクティブなサブスクリプションを検索
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      // アクティブなサブスクリプションなし → Free に戻す
      await upsertSubscriptionFromWebhook(supabase, {
        userId: payload.userId,
        revenuecatCustomerId: customerId,
        tier: "free",
        status: "expired",
        platform: "web",
      });
      return c.json({
        success: true,
        data: { tier: "free", status: "expired" },
      });
    }

    // アクティブなサブスクリプションあり → Premium に同期
    // biome-ignore lint/suspicious/noExplicitAny: Stripe API バージョンで型が変わるため
    const sub = subscriptions.data[0] as any;

    // 期間情報を複数パスから抽出（Stripe API バージョン差異に対応）
    const safeDate = (val: unknown): string | undefined => {
      if (typeof val === "number" && val > 0)
        return new Date(val * 1000).toISOString();
      if (typeof val === "string") {
        const d = new Date(val);
        if (!Number.isNaN(d.getTime())) return d.toISOString();
      }
      return undefined;
    };

    const periodStart =
      safeDate(sub.current_period_start) ??
      safeDate(sub.current_period?.start) ??
      safeDate(sub.items?.data?.[0]?.current_period_start) ??
      safeDate(sub.items?.data?.[0]?.current_period?.start);

    const periodEnd =
      safeDate(sub.current_period_end) ??
      safeDate(sub.current_period?.end) ??
      safeDate(sub.items?.data?.[0]?.current_period_end) ??
      safeDate(sub.items?.data?.[0]?.current_period?.end);

    const cancelAtPeriodEnd =
      sub.cancel_at_period_end === true || sub.cancel_at != null;

    console.log("[Sync] 期間情報:", {
      periodStart,
      periodEnd,
      cancelAtPeriodEnd,
      rawKeys: Object.keys(sub).filter(
        (k: string) => k.includes("period") || k.includes("cancel"),
      ),
    });

    await upsertSubscriptionFromWebhook(supabase, {
      userId: payload.userId,
      revenuecatCustomerId: customerId,
      tier: "premium",
      status: "active",
      platform: "web",
      productId: sub.items?.data?.[0]?.price?.id ?? null,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd,
    });

    return c.json({
      success: true,
      data: { tier: "premium", status: "active" },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("token") ||
        error.message.includes("Authorization"))
    ) {
      return c.json({ success: false, error: "認証に失敗しました" }, 401);
    }
    console.error("サブスクリプション同期エラー:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "同期に失敗しました",
      },
      500,
    );
  }
});

export default app;

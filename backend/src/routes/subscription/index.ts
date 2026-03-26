import type { SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import Stripe from "stripe";
import { extractTokenFromHeader, verifyToken } from "../../lib/jwt.js";
import {
  getSubscriptionStatus,
  type SubscriptionStatusResponse,
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

export default app;

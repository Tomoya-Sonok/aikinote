import type { SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import Stripe from "stripe";
import { upsertSubscriptionFromWebhook } from "../../lib/subscription.js";

type WebhookBindings = {
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
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

// POST /api/webhooks/stripe — Stripe Webhook
app.post("/stripe", async (c) => {
  try {
    const stripeKey = getEnvVar(c.env, "STRIPE_SECRET_KEY");
    const webhookSecret = getEnvVar(c.env, "STRIPE_WEBHOOK_SECRET");

    if (!stripeKey || !webhookSecret) {
      console.error("[Stripe Webhook] 環境変数が未設定");
      return c.json({ success: false, error: "サーバー設定が不正です" }, 500);
    }

    const stripe = new Stripe(stripeKey);
    const signature = c.req.header("stripe-signature");

    if (!signature) {
      return c.json({ success: false, error: "署名がありません" }, 400);
    }

    const rawBody = await c.req.text();
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (err) {
      console.error("[Stripe Webhook] 署名検証失敗:", err);
      return c.json({ success: false, error: "署名検証に失敗しました" }, 400);
    }

    const supabase = c.get("supabase");
    if (!supabase) {
      return c.json({ success: false, error: "サーバー設定が不正です" }, 500);
    }

    // サブスクリプション関連イベントを処理
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(supabase, stripe, subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, stripe, subscription);
        break;
      }
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(
          `[Stripe Webhook] checkout.session.completed: ${session.id}, user: ${session.metadata?.supabase_user_id}`,
        );
        break;
      }
      default:
        // 他のイベントは無視
        break;
    }

    return c.json({ success: true, received: true });
  } catch (error) {
    console.error("[Stripe Webhook] 処理エラー:", error);
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

/**
 * サブスクリプション作成・更新時の処理
 */
async function handleSubscriptionChange(
  supabase: SupabaseClient,
  stripe: Stripe,
  subscription: Stripe.Subscription,
) {
  const userId = subscription.metadata?.supabase_user_id;
  if (!userId) {
    // metadata になければ customer から探す
    const customer = await stripe.customers.retrieve(
      subscription.customer as string,
    );
    const metaUserId = !customer.deleted
      ? customer.metadata?.supabase_user_id
      : undefined;
    if (!metaUserId) {
      console.warn(
        "[Stripe Webhook] supabase_user_id が見つかりません:",
        subscription.id,
      );
      return;
    }
    await updateSubscription(supabase, metaUserId, subscription);
    return;
  }

  await updateSubscription(supabase, userId, subscription);
}

/**
 * サブスクリプション削除時の処理
 */
async function handleSubscriptionDeleted(
  supabase: SupabaseClient,
  stripe: Stripe,
  subscription: Stripe.Subscription,
) {
  const userId =
    subscription.metadata?.supabase_user_id ??
    (await getCustomerUserId(stripe, subscription.customer as string));

  if (!userId) {
    console.warn(
      "[Stripe Webhook] supabase_user_id が見つかりません（削除）:",
      subscription.id,
    );
    return;
  }

  await upsertSubscriptionFromWebhook(supabase, {
    userId,
    revenuecatCustomerId: subscription.customer as string,
    tier: "free",
    status: "expired",
    platform: "web",
    productId: subscription.items.data[0]?.price?.id ?? null,
  });

  console.log(`[Stripe Webhook] サブスクリプション削除: user=${userId}`);
}

/**
 * Unix timestamp（秒）を ISO 文字列に安全に変換
 */
function safeTimestampToISO(value: unknown): string | undefined {
  if (typeof value === "number" && value > 0) {
    return new Date(value * 1000).toISOString();
  }
  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return undefined;
}

async function updateSubscription(
  supabase: SupabaseClient,
  userId: string,
  subscription: Stripe.Subscription,
) {
  const isActive =
    subscription.status === "active" || subscription.status === "trialing";

  // biome-ignore lint/suspicious/noExplicitAny: Stripe API バージョンで型が変わるため
  const sub = subscription as any;

  await upsertSubscriptionFromWebhook(supabase, {
    userId,
    revenuecatCustomerId: subscription.customer as string,
    tier: isActive ? "premium" : "free",
    status: mapStripeStatus(subscription.status),
    platform: "web",
    productId: subscription.items.data[0]?.price?.id ?? null,
    currentPeriodStart: safeTimestampToISO(sub.current_period_start),
    currentPeriodEnd: safeTimestampToISO(sub.current_period_end),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });

  console.log(
    `[Stripe Webhook] サブスクリプション更新: user=${userId}, status=${subscription.status}`,
  );
}

function mapStripeStatus(
  status: Stripe.Subscription.Status,
): "active" | "canceled" | "expired" | "billing_issue" | "inactive" {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "canceled":
      return "canceled";
    case "past_due":
    case "unpaid":
      return "billing_issue";
    case "incomplete":
    case "incomplete_expired":
      return "expired";
    default:
      return "inactive";
  }
}

async function getCustomerUserId(
  stripe: Stripe,
  customerId: string,
): Promise<string | undefined> {
  try {
    const customer = await stripe.customers.retrieve(customerId);
    return !customer.deleted ? customer.metadata?.supabase_user_id : undefined;
  } catch {
    return undefined;
  }
}

export default app;

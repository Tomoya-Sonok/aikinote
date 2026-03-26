import type { SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { extractTokenFromHeader, verifyToken } from "../../lib/jwt.js";
import {
  getSubscriptionStatus,
  type SubscriptionStatusResponse,
} from "../../lib/subscription.js";
import type { ApiResponse } from "../../lib/validation.js";

type SubscriptionBindings = {
  JWT_SECRET?: string;
};

type SubscriptionVariables = {
  supabase: SupabaseClient | null;
};

const app = new Hono<{
  Bindings: SubscriptionBindings;
  Variables: SubscriptionVariables;
}>();

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

export default app;

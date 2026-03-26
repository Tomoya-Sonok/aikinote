import { zValidator } from "@hono/zod-validator";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { extractTokenFromHeader, verifyToken } from "../../lib/jwt.js";
import { isPremiumUser } from "../../lib/subscription.js";
import { getTrainingStats } from "../../lib/supabase.js";
import {
  type ApiResponse,
  getTrainingStatsSchema,
  type TrainingStatsResponse,
} from "../../lib/validation.js";

type StatsBindings = {
  JWT_SECRET?: string;
};

type StatsVariables = {
  supabase: SupabaseClient | null;
};

const app = new Hono<{
  Bindings: StatsBindings;
  Variables: StatsVariables;
}>();

app.get("/", zValidator("query", getTrainingStatsSchema), async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const token = extractTokenFromHeader(authHeader);
    const payload = await verifyToken(token, c.env);

    const { user_id, start_date, end_date } = c.req.valid("query");

    if (payload.userId !== user_id) {
      return c.json({ success: false, error: "認証エラー" }, 403);
    }

    const supabase = c.get("supabase");
    if (!supabase) {
      return c.json({ success: false, error: "サーバー設定が不正です" }, 500);
    }

    // Premium チェック: Free ユーザーは統計データにアクセス不可
    const premium = await isPremiumUser(supabase, user_id);
    if (!premium) {
      return c.json(
        {
          success: false,
          error: "統計データは Premium プランの機能です",
          code: "PREMIUM_REQUIRED",
        },
        403,
      );
    }

    const stats = await getTrainingStats(user_id, start_date, end_date);

    const response: ApiResponse<TrainingStatsResponse> = {
      success: true,
      data: stats,
      message: "統計データを取得しました",
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
    console.error("統計データの取得エラー:", error);

    const errorResponse: ApiResponse<never> = {
      success: false,
      error:
        error instanceof Error ? error.message : "不明なエラーが発生しました",
    };

    return c.json(errorResponse, 500);
  }
});

export default app;

import { zValidator } from "@hono/zod-validator";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { isPremiumUser } from "../../lib/subscription.js";
import { getTrainingStats } from "../../lib/supabase.js";
import {
  type ApiResponse,
  getTrainingStatsSchema,
  type TrainingStatsResponse,
} from "../../lib/validation.js";
import { authMiddleware } from "../../middleware/auth.js";

type StatsBindings = {
  JWT_SECRET?: string;
};

type StatsVariables = {
  supabase: SupabaseClient | null;
  userId: string;
};

const app = new Hono<{
  Bindings: StatsBindings;
  Variables: StatsVariables;
}>();

app.get(
  "/",
  authMiddleware,
  zValidator("query", getTrainingStatsSchema),
  async (c) => {
    try {
      const userId = c.get("userId");
      const supabase = c.get("supabase")!;

      const { user_id, start_date, end_date } = c.req.valid("query");

      if (userId !== user_id) {
        return c.json({ success: false, error: "認証エラー" }, 403);
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
      console.error("統計データの取得エラー:", error);

      const errorResponse: ApiResponse<never> = {
        success: false,
        error:
          error instanceof Error ? error.message : "不明なエラーが発生しました",
      };

      return c.json(errorResponse, 500);
    }
  },
);

export default app;

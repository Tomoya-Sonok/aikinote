import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { getTrainingStats } from "../../lib/supabase.js";
import {
  type ApiResponse,
  getTrainingStatsSchema,
  type TrainingStatsResponse,
} from "../../lib/validation.js";

const app = new Hono();

app.get("/", zValidator("query", getTrainingStatsSchema), async (c) => {
  try {
    const { user_id, start_date, end_date } = c.req.valid("query");
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
});

export default app;

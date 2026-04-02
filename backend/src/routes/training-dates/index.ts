import { zValidator } from "@hono/zod-validator";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { z } from "zod";
import {
  deleteTrainingDateAttendance,
  getTrainingDatesByMonth,
  getTrainingPageCountsByMonth,
  upsertTrainingDateAttendance,
} from "../../lib/supabase.js";
import {
  type ApiResponse,
  deleteTrainingDateSchema,
  getTrainingDatesSchema,
  type TrainingDateMonthResponse,
  type TrainingDateResponse,
  upsertTrainingDateSchema,
} from "../../lib/validation.js";
import { authMiddleware } from "../../middleware/auth.js";

type TrainingDatesBindings = {
  JWT_SECRET?: string;
};

type TrainingDatesVariables = {
  supabase: SupabaseClient | null;
  userId: string;
};

const app = new Hono<{
  Bindings: TrainingDatesBindings;
  Variables: TrainingDatesVariables;
}>();

// 月間目標の更新スキーマ
const updateGoalSchema = z.object({
  goal: z.number().int().min(1).max(31).nullable(),
});

type MonthlyTrainingGoalResponse = {
  goal: number | null;
};

app.get("/", zValidator("query", getTrainingDatesSchema), async (c) => {
  try {
    const { user_id, year, month } = c.req.valid("query");
    const [trainingDates, pageCounts] = await Promise.all([
      getTrainingDatesByMonth(user_id, year, month),
      getTrainingPageCountsByMonth(user_id, year, month),
    ]);

    const response: ApiResponse<TrainingDateMonthResponse> = {
      success: true,
      data: {
        training_dates: trainingDates,
        page_counts: pageCounts,
      },
      message: "稽古参加日の一覧を取得しました",
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("稽古参加日の一覧取得エラー:", error);

    const errorResponse: ApiResponse<never> = {
      success: false,
      error:
        error instanceof Error ? error.message : "不明なエラーが発生しました",
    };

    return c.json(errorResponse, 500);
  }
});

app.put("/", zValidator("json", upsertTrainingDateSchema), async (c) => {
  try {
    const { user_id, training_date } = c.req.valid("json");
    const trainingDate = await upsertTrainingDateAttendance(
      user_id,
      training_date,
    );

    const response: ApiResponse<TrainingDateResponse> = {
      success: true,
      data: trainingDate,
      message: "稽古参加日を登録しました",
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("稽古参加日の登録エラー:", error);

    const errorResponse: ApiResponse<never> = {
      success: false,
      error:
        error instanceof Error ? error.message : "不明なエラーが発生しました",
    };

    return c.json(errorResponse, 500);
  }
});

app.delete("/", zValidator("query", deleteTrainingDateSchema), async (c) => {
  try {
    const { user_id, training_date } = c.req.valid("query");
    await deleteTrainingDateAttendance(user_id, training_date);

    const response: ApiResponse<never> = {
      success: true,
      message: "稽古参加日を削除しました",
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("稽古参加日の削除エラー:", error);

    const errorResponse: ApiResponse<never> = {
      success: false,
      error:
        error instanceof Error ? error.message : "不明なエラーが発生しました",
    };

    return c.json(errorResponse, 500);
  }
});

// GET /goal — 月間稽古目標を取得
app.get("/goal", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const supabase = c.get("supabase")!;

    const { data, error } = await supabase
      .from("User")
      .select("monthly_training_goal")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("月間稽古目標の取得エラー:", error);
      return c.json(
        { success: false, error: "月間稽古目標の取得に失敗しました" },
        500,
      );
    }

    const response: ApiResponse<MonthlyTrainingGoalResponse> = {
      success: true,
      data: {
        goal: data?.monthly_training_goal ?? null,
      },
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("月間稽古目標の取得エラー:", error);

    const errorResponse: ApiResponse<never> = {
      success: false,
      error:
        error instanceof Error ? error.message : "不明なエラーが発生しました",
    };

    return c.json(errorResponse, 500);
  }
});

// PUT /goal — 月間稽古目標を設定
app.put(
  "/goal",
  authMiddleware,
  zValidator("json", updateGoalSchema),
  async (c) => {
    try {
      const userId = c.get("userId");
      const supabase = c.get("supabase")!;

      const { goal } = c.req.valid("json");

      const { error } = await supabase
        .from("User")
        .update({ monthly_training_goal: goal })
        .eq("id", userId);

      if (error) {
        console.error("月間稽古目標の更新エラー:", error);
        return c.json(
          { success: false, error: "月間稽古目標の更新に失敗しました" },
          500,
        );
      }

      const response: ApiResponse<MonthlyTrainingGoalResponse> = {
        success: true,
        data: { goal },
        message: "月間稽古目標を更新しました",
      };

      return c.json(response, 200);
    } catch (error) {
      console.error("月間稽古目標の更新エラー:", error);

      const errorResponse: ApiResponse<never> = {
        success: false,
        error:
          error instanceof Error ? error.message : "不明なエラーが発生しました",
      };

      return c.json(errorResponse, 500);
    }
  },
);

// GET /count — 期間内の出席日数をカウント
app.get("/count", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const supabase = c.get("supabase")!;

    const from = c.req.query("from");
    const to = c.req.query("to");

    if (!to) {
      return c.json({ success: false, error: "to パラメータは必須です" }, 400);
    }

    // 前回審査日を含まず（gt）、次回審査日を含まず（lt）
    let query = supabase
      .from("TrainingDate")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_attended", true)
      .lt("training_date", to);

    if (from) {
      query = query.gt("training_date", from);
    }

    const { count, error } = await query;

    if (error) {
      console.error("出席日数カウントエラー:", error);
      return c.json(
        { success: false, error: "出席日数のカウントに失敗しました" },
        500,
      );
    }

    return c.json({
      success: true,
      data: { count: count ?? 0 },
    });
  } catch (error) {
    console.error("出席日数カウントエラー:", error);

    const errorResponse: ApiResponse<never> = {
      success: false,
      error:
        error instanceof Error ? error.message : "不明なエラーが発生しました",
    };

    return c.json(errorResponse, 500);
  }
});

export default app;

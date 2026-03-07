import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
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

const app = new Hono();

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

export default app;

import type { SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { authMiddleware, premiumMiddleware } from "../../middleware/auth.js";

type ExamGoalsBindings = {
  JWT_SECRET?: string;
};

type ExamGoalsVariables = {
  supabase: SupabaseClient | null;
  userId: string;
};

const app = new Hono<{
  Bindings: ExamGoalsBindings;
  Variables: ExamGoalsVariables;
}>();

// GET / — 審査目標を取得
app.get("/", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const supabase = c.get("supabase")!;

  try {
    const { data, error } = await supabase
      .from("UserExamGoal")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("審査目標取得エラー:", error);
      return c.json({ error: "審査目標の取得に失敗しました" }, 500);
    }

    // 審査日が過去の場合は自動削除して null を返す
    if (data && new Date(data.exam_date) < new Date()) {
      const { error: deleteError } = await supabase
        .from("UserExamGoal")
        .delete()
        .eq("id", data.id);

      if (deleteError) {
        console.error("期限切れ審査目標の削除エラー:", deleteError);
      }

      return c.json({ success: true, data: null });
    }

    return c.json({ success: true, data });
  } catch (err) {
    console.error("審査目標取得エラー:", err);
    return c.json({ error: "審査目標の取得に失敗しました" }, 500);
  }
});

// PUT / — 審査目標を UPSERT
app.put("/", authMiddleware, premiumMiddleware, async (c) => {
  const userId = c.get("userId");
  const supabase = c.get("supabase")!;

  try {
    const body = await c.req.json<{
      exam_rank: string;
      exam_date: string;
      prev_exam_date?: string | null;
      target_attendance: number;
    }>();

    const { error } = await supabase.from("UserExamGoal").upsert(
      {
        user_id: userId,
        exam_rank: body.exam_rank,
        exam_date: body.exam_date,
        prev_exam_date: body.prev_exam_date ?? null,
        target_attendance: body.target_attendance,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) {
      console.error("審査目標更新エラー:", error);
      return c.json({ error: "審査目標の更新に失敗しました" }, 500);
    }

    return c.json({ success: true });
  } catch (err) {
    console.error("審査目標更新エラー:", err);
    return c.json({ error: "審査目標の更新に失敗しました" }, 500);
  }
});

// DELETE / — 審査目標を削除
app.delete("/", authMiddleware, premiumMiddleware, async (c) => {
  const userId = c.get("userId");
  const supabase = c.get("supabase")!;

  try {
    const { error } = await supabase
      .from("UserExamGoal")
      .delete()
      .eq("user_id", userId);

    if (error) {
      console.error("審査目標削除エラー:", error);
      return c.json({ error: "審査目標の削除に失敗しました" }, 500);
    }

    return c.json({ success: true });
  } catch (err) {
    console.error("審査目標削除エラー:", err);
    return c.json({ error: "審査目標の削除に失敗しました" }, 500);
  }
});

export default app;

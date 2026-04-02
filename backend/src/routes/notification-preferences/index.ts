import type { SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { authMiddleware, premiumMiddleware } from "../../middleware/auth.js";

type NotificationPreferencesBindings = {
  JWT_SECRET?: string;
};

type NotificationPreferencesVariables = {
  supabase: SupabaseClient | null;
  userId: string;
};

/**
 * 時刻を5分刻みに丸める（Cron ジョブが5分間隔のため）
 * "21:03" → "21:05", "21:07" → "21:05", "23:58" → "00:00"
 */
function roundToFiveMinutes(time: string): string {
  const parts = time.split(":").map(Number);
  const hours = parts[0] ?? 0;
  const minutes = parts[1] ?? 0;
  const rounded = Math.round(minutes / 5) * 5;
  if (rounded === 60) {
    return `${String((hours + 1) % 24).padStart(2, "0")}:00`;
  }
  return `${String(hours).padStart(2, "0")}:${String(rounded).padStart(2, "0")}`;
}

const app = new Hono<{
  Bindings: NotificationPreferencesBindings;
  Variables: NotificationPreferencesVariables;
}>();

// GET / — 通知設定 + リマインダー一覧を取得
app.get("/", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const supabase = c.get("supabase")!;

  try {
    // 通知設定を取得
    const { data: preferences, error: prefError } = await supabase
      .from("UserNotificationPreference")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (prefError) {
      console.error("通知設定取得エラー:", prefError);
      return c.json({ error: "通知設定の取得に失敗しました" }, 500);
    }

    // リマインダー一覧を取得
    const { data: reminders, error: reminderError } = await supabase
      .from("UserPracticeReminder")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (reminderError) {
      console.error("リマインダー取得エラー:", reminderError);
      return c.json({ error: "リマインダーの取得に失敗しました" }, 500);
    }

    // 設定がない場合はデフォルト値を返す
    const defaultPreferences = {
      notify_favorite: true,
      notify_reply: true,
      notify_reply_to_thread: true,
      notify_streak: true,
      reminder_enabled: false,
    };

    return c.json({
      success: true,
      data: {
        preferences: preferences ?? defaultPreferences,
        reminders: reminders ?? [],
      },
    });
  } catch (err) {
    console.error("通知設定取得エラー:", err);
    return c.json({ error: "通知設定の取得に失敗しました" }, 500);
  }
});

// PUT / — ソーシャル通知 ON/OFF + リマインダー ON/OFF を更新
app.put("/", authMiddleware, premiumMiddleware, async (c) => {
  const userId = c.get("userId");
  const supabase = c.get("supabase")!;

  try {
    const body = await c.req.json<{
      notify_favorite?: boolean;
      notify_reply?: boolean;
      notify_reply_to_thread?: boolean;
      notify_streak?: boolean;
      reminder_enabled?: boolean;
    }>();

    const { error } = await supabase.from("UserNotificationPreference").upsert(
      {
        user_id: userId,
        notify_favorite: body.notify_favorite ?? true,
        notify_reply: body.notify_reply ?? true,
        notify_reply_to_thread: body.notify_reply_to_thread ?? true,
        notify_streak: body.notify_streak ?? true,
        reminder_enabled: body.reminder_enabled ?? false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) {
      console.error("通知設定更新エラー:", error);
      return c.json({ error: "通知設定の更新に失敗しました" }, 500);
    }

    return c.json({ success: true });
  } catch (err) {
    console.error("通知設定更新エラー:", err);
    return c.json({ error: "通知設定の更新に失敗しました" }, 500);
  }
});

// POST /reminders — リマインダー追加（最大5件チェック）
app.post("/reminders", authMiddleware, premiumMiddleware, async (c) => {
  const userId = c.get("userId");
  const supabase = c.get("supabase")!;

  try {
    const body = await c.req.json<{
      reminder_time?: string;
      reminder_days?: number[];
      timezone?: string;
    }>();

    // 既存件数チェック
    const { count, error: countError } = await supabase
      .from("UserPracticeReminder")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if (countError) {
      console.error("リマインダー件数取得エラー:", countError);
      return c.json({ error: "リマインダーの件数取得に失敗しました" }, 500);
    }

    if ((count ?? 0) >= 5) {
      return c.json({ error: "リマインダーは最大5件までです" }, 400);
    }

    const { data, error } = await supabase
      .from("UserPracticeReminder")
      .insert({
        user_id: userId,
        reminder_time: roundToFiveMinutes(body.reminder_time ?? "21:00"),
        reminder_days: body.reminder_days ?? [],
        timezone: body.timezone ?? "Asia/Tokyo",
      })
      .select()
      .single();

    if (error) {
      console.error("リマインダー追加エラー:", error);
      return c.json({ error: "リマインダーの追加に失敗しました" }, 500);
    }

    return c.json({ success: true, data });
  } catch (err) {
    console.error("リマインダー追加エラー:", err);
    return c.json({ error: "リマインダーの追加に失敗しました" }, 500);
  }
});

// PUT /reminders/:id — リマインダー更新
app.put("/reminders/:id", authMiddleware, premiumMiddleware, async (c) => {
  const userId = c.get("userId");
  const supabase = c.get("supabase")!;

  try {
    const reminderId = c.req.param("id");

    // user_id の一致チェック
    const { data: existing, error: fetchError } = await supabase
      .from("UserPracticeReminder")
      .select("user_id")
      .eq("id", reminderId)
      .single();

    if (fetchError || !existing) {
      return c.json({ error: "リマインダーが見つかりません" }, 404);
    }

    if (existing.user_id !== userId) {
      return c.json({ error: "権限がありません" }, 403);
    }

    const body = await c.req.json<{
      reminder_time?: string;
      reminder_days?: number[];
      timezone?: string;
    }>();

    const { data, error } = await supabase
      .from("UserPracticeReminder")
      .update({
        reminder_time: body.reminder_time
          ? roundToFiveMinutes(body.reminder_time)
          : undefined,
        reminder_days: body.reminder_days,
        timezone: body.timezone,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reminderId)
      .select()
      .single();

    if (error) {
      console.error("リマインダー更新エラー:", error);
      return c.json({ error: "リマインダーの更新に失敗しました" }, 500);
    }

    return c.json({ success: true, data });
  } catch (err) {
    console.error("リマインダー更新エラー:", err);
    return c.json({ error: "リマインダーの更新に失敗しました" }, 500);
  }
});

// DELETE /reminders/:id — リマインダー削除
app.delete("/reminders/:id", authMiddleware, premiumMiddleware, async (c) => {
  const userId = c.get("userId");
  const supabase = c.get("supabase")!;

  try {
    const reminderId = c.req.param("id");

    // user_id の一致チェック
    const { data: existing, error: fetchError } = await supabase
      .from("UserPracticeReminder")
      .select("user_id")
      .eq("id", reminderId)
      .single();

    if (fetchError || !existing) {
      return c.json({ error: "リマインダーが見つかりません" }, 404);
    }

    if (existing.user_id !== userId) {
      return c.json({ error: "権限がありません" }, 403);
    }

    const { error } = await supabase
      .from("UserPracticeReminder")
      .delete()
      .eq("id", reminderId);

    if (error) {
      console.error("リマインダー削除エラー:", error);
      return c.json({ error: "リマインダーの削除に失敗しました" }, 500);
    }

    return c.json({ success: true });
  } catch (err) {
    console.error("リマインダー削除エラー:", err);
    return c.json({ error: "リマインダーの削除に失敗しました" }, 500);
  }
});

export default app;

import type { SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { authMiddleware } from "../../middleware/auth.js";

type PushTokensBindings = {
  JWT_SECRET?: string;
};

type PushTokensVariables = {
  supabase: SupabaseClient | null;
  userId: string;
};

const app = new Hono<{
  Bindings: PushTokensBindings;
  Variables: PushTokensVariables;
}>();

// POST / — プッシュトークン登録（UPSERT）
app.post("/", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const supabase = c.get("supabase")!;

  const body = await c.req.json<{
    expo_push_token?: string;
    platform?: string;
  }>();

  if (!body.expo_push_token || !body.platform) {
    return c.json({ error: "expo_push_token と platform は必須です" }, 400);
  }

  if (!["ios", "android"].includes(body.platform)) {
    return c.json({ error: "platform は ios または android です" }, 400);
  }

  const { error } = await supabase.from("UserPushToken").upsert(
    {
      user_id: userId,
      expo_push_token: body.expo_push_token,
      platform: body.platform,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,expo_push_token" },
  );

  if (error) {
    console.error("プッシュトークン登録エラー:", error);
    return c.json({ error: "トークン登録に失敗しました" }, 500);
  }

  return c.json({ success: true });
});

// DELETE / — プッシュトークン削除（ログアウト時）
app.delete("/", authMiddleware, async (c) => {
  const supabase = c.get("supabase")!;

  const body = await c.req.json<{ expo_push_token?: string }>();

  if (!body.expo_push_token) {
    return c.json({ error: "expo_push_token は必須です" }, 400);
  }

  const { error } = await supabase
    .from("UserPushToken")
    .delete()
    .eq("expo_push_token", body.expo_push_token);

  if (error) {
    console.error("プッシュトークン削除エラー:", error);
    return c.json({ error: "トークン削除に失敗しました" }, 500);
  }

  return c.json({ success: true });
});

export default app;

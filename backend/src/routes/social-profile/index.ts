import type { SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { extractTokenFromHeader, verifyToken } from "../../lib/jwt.js";
import { getSocialProfile } from "../../lib/supabase.js";

type ProfileBindings = {
  JWT_SECRET?: string;
};

type ProfileVariables = {
  supabase: SupabaseClient | null;
};

const app = new Hono<{
  Bindings: ProfileBindings;
  Variables: ProfileVariables;
}>();

// GET /:userId — ソーシャルプロフィール取得
app.get("/:userId", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const token = extractTokenFromHeader(authHeader);
    const payload = await verifyToken(token, c.env);

    const targetUserId = c.req.param("userId");

    const supabase = c.get("supabase");
    if (!supabase) {
      return c.json({ success: false, error: "サーバー設定が不正です" }, 500);
    }

    // viewer の dojo_style_id を取得
    const { data: viewer } = await supabase
      .from("User")
      .select("dojo_style_id")
      .eq("id", payload.userId)
      .single();

    const viewerDojoStyleId = viewer?.dojo_style_id ?? null;

    const profile = await getSocialProfile(
      supabase,
      targetUserId,
      payload.userId,
      viewerDojoStyleId,
    );

    if (!profile) {
      return c.json({ success: false, error: "ユーザーが見つかりません" }, 404);
    }

    return c.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("token") ||
        error.message.includes("Authorization"))
    ) {
      return c.json({ success: false, error: "認証に失敗しました" }, 401);
    }
    console.error("プロフィール取得エラー:", error);
    return c.json(
      { success: false, error: "プロフィールの取得に失敗しました" },
      500,
    );
  }
});

export default app;

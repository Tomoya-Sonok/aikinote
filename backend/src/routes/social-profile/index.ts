import type { SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { getSocialProfile } from "../../lib/supabase.js";
import { authMiddleware } from "../../middleware/auth.js";

type ProfileBindings = {
  JWT_SECRET?: string;
};

type ProfileVariables = {
  supabase: SupabaseClient | null;
  userId: string;
};

const app = new Hono<{
  Bindings: ProfileBindings;
  Variables: ProfileVariables;
}>();

// GET /:userId — ソーシャルプロフィール取得
app.get("/:userId", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const supabase = c.get("supabase")!;

  try {
    const targetUserId = c.req.param("userId");

    // viewer の dojo_style_id を取得
    const { data: viewer } = await supabase
      .from("User")
      .select("dojo_style_id")
      .eq("id", userId)
      .single();

    const viewerDojoStyleId = viewer?.dojo_style_id ?? null;

    const profile = await getSocialProfile(
      supabase,
      targetUserId,
      userId,
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
    console.error("プロフィール取得エラー:", error);
    return c.json(
      { success: false, error: "プロフィールの取得に失敗しました" },
      500,
    );
  }
});

export default app;

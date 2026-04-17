import type { SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import {
  getPublicSocialProfile,
  getSocialProfile,
} from "../../lib/supabase.js";
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

// GET /public/:username — 未認証ユーザー向けプロフィール取得（publicity_setting=public のみ）
app.get("/public/:username", async (c) => {
  try {
    const targetUsername = c.req.param("username");
    const supabase = c.get("supabase");

    if (!supabase) {
      return c.json({ success: false, error: "サーバー設定が不正です" }, 500);
    }

    const profile = await getPublicSocialProfile(supabase, targetUsername);

    if (!profile) {
      return c.json({ success: false, error: "ユーザーが見つかりません" }, 404);
    }

    return c.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error("公開プロフィール取得エラー:", error);
    return c.json(
      { success: false, error: "プロフィールの取得に失敗しました" },
      500,
    );
  }
});

// GET /:username — ソーシャルプロフィール取得
app.get("/:username", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const supabase = c.get("supabase")!;

  try {
    const targetUsername = c.req.param("username");

    // viewer の dojo_style_id を取得
    const { data: viewer } = await supabase
      .from("User")
      .select("dojo_style_id")
      .eq("id", userId)
      .single();

    const viewerDojoStyleId = viewer?.dojo_style_id ?? null;

    const profile = await getSocialProfile(
      supabase,
      targetUsername,
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

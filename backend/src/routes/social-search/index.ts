import { zValidator } from "@hono/zod-validator";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { extractTokenFromHeader, verifyToken } from "../../lib/jwt.js";
import { enrichSocialPosts, searchSocialPosts } from "../../lib/supabase.js";
import { searchSocialPostsSchema } from "../../lib/validation.js";

type SearchBindings = {
  JWT_SECRET?: string;
};

type SearchVariables = {
  supabase: SupabaseClient | null;
};

const app = new Hono<{
  Bindings: SearchBindings;
  Variables: SearchVariables;
}>();

// GET / — 投稿検索
app.get("/", zValidator("query", searchSocialPostsSchema), async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const token = extractTokenFromHeader(authHeader);
    const payload = await verifyToken(token, c.env);

    const { user_id, query, dojo_name, rank, limit, offset } =
      c.req.valid("query");

    if (payload.userId !== user_id) {
      return c.json({ success: false, error: "認証エラー" }, 403);
    }

    const supabase = c.get("supabase");
    if (!supabase) {
      return c.json({ success: false, error: "サーバー設定が不正です" }, 500);
    }

    // viewer の dojo_style_id を取得
    const { data: viewer } = await supabase
      .from("User")
      .select("dojo_style_id")
      .eq("id", user_id)
      .single();

    const viewerDojoStyleId = viewer?.dojo_style_id ?? null;

    const posts = await searchSocialPosts(
      supabase,
      user_id,
      viewerDojoStyleId,
      {
        query,
        dojo_name,
        rank,
        limit,
        offset,
      },
    );

    // バッチクエリでエンリッチ（N+1 解消）
    const enrichedPosts = await enrichSocialPosts(supabase, posts, user_id);

    return c.json({
      success: true,
      data: enrichedPosts,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("token") ||
        error.message.includes("Authorization"))
    ) {
      return c.json({ success: false, error: "認証に失敗しました" }, 401);
    }
    console.error("投稿検索エラー:", error);
    return c.json({ success: false, error: "投稿の検索に失敗しました" }, 500);
  }
});

export default app;

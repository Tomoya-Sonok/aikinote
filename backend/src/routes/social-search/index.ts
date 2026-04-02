import { zValidator } from "@hono/zod-validator";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import {
  enrichSocialPosts,
  getTrendingHashtags,
  searchSocialPosts,
} from "../../lib/supabase.js";
import {
  getTrendingHashtagsSchema,
  searchSocialPostsSchema,
} from "../../lib/validation.js";
import { authMiddleware, premiumMiddleware } from "../../middleware/auth.js";

type SearchBindings = {
  JWT_SECRET?: string;
};

type SearchVariables = {
  supabase: SupabaseClient | null;
  userId: string;
};

const app = new Hono<{
  Bindings: SearchBindings;
  Variables: SearchVariables;
}>();

// GET /trending — トレンドハッシュタグ取得
app.get(
  "/trending",
  authMiddleware,
  zValidator("query", getTrendingHashtagsSchema),
  async (c) => {
    try {
      const { limit } = c.req.valid("query");
      const supabase = c.get("supabase")!;

      const trending = await getTrendingHashtags(supabase, limit);

      return c.json({
        success: true,
        data: trending,
      });
    } catch (error) {
      console.error("トレンド取得エラー:", error);
      return c.json(
        { success: false, error: "トレンドの取得に失敗しました" },
        500,
      );
    }
  },
);

// GET / — 投稿検索
app.get(
  "/",
  authMiddleware,
  premiumMiddleware,
  zValidator("query", searchSocialPostsSchema),
  async (c) => {
    try {
      const userId = c.get("userId");
      const {
        user_id,
        query,
        dojo_name,
        rank,
        hashtag,
        post_type,
        limit,
        offset,
      } = c.req.valid("query");

      if (userId !== user_id) {
        return c.json({ success: false, error: "認証エラー" }, 403);
      }

      const supabase = c.get("supabase")!;

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
          hashtag,
          post_type,
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
      console.error("投稿検索エラー:", error);
      return c.json({ success: false, error: "投稿の検索に失敗しました" }, 500);
    }
  },
);

export default app;

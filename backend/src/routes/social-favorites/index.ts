import type { SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { extractTokenFromHeader, verifyToken } from "../../lib/jwt.js";
import {
  createNotification,
  deleteNotificationByFavorite,
  getSocialPostById,
  toggleSocialFavorite,
} from "../../lib/supabase.js";

type FavoritesBindings = {
  JWT_SECRET?: string;
};

type FavoritesVariables = {
  supabase: SupabaseClient | null;
};

const app = new Hono<{
  Bindings: FavoritesBindings;
  Variables: FavoritesVariables;
}>();

// POST /:postId — お気に入りトグル
app.post("/:postId", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const token = extractTokenFromHeader(authHeader);
    const payload = await verifyToken(token, c.env);

    const postId = c.req.param("postId");

    const supabase = c.get("supabase");
    if (!supabase) {
      return c.json({ success: false, error: "サーバー設定が不正です" }, 500);
    }

    // 投稿存在チェック
    const post = await getSocialPostById(supabase, postId);
    if (!post) {
      return c.json({ success: false, error: "投稿が見つかりません" }, 404);
    }

    const result = await toggleSocialFavorite(supabase, postId, payload.userId);

    // 通知管理
    if (result.is_favorited) {
      await createNotification(supabase, {
        type: "favorite",
        recipient_user_id: post.user_id,
        actor_user_id: payload.userId,
        post_id: postId,
      });
    } else {
      await deleteNotificationByFavorite(supabase, postId, payload.userId);
    }

    // 最新の favorite_count を取得
    const updatedPost = await getSocialPostById(supabase, postId);

    return c.json({
      success: true,
      data: {
        is_favorited: result.is_favorited,
        // favorite_count は投稿者本人のみ返却
        favorite_count:
          post.user_id === payload.userId
            ? updatedPost?.favorite_count
            : undefined,
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("token") ||
        error.message.includes("Authorization"))
    ) {
      return c.json({ success: false, error: "認証に失敗しました" }, 401);
    }
    console.error("お気に入りトグルエラー:", error);
    return c.json(
      { success: false, error: "お気に入りの更新に失敗しました" },
      500,
    );
  }
});

export default app;

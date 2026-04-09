import type { SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { sendPushToUser } from "../../lib/push-notification.js";
import { isPremiumUser } from "../../lib/subscription.js";
import {
  checkRateLimit,
  createNotification,
  deleteNotificationByFavorite,
  deleteNotificationByReplyFavorite,
  getSocialPostById,
  getSocialReplyById,
  toggleReplyFavorite,
  toggleSocialFavorite,
} from "../../lib/supabase.js";
import { authMiddleware } from "../../middleware/auth.js";

type FavoritesBindings = {
  JWT_SECRET?: string;
};

type FavoritesVariables = {
  supabase: SupabaseClient | null;
  userId: string;
};

const app = new Hono<{
  Bindings: FavoritesBindings;
  Variables: FavoritesVariables;
}>();

// POST /:postId — お気に入りトグル
app.post("/:postId", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const supabase = c.get("supabase")!;

  try {
    const postId = c.req.param("postId");

    // 投稿存在チェック
    const post = await getSocialPostById(supabase, postId);
    if (!post) {
      return c.json({ success: false, error: "投稿が見つかりません" }, 404);
    }

    // Free ユーザー: 1日5件までお気に入り登録可能（解除は制限なし）
    const existingFav = await supabase
      .from("SocialFavorite")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .maybeSingle();
    const isCurrentlyFavorited = !!existingFav.data;

    if (!isCurrentlyFavorited) {
      const premium = await isPremiumUser(supabase, userId);
      if (!premium) {
        const dailyLimited = await checkRateLimit(
          supabase,
          userId,
          "SocialFavorite",
          1440,
          5,
        );
        if (dailyLimited) {
          return c.json(
            {
              success: false,
              error: "1日のお気に入り上限（5件）に達しました",
              code: "DAILY_LIMIT_REACHED",
            },
            429,
          );
        }
      }
    }

    const result = await toggleSocialFavorite(supabase, postId, userId);

    // 通知管理
    if (result.is_favorited) {
      await createNotification(supabase, {
        type: "favorite",
        recipient_user_id: post.user_id,
        actor_user_id: userId,
        post_id: postId,
      });
      // プッシュ通知送信
      await sendPushToUser(supabase, post.user_id, {
        type: "favorite",
        actorUserId: userId,
        postId,
      });
    } else {
      await deleteNotificationByFavorite(supabase, postId, userId);
    }

    // 最新の favorite_count を取得
    const updatedPost = await getSocialPostById(supabase, postId);

    return c.json({
      success: true,
      data: {
        is_favorited: result.is_favorited,
        // favorite_count は投稿者本人のみ返却
        favorite_count:
          post.user_id === userId ? updatedPost?.favorite_count : undefined,
      },
    });
  } catch (error) {
    console.error("お気に入りトグルエラー:", error);
    return c.json(
      { success: false, error: "お気に入りの更新に失敗しました" },
      500,
    );
  }
});

// POST /reply/:replyId — 返信お気に入りトグル
app.post("/reply/:replyId", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const supabase = c.get("supabase")!;

  try {
    const replyId = c.req.param("replyId");

    // 返信存在チェック
    const reply = await getSocialReplyById(supabase, replyId);
    if (!reply) {
      return c.json({ success: false, error: "返信が見つかりません" }, 404);
    }

    // Free ユーザー: 1日5件までお気に入り登録可能（解除は制限なし）
    const existingFav = await supabase
      .from("SocialFavorite")
      .select("id")
      .eq("reply_id", replyId)
      .eq("user_id", userId)
      .maybeSingle();
    const isCurrentlyFavorited = !!existingFav.data;

    if (!isCurrentlyFavorited) {
      const premium = await isPremiumUser(supabase, userId);
      if (!premium) {
        const dailyLimited = await checkRateLimit(
          supabase,
          userId,
          "SocialFavorite",
          1440,
          5,
        );
        if (dailyLimited) {
          return c.json(
            {
              success: false,
              error: "1日のお気に入り上限（5件）に達しました",
              code: "DAILY_LIMIT_REACHED",
            },
            429,
          );
        }
      }
    }

    const result = await toggleReplyFavorite(supabase, replyId, userId);

    // 通知管理
    if (result.is_favorited) {
      await createNotification(supabase, {
        type: "favorite_reply",
        recipient_user_id: reply.user_id,
        actor_user_id: userId,
        post_id: reply.post_id,
        reply_id: replyId,
      });
      await sendPushToUser(supabase, reply.user_id, {
        type: "favorite_reply",
        actorUserId: userId,
        postId: reply.post_id,
      });
    } else {
      await deleteNotificationByReplyFavorite(supabase, replyId, userId);
    }

    // 最新の favorite_count を取得
    const updatedReply = await getSocialReplyById(supabase, replyId);

    return c.json({
      success: true,
      data: {
        is_favorited: result.is_favorited,
        favorite_count: updatedReply?.favorite_count ?? 0,
      },
    });
  } catch (error) {
    console.error("返信お気に入りトグルエラー:", error);
    return c.json(
      { success: false, error: "お気に入りの更新に失敗しました" },
      500,
    );
  }
});

export default app;

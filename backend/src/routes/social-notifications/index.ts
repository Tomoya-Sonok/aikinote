import { zValidator } from "@hono/zod-validator";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { extractTokenFromHeader, verifyToken } from "../../lib/jwt.js";
import { getNotifications, markNotificationsRead } from "../../lib/supabase.js";
import {
  getNotificationsSchema,
  markNotificationsReadSchema,
} from "../../lib/validation.js";

type NotificationsBindings = {
  JWT_SECRET?: string;
};

type NotificationsVariables = {
  supabase: SupabaseClient | null;
};

const app = new Hono<{
  Bindings: NotificationsBindings;
  Variables: NotificationsVariables;
}>();

// GET / — 通知一覧
app.get("/", zValidator("query", getNotificationsSchema), async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const token = extractTokenFromHeader(authHeader);
    const payload = await verifyToken(token, c.env);

    const { limit, offset } = c.req.valid("query");

    const supabase = c.get("supabase");
    if (!supabase) {
      return c.json({ success: false, error: "サーバー設定が不正です" }, 500);
    }

    const notifications = await getNotifications(
      supabase,
      payload.userId,
      limit,
      offset,
    );

    // 投稿プレビュー（先頭50文字）を付加
    const enriched = await Promise.all(
      // biome-ignore lint/suspicious/noExplicitAny: Supabase join result
      notifications.map(async (notification: any) => {
        let postPreview: string | null = null;

        if (notification.post_id) {
          const { data: post } = await supabase
            .from("SocialPost")
            .select("content")
            .eq("id", notification.post_id)
            .single();

          if (post?.content) {
            postPreview =
              post.content.length > 50
                ? `${post.content.substring(0, 50)}...`
                : post.content;
          }
        }

        return {
          ...notification,
          actor: notification.User ?? null,
          post_preview: postPreview,
          User: undefined,
        };
      }),
    );

    return c.json({
      success: true,
      data: enriched,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("token") ||
        error.message.includes("Authorization"))
    ) {
      return c.json({ success: false, error: "認証に失敗しました" }, 401);
    }
    console.error("通知一覧取得エラー:", error);
    return c.json({ success: false, error: "通知の取得に失敗しました" }, 500);
  }
});

// PATCH /read — 既読化
app.patch(
  "/read",
  zValidator("json", markNotificationsReadSchema),
  async (c) => {
    try {
      const authHeader = c.req.header("Authorization");
      const token = extractTokenFromHeader(authHeader);
      const payload = await verifyToken(token, c.env);

      const { notification_ids, mark_all } = c.req.valid("json");

      const supabase = c.get("supabase");
      if (!supabase) {
        return c.json({ success: false, error: "サーバー設定が不正です" }, 500);
      }

      await markNotificationsRead(
        supabase,
        payload.userId,
        notification_ids,
        mark_all,
      );

      return c.json({
        success: true,
        message: "通知を既読にしました",
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("token") ||
          error.message.includes("Authorization"))
      ) {
        return c.json({ success: false, error: "認証に失敗しました" }, 401);
      }
      console.error("通知既読化エラー:", error);
      return c.json(
        { success: false, error: "通知の既読化に失敗しました" },
        500,
      );
    }
  },
);

export default app;

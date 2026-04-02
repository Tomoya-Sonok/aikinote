import { zValidator } from "@hono/zod-validator";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { createPostReport } from "../../lib/supabase.js";
import { createReportSchema } from "../../lib/validation.js";
import { authMiddleware } from "../../middleware/auth.js";

type ReportsBindings = {
  JWT_SECRET?: string;
};

type ReportsVariables = {
  supabase: SupabaseClient | null;
  userId: string;
};

const app = new Hono<{
  Bindings: ReportsBindings;
  Variables: ReportsVariables;
}>();

// POST /posts/:id — 投稿通報
app.post(
  "/posts/:id",
  authMiddleware,
  zValidator("json", createReportSchema),
  async (c) => {
    try {
      const userId = c.get("userId");
      const postId = c.req.param("id");
      const input = c.req.valid("json");

      if (userId !== input.user_id) {
        return c.json({ success: false, error: "認証エラー" }, 403);
      }

      const supabase = c.get("supabase")!;

      const report = await createPostReport(supabase, {
        reporter_user_id: input.user_id,
        post_id: postId,
        reason: input.reason,
        detail: input.detail,
      });

      return c.json(
        {
          success: true,
          data: report,
          message: "通報を受け付けました",
        },
        201,
      );
    } catch (error) {
      if (error instanceof Error && error.message === "DUPLICATE_REPORT") {
        return c.json({ success: false, error: "既に通報済みです" }, 409);
      }
      console.error("投稿通報エラー:", error);
      return c.json({ success: false, error: "通報の送信に失敗しました" }, 500);
    }
  },
);

// POST /replies/:id — 返信通報
app.post(
  "/replies/:id",
  authMiddleware,
  zValidator("json", createReportSchema),
  async (c) => {
    try {
      const userId = c.get("userId");
      const replyId = c.req.param("id");
      const input = c.req.valid("json");

      if (userId !== input.user_id) {
        return c.json({ success: false, error: "認証エラー" }, 403);
      }

      const supabase = c.get("supabase")!;

      const report = await createPostReport(supabase, {
        reporter_user_id: input.user_id,
        reply_id: replyId,
        reason: input.reason,
        detail: input.detail,
      });

      return c.json(
        {
          success: true,
          data: report,
          message: "通報を受け付けました",
        },
        201,
      );
    } catch (error) {
      if (error instanceof Error && error.message === "DUPLICATE_REPORT") {
        return c.json({ success: false, error: "既に通報済みです" }, 409);
      }
      console.error("返信通報エラー:", error);
      return c.json({ success: false, error: "通報の送信に失敗しました" }, 500);
    }
  },
);

export default app;

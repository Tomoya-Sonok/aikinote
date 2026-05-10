import { zValidator } from "@hono/zod-validator";
import type { SupabaseClient } from "@supabase/supabase-js";
import { type Context, Hono } from "hono";
import {
  notifyReportEmail,
  type ReportEmailParams,
} from "../../lib/report-notification.js";
import { createPostReport } from "../../lib/supabase.js";
import { createReportSchema } from "../../lib/validation.js";
import { authMiddleware } from "../../middleware/auth.js";

type ReportsBindings = {
  JWT_SECRET?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  NEXT_PUBLIC_APP_URL?: string;
};

type ReportsVariables = {
  supabase: SupabaseClient | null;
  userId: string;
};

type ReportsContext = Context<{
  Bindings: ReportsBindings;
  Variables: ReportsVariables;
}>;

const CONTENT_SNIPPET_MAX_LENGTH = 200;

const FALLBACK_BASE_URL = "https://www.aikinote.com";

const getEnv = (
  c: ReportsContext,
  key: keyof ReportsBindings,
): string | undefined =>
  c.env?.[key] ??
  (typeof process !== "undefined" ? process.env?.[key] : undefined);

const resolveAppBaseUrl = (c: ReportsContext): string => {
  const xAppUrl = c.req.header("X-App-Url");
  if (xAppUrl) return xAppUrl.replace(/\/+$/, "");
  const envUrl = getEnv(c, "NEXT_PUBLIC_APP_URL");
  if (envUrl) return envUrl.replace(/\/+$/, "");
  return FALLBACK_BASE_URL;
};

const truncate = (value: string, max: number): string =>
  value.length <= max ? value : `${value.slice(0, max)}…`;

const fetchUsername = async (
  supabase: SupabaseClient,
  userId: string,
): Promise<string> => {
  const { data } = await supabase
    .from("User")
    .select("username")
    .eq("id", userId)
    .maybeSingle();
  return (data?.username as string | undefined) ?? "(不明)";
};

const fetchPostForReport = async (
  supabase: SupabaseClient,
  postId: string,
): Promise<{ content: string; userId: string }> => {
  const { data } = await supabase
    .from("SocialPost")
    .select("content, user_id")
    .eq("id", postId)
    .maybeSingle();
  return {
    content: (data?.content as string | undefined) ?? "",
    userId: (data?.user_id as string | undefined) ?? "",
  };
};

const fetchReplyForReport = async (
  supabase: SupabaseClient,
  replyId: string,
): Promise<{ content: string; userId: string; postId: string }> => {
  const { data } = await supabase
    .from("SocialReply")
    .select("content, user_id, post_id")
    .eq("id", replyId)
    .maybeSingle();
  return {
    content: (data?.content as string | undefined) ?? "",
    userId: (data?.user_id as string | undefined) ?? "",
    postId: (data?.post_id as string | undefined) ?? "",
  };
};

const queueReportEmail = (
  c: ReportsContext,
  params: ReportEmailParams,
): void => {
  const env = {
    resendApiKey: getEnv(c, "RESEND_API_KEY"),
    resendFromEmail: getEnv(c, "RESEND_FROM_EMAIL"),
  };
  // c.executionCtx は Cloudflare Workers Runtime 外（テスト等）では getter が
  // throw する仕様のため、try/catch で防御。テスト環境では fire-and-forget だが
  // notifyReportEmail 内部で try/catch しているので unhandled rejection にはならない。
  try {
    c.executionCtx.waitUntil(notifyReportEmail(params, env));
  } catch {
    void notifyReportEmail(params, env);
  }
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

      // 通報受領を運営に Email 通知（fire-and-forget、本体処理は止めない）
      try {
        const [reporterUsername, post] = await Promise.all([
          fetchUsername(supabase, input.user_id),
          fetchPostForReport(supabase, postId),
        ]);
        const targetUsername = post.userId
          ? await fetchUsername(supabase, post.userId)
          : "(不明)";
        const baseUrl = resolveAppBaseUrl(c);

        queueReportEmail(c, {
          type: "post",
          reportId: report.id,
          reason: input.reason,
          detail: input.detail ?? null,
          reporterUsername,
          targetUsername,
          contentSnippet: truncate(post.content, CONTENT_SNIPPET_MAX_LENGTH),
          targetUrl: `${baseUrl}/social/posts/${postId}`,
        });
      } catch (notifyError) {
        console.error("[Report] 投稿通報の通知準備でエラー:", notifyError);
      }

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

      // 通報受領を運営に Email 通知（fire-and-forget、本体処理は止めない）
      try {
        const [reporterUsername, reply] = await Promise.all([
          fetchUsername(supabase, input.user_id),
          fetchReplyForReport(supabase, replyId),
        ]);
        const targetUsername = reply.userId
          ? await fetchUsername(supabase, reply.userId)
          : "(不明)";
        const baseUrl = resolveAppBaseUrl(c);
        const targetUrl = reply.postId
          ? `${baseUrl}/social/posts/${reply.postId}#reply-${replyId}`
          : `${baseUrl}/social/posts/`;

        queueReportEmail(c, {
          type: "reply",
          reportId: report.id,
          reason: input.reason,
          detail: input.detail ?? null,
          reporterUsername,
          targetUsername,
          contentSnippet: truncate(reply.content, CONTENT_SNIPPET_MAX_LENGTH),
          targetUrl,
        });
      } catch (notifyError) {
        console.error("[Report] 返信通報の通知準備でエラー:", notifyError);
      }

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

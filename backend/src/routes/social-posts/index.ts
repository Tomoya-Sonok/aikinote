import { zValidator } from "@hono/zod-validator";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { extractTokenFromHeader, verifyToken } from "../../lib/jwt.js";
import { containsNgWord } from "../../lib/ng-word.js";
import {
  createNotification,
  createSocialPost,
  createSocialPostTags,
  createSocialReply,
  getSocialFeed,
  getSocialPostById,
  getSocialPostWithDetails,
  softDeleteSocialPost,
  updateSocialPost,
  updateSocialPostTags,
} from "../../lib/supabase.js";
import {
  createSocialPostSchema,
  createSocialReplySchema,
  getSocialPostsSchema,
  updateSocialPostSchema,
} from "../../lib/validation.js";

type SocialPostsBindings = {
  JWT_SECRET?: string;
};

type SocialPostsVariables = {
  supabase: SupabaseClient | null;
};

const app = new Hono<{
  Bindings: SocialPostsBindings;
  Variables: SocialPostsVariables;
}>();

const resolveSupabase = (c: {
  get: (key: "supabase") => SupabaseClient | null;
}): SupabaseClient | null => {
  return c.get("supabase");
};

const authenticateRequest = async (c: {
  req: { header: (name: string) => string | undefined };
  env: SocialPostsBindings;
}) => {
  const authHeader = c.req.header("Authorization");
  const token = extractTokenFromHeader(authHeader);
  return verifyToken(token, c.env);
};

// GET / — フィード取得
app.get("/", zValidator("query", getSocialPostsSchema), async (c) => {
  try {
    const payload = await authenticateRequest(c);
    const { user_id, tab, limit, offset } = c.req.valid("query");

    if (payload.userId !== user_id) {
      return c.json({ success: false, error: "認証エラー" }, 403);
    }

    const supabase = resolveSupabase(c);
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

    const posts = await getSocialFeed(
      supabase,
      user_id,
      viewerDojoStyleId,
      tab,
      limit,
      offset,
    );

    // 各投稿に付加情報を追加
    const enrichedPosts = await Promise.all(
      posts.map(async (post) => {
        const [authorResult, attachmentsResult, tagsResult, favoriteResult] =
          await Promise.all([
            supabase
              .from("User")
              .select("id, username, profile_image_url, aikido_rank")
              .eq("id", post.user_id)
              .single(),
            supabase
              .from("SocialPostAttachment")
              .select("*")
              .eq("post_id", post.id)
              .order("sort_order", { ascending: true }),
            supabase
              .from("SocialPostTag")
              .select("user_tag_id, UserTag(id, name, category)")
              .eq("post_id", post.id),
            supabase
              .from("SocialFavorite")
              .select("id")
              .eq("post_id", post.id)
              .eq("user_id", user_id)
              .maybeSingle(),
          ]);

        // biome-ignore lint/suspicious/noExplicitAny: Supabase join result
        const tags = (tagsResult.data ?? []).map((row: any) => ({
          id: row.UserTag?.id ?? row.user_tag_id,
          name: row.UserTag?.name ?? "",
          category: row.UserTag?.category ?? "",
        }));

        return {
          ...post,
          // favorite_count は投稿者本人のみ返却
          favorite_count:
            post.user_id === user_id ? post.favorite_count : undefined,
          author: authorResult.data ?? {
            id: post.user_id,
            username: "",
            profile_image_url: null,
            aikido_rank: null,
          },
          attachments: attachmentsResult.data ?? [],
          tags,
          is_favorited: !!favoriteResult.data,
        };
      }),
    );

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
    console.error("フィード取得エラー:", error);
    return c.json(
      { success: false, error: "フィードの取得に失敗しました" },
      500,
    );
  }
});

// POST / — 投稿作成
app.post("/", zValidator("json", createSocialPostSchema), async (c) => {
  try {
    const payload = await authenticateRequest(c);
    const input = c.req.valid("json");

    if (payload.userId !== input.user_id) {
      return c.json({ success: false, error: "認証エラー" }, 403);
    }

    const supabase = resolveSupabase(c);
    if (!supabase) {
      return c.json({ success: false, error: "サーバー設定が不正です" }, 500);
    }

    // NGワードチェック
    const ngResult = await containsNgWord(input.content, supabase);
    if (ngResult.found) {
      return c.json(
        {
          success: false,
          error: "不適切な表現が含まれています。内容を修正してください。",
        },
        400,
      );
    }

    // User情報取得 (publicity_setting, dojo_style_id, dojo_style_name)
    const { data: user } = await supabase
      .from("User")
      .select("publicity_setting, dojo_style_id, dojo_style_name")
      .eq("id", input.user_id)
      .single();

    if (!user) {
      return c.json({ success: false, error: "ユーザーが見つかりません" }, 404);
    }

    const post = await createSocialPost(supabase, {
      user_id: input.user_id,
      content: input.content,
      post_type: input.post_type,
      visibility: user.publicity_setting ?? "private",
      author_dojo_style_id: user.dojo_style_id ?? null,
      author_dojo_name: user.dojo_style_name ?? null,
      source_page_id: input.source_page_id,
    });

    // タグ紐付け
    if (input.tag_ids && input.tag_ids.length > 0) {
      await createSocialPostTags(supabase, post.id, input.tag_ids);
    }

    return c.json(
      {
        success: true,
        data: post,
        message: "投稿を作成しました",
      },
      201,
    );
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("token") ||
        error.message.includes("Authorization"))
    ) {
      return c.json({ success: false, error: "認証に失敗しました" }, 401);
    }
    console.error("投稿作成エラー:", error);
    return c.json({ success: false, error: "投稿の作成に失敗しました" }, 500);
  }
});

// GET /:id — 投稿詳細
app.get("/:id", async (c) => {
  try {
    const payload = await authenticateRequest(c);
    const postId = c.req.param("id");

    const supabase = resolveSupabase(c);
    if (!supabase) {
      return c.json({ success: false, error: "サーバー設定が不正です" }, 500);
    }

    const details = await getSocialPostWithDetails(
      supabase,
      postId,
      payload.userId,
    );

    if (!details) {
      return c.json({ success: false, error: "投稿が見つかりません" }, 404);
    }

    // 公開範囲チェック
    const { post } = details;
    if (post.visibility === "private" && post.user_id !== payload.userId) {
      return c.json({ success: false, error: "この投稿は閲覧できません" }, 403);
    }

    if (post.visibility === "closed") {
      const { data: viewer } = await supabase
        .from("User")
        .select("dojo_style_id")
        .eq("id", payload.userId)
        .single();

      if (
        post.user_id !== payload.userId &&
        post.author_dojo_style_id !== viewer?.dojo_style_id
      ) {
        return c.json(
          { success: false, error: "この投稿は閲覧できません" },
          403,
        );
      }
    }

    return c.json({
      success: true,
      data: {
        ...details,
        post: {
          ...details.post,
          // favorite_count は投稿者本人のみ返却
          favorite_count:
            post.user_id === payload.userId ? post.favorite_count : undefined,
        },
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
    console.error("投稿詳細取得エラー:", error);
    return c.json({ success: false, error: "投稿の取得に失敗しました" }, 500);
  }
});

// PUT /:id — 投稿更新
app.put("/:id", zValidator("json", updateSocialPostSchema), async (c) => {
  try {
    const payload = await authenticateRequest(c);
    const postId = c.req.param("id");
    const input = c.req.valid("json");

    const supabase = resolveSupabase(c);
    if (!supabase) {
      return c.json({ success: false, error: "サーバー設定が不正です" }, 500);
    }

    // 所有者チェック
    const existing = await getSocialPostById(supabase, postId);
    if (!existing) {
      return c.json({ success: false, error: "投稿が見つかりません" }, 404);
    }
    if (existing.user_id !== payload.userId) {
      return c.json(
        { success: false, error: "この投稿を編集する権限がありません" },
        403,
      );
    }

    // NGワードチェック
    if (input.content) {
      const ngResult = await containsNgWord(input.content, supabase);
      if (ngResult.found) {
        return c.json(
          {
            success: false,
            error: "不適切な表現が含まれています。内容を修正してください。",
          },
          400,
        );
      }
    }

    const updateData: { content?: string } = {};
    if (input.content) updateData.content = input.content;

    const post = await updateSocialPost(
      supabase,
      postId,
      payload.userId,
      updateData,
    );

    // タグ更新
    if (input.tag_ids) {
      await updateSocialPostTags(supabase, postId, input.tag_ids);
    }

    return c.json({
      success: true,
      data: post,
      message: "投稿を更新しました",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("token") ||
        error.message.includes("Authorization"))
    ) {
      return c.json({ success: false, error: "認証に失敗しました" }, 401);
    }
    console.error("投稿更新エラー:", error);
    return c.json({ success: false, error: "投稿の更新に失敗しました" }, 500);
  }
});

// DELETE /:id — 論理削除
app.delete("/:id", async (c) => {
  try {
    const payload = await authenticateRequest(c);
    const postId = c.req.param("id");

    const supabase = resolveSupabase(c);
    if (!supabase) {
      return c.json({ success: false, error: "サーバー設定が不正です" }, 500);
    }

    // 所有者チェック
    const existing = await getSocialPostById(supabase, postId);
    if (!existing) {
      return c.json({ success: false, error: "投稿が見つかりません" }, 404);
    }
    if (existing.user_id !== payload.userId) {
      return c.json(
        { success: false, error: "この投稿を削除する権限がありません" },
        403,
      );
    }

    await softDeleteSocialPost(supabase, postId, payload.userId);

    return c.json({
      success: true,
      message: "投稿を削除しました",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("token") ||
        error.message.includes("Authorization"))
    ) {
      return c.json({ success: false, error: "認証に失敗しました" }, 401);
    }
    console.error("投稿削除エラー:", error);
    return c.json({ success: false, error: "投稿の削除に失敗しました" }, 500);
  }
});

// POST /:id/replies — 返信作成
app.post(
  "/:id/replies",
  zValidator("json", createSocialReplySchema),
  async (c) => {
    try {
      const payload = await authenticateRequest(c);
      const postId = c.req.param("id");
      const input = c.req.valid("json");

      if (payload.userId !== input.user_id) {
        return c.json({ success: false, error: "認証エラー" }, 403);
      }

      const supabase = resolveSupabase(c);
      if (!supabase) {
        return c.json({ success: false, error: "サーバー設定が不正です" }, 500);
      }

      // 投稿存在・公開範囲チェック
      const post = await getSocialPostById(supabase, postId);
      if (!post) {
        return c.json({ success: false, error: "投稿が見つかりません" }, 404);
      }

      if (post.visibility === "private" && post.user_id !== payload.userId) {
        return c.json(
          { success: false, error: "この投稿には返信できません" },
          403,
        );
      }

      if (post.visibility === "closed") {
        const { data: viewer } = await supabase
          .from("User")
          .select("dojo_style_id")
          .eq("id", payload.userId)
          .single();

        if (
          post.user_id !== payload.userId &&
          post.author_dojo_style_id !== viewer?.dojo_style_id
        ) {
          return c.json(
            { success: false, error: "この投稿には返信できません" },
            403,
          );
        }
      }

      // NGワードチェック
      const ngResult = await containsNgWord(input.content, supabase);
      if (ngResult.found) {
        return c.json(
          {
            success: false,
            error: "不適切な表現が含まれています。内容を修正してください。",
          },
          400,
        );
      }

      const reply = await createSocialReply(
        supabase,
        postId,
        input.user_id,
        input.content,
      );

      // 通知作成: 投稿者へ reply 通知
      await createNotification(supabase, {
        type: "reply",
        recipient_user_id: post.user_id,
        actor_user_id: input.user_id,
        post_id: postId,
        reply_id: reply.id,
      });

      // 通知作成: 他の返信者へ reply_to_thread 通知
      const { data: otherRepliers } = await supabase
        .from("SocialReply")
        .select("user_id")
        .eq("post_id", postId)
        .eq("is_deleted", false)
        .neq("user_id", input.user_id)
        .neq("user_id", post.user_id);

      const uniqueRepliers = [
        ...new Set((otherRepliers ?? []).map((r) => r.user_id)),
      ];

      await Promise.all(
        uniqueRepliers.map((replierId) =>
          createNotification(supabase, {
            type: "reply_to_thread",
            recipient_user_id: replierId,
            actor_user_id: input.user_id,
            post_id: postId,
            reply_id: reply.id,
          }),
        ),
      );

      return c.json(
        {
          success: true,
          data: reply,
          message: "返信を作成しました",
        },
        201,
      );
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("token") ||
          error.message.includes("Authorization"))
      ) {
        return c.json({ success: false, error: "認証に失敗しました" }, 401);
      }
      console.error("返信作成エラー:", error);
      return c.json({ success: false, error: "返信の作成に失敗しました" }, 500);
    }
  },
);

export default app;

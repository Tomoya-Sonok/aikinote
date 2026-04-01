import { zValidator } from "@hono/zod-validator";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { extractHashtags } from "../../lib/hashtag.js";
import { extractTokenFromHeader, verifyToken } from "../../lib/jwt.js";
import { containsNgWord } from "../../lib/ng-word.js";
import {
  sendPushToUser,
  sendPushToUsers,
} from "../../lib/push-notification.js";
import { isPremiumUser } from "../../lib/subscription.js";
import {
  checkRateLimit,
  createNotification,
  createSocialPost,
  createSocialPostHashtags,
  createSocialPostTags,
  createSocialReply,
  enrichSocialPosts,
  getSocialFeed,
  getSocialPostById,
  getSocialPostWithDetails,
  getSocialPostWithDetailsPublic,
  getSocialReplyById,
  getSourcePageData,
  getUserPublicityDojos,
  softDeleteSocialPost,
  softDeleteSocialReply,
  updateSocialPost,
  updateSocialPostHashtags,
  updateSocialPostTags,
  updateSocialReply,
  upsertHashtags,
} from "../../lib/supabase.js";
import {
  createSocialPostSchema,
  createSocialReplySchema,
  getSocialPostsSchema,
  updateSocialPostSchema,
  updateSocialReplySchema,
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

/**
 * 投稿の公開範囲チェック（User.publicity_setting ベース）
 * @returns null（アクセス可）| string（エラーメッセージ）
 */
const checkPostVisibility = async (
  supabase: SupabaseClient,
  postOwnerId: string,
  viewerId: string,
): Promise<string | null> => {
  if (postOwnerId === viewerId) return null;

  const { data: postOwner } = await supabase
    .from("User")
    .select("publicity_setting, dojo_style_id")
    .eq("id", postOwnerId)
    .single();

  const publicity = postOwner?.publicity_setting ?? "private";

  if (publicity === "public") return null;

  if (publicity === "private") return "forbidden";

  // publicity === "closed"
  const { data: viewer } = await supabase
    .from("User")
    .select("dojo_style_id")
    .eq("id", viewerId)
    .single();

  const allowedDojos = await getUserPublicityDojos(supabase, postOwnerId);
  if (!viewer?.dojo_style_id || !allowedDojos.includes(viewer.dojo_style_id)) {
    return "forbidden";
  }

  return null;
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

    // バッチクエリでエンリッチ（N+1 解消）
    const enrichedPosts = await enrichSocialPosts(supabase, posts, user_id);

    // Free ユーザー: 初回ページ(offset=0)は全件返却、loadMore(offset>0)はブロック
    const premium = await isPremiumUser(supabase, user_id);

    if (!premium && offset > 0) {
      return c.json({
        success: true,
        data: [],
        is_preview: true,
        premium_required: true,
      });
    }

    return c.json({
      success: true,
      data: enrichedPosts,
      is_preview: !premium,
      premium_required: !premium,
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

    // Premium チェック: Free ユーザーは原則投稿不可
    const premium = await isPremiumUser(supabase, payload.userId);
    if (!premium) {
      // チュートリアル経由の初回投稿のみ許可
      if (input.from_tutorial) {
        const { count } = await supabase
          .from("SocialPost")
          .select("id", { count: "exact", head: true })
          .eq("user_id", payload.userId)
          .eq("is_deleted", false);

        if ((count ?? 0) > 0) {
          return c.json(
            {
              success: false,
              error: "投稿は Premium プランの機能です",
              code: "PREMIUM_REQUIRED",
            },
            403,
          );
        }
      } else {
        return c.json(
          {
            success: false,
            error: "投稿は Premium プランの機能です",
            code: "PREMIUM_REQUIRED",
          },
          403,
        );
      }
    }

    // レート制限チェック（60分以内に10件まで）
    const rateLimited = await checkRateLimit(
      supabase,
      payload.userId,
      "SocialPost",
      60,
      10,
    );
    if (rateLimited) {
      return c.json(
        {
          success: false,
          error: "投稿の頻度が高すぎます。しばらくお待ちください。",
        },
        429,
      );
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
      author_dojo_style_id: user.dojo_style_id ?? null,
      author_dojo_name: user.dojo_style_name ?? null,
      source_page_id: input.source_page_id,
    });

    // タグ紐付け
    if (input.tag_ids && input.tag_ids.length > 0) {
      await createSocialPostTags(supabase, post.id, input.tag_ids);
    }

    // ハッシュタグ抽出・登録
    const hashtagNames = extractHashtags(input.content);
    if (hashtagNames.length > 0) {
      const hashtags = await upsertHashtags(supabase, hashtagNames);
      await createSocialPostHashtags(
        supabase,
        post.id,
        hashtags.map((h) => h.id),
      );
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

// GET /public/:id — 未認証ユーザー向け投稿詳細（publicity_setting=public のみ）
app.get("/public/:id", async (c) => {
  try {
    const postId = c.req.param("id");

    const supabase = resolveSupabase(c);
    if (!supabase) {
      return c.json({ success: false, error: "サーバー設定が不正です" }, 500);
    }

    const details = await getSocialPostWithDetailsPublic(supabase, postId);

    if (!details) {
      return c.json({ success: false, error: "投稿が見つかりません" }, 404);
    }

    // publicity_setting が public でなければ閲覧不可
    const { data: postOwner } = await supabase
      .from("User")
      .select("publicity_setting")
      .eq("id", details.post.user_id)
      .single();

    if (postOwner?.publicity_setting !== "public") {
      return c.json({ success: false, error: "この投稿は閲覧できません" }, 403);
    }

    // training_record の場合、source_page_id からページデータを取得
    let sourcePage = null;
    if (
      details.post.post_type === "training_record" &&
      details.post.source_page_id
    ) {
      sourcePage = await getSourcePageData(
        supabase,
        details.post.source_page_id,
      );
    }

    return c.json({
      success: true,
      data: {
        ...details,
        post: {
          ...details.post,
          favorite_count: undefined,
        },
        source_page: sourcePage,
      },
    });
  } catch (error) {
    console.error("公開投稿詳細取得エラー:", error);
    return c.json({ success: false, error: "投稿の取得に失敗しました" }, 500);
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

    // 公開範囲チェック（User.publicity_setting ベース）
    const { post } = details;
    const visibilityError = await checkPostVisibility(
      supabase,
      post.user_id,
      payload.userId,
    );
    if (visibilityError) {
      return c.json({ success: false, error: "この投稿は閲覧できません" }, 403);
    }

    // training_record の場合、source_page_id からページデータを取得
    let sourcePage = null;
    if (
      post.post_type === "training_record" &&
      post.source_page_id &&
      supabase
    ) {
      sourcePage = await getSourcePageData(supabase, post.source_page_id);
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
        source_page: sourcePage,
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

    // ハッシュタグ更新（contentが変更された場合）
    if (input.content) {
      const hashtagNames = extractHashtags(input.content);
      const hashtags =
        hashtagNames.length > 0
          ? await upsertHashtags(supabase, hashtagNames)
          : [];
      await updateSocialPostHashtags(
        supabase,
        postId,
        hashtags.map((h) => h.id),
      );
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

      // Premium チェック: Free ユーザーは返信不可
      const premiumForReply = await isPremiumUser(supabase, payload.userId);
      if (!premiumForReply) {
        return c.json(
          {
            success: false,
            error: "返信は Premium プランの機能です",
            code: "PREMIUM_REQUIRED",
          },
          403,
        );
      }

      // レート制限チェック（60分以内に20件まで）
      const rateLimited = await checkRateLimit(
        supabase,
        payload.userId,
        "SocialReply",
        60,
        20,
      );
      if (rateLimited) {
        return c.json(
          {
            success: false,
            error: "返信の頻度が高すぎます。しばらくお待ちください。",
          },
          429,
        );
      }

      // 投稿存在・公開範囲チェック
      const post = await getSocialPostById(supabase, postId);
      if (!post) {
        return c.json({ success: false, error: "投稿が見つかりません" }, 404);
      }

      // 公開範囲チェック（User.publicity_setting ベース）
      const replyVisibilityError = await checkPostVisibility(
        supabase,
        post.user_id,
        payload.userId,
      );
      if (replyVisibilityError) {
        return c.json(
          { success: false, error: "この投稿には返信できません" },
          403,
        );
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
      await sendPushToUser(supabase, post.user_id, {
        type: "reply",
        actorUserId: input.user_id,
        postId,
      });

      // 通知作成: 他の返信者へ reply_to_thread 通知（バッチINSERT）
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

      if (uniqueRepliers.length > 0) {
        const notifications = uniqueRepliers.map((replierId) => ({
          type: "reply_to_thread",
          recipient_user_id: replierId,
          actor_user_id: input.user_id,
          post_id: postId,
          reply_id: reply.id,
        }));
        await supabase.from("Notification").insert(notifications);
        await sendPushToUsers(supabase, uniqueRepliers, {
          type: "reply_to_thread",
          actorUserId: input.user_id,
          postId,
        });
      }

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

// PUT /:id/replies/:replyId — 返信編集
app.put(
  "/:id/replies/:replyId",
  zValidator("json", updateSocialReplySchema),
  async (c) => {
    try {
      const payload = await authenticateRequest(c);
      const postId = c.req.param("id");
      const replyId = c.req.param("replyId");
      const input = c.req.valid("json");

      const supabase = resolveSupabase(c);
      if (!supabase) {
        return c.json({ success: false, error: "サーバー設定が不正です" }, 500);
      }

      // 返信存在チェック
      const existingReply = await getSocialReplyById(supabase, replyId);
      if (!existingReply || existingReply.post_id !== postId) {
        return c.json({ success: false, error: "返信が見つかりません" }, 404);
      }

      // owner検証
      if (existingReply.user_id !== payload.userId) {
        return c.json(
          { success: false, error: "この返信を編集する権限がありません" },
          403,
        );
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

      const reply = await updateSocialReply(supabase, replyId, payload.userId, {
        content: input.content,
      });

      return c.json({
        success: true,
        data: reply,
        message: "返信を更新しました",
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("token") ||
          error.message.includes("Authorization"))
      ) {
        return c.json({ success: false, error: "認証に失敗しました" }, 401);
      }
      console.error("返信更新エラー:", error);
      return c.json({ success: false, error: "返信の更新に失敗しました" }, 500);
    }
  },
);

// DELETE /:id/replies/:replyId — 返信削除
app.delete("/:id/replies/:replyId", async (c) => {
  try {
    const payload = await authenticateRequest(c);
    const postId = c.req.param("id");
    const replyId = c.req.param("replyId");

    const supabase = resolveSupabase(c);
    if (!supabase) {
      return c.json({ success: false, error: "サーバー設定が不正です" }, 500);
    }

    // 返信存在チェック
    const existingReply = await getSocialReplyById(supabase, replyId);
    if (!existingReply || existingReply.post_id !== postId) {
      return c.json({ success: false, error: "返信が見つかりません" }, 404);
    }

    // owner検証
    if (existingReply.user_id !== payload.userId) {
      return c.json(
        { success: false, error: "この返信を削除する権限がありません" },
        403,
      );
    }

    await softDeleteSocialReply(supabase, replyId, payload.userId);

    return c.json({
      success: true,
      message: "返信を削除しました",
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("token") ||
        error.message.includes("Authorization"))
    ) {
      return c.json({ success: false, error: "認証に失敗しました" }, 401);
    }
    console.error("返信削除エラー:", error);
    return c.json({ success: false, error: "返信の削除に失敗しました" }, 500);
  }
});

export default app;

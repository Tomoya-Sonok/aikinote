import { zValidator } from "@hono/zod-validator";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { extractHashtags } from "../../lib/hashtag.js";
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
  getCountInWindow,
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
import { authMiddleware } from "../../middleware/auth.js";

type SocialPostsBindings = {
  JWT_SECRET?: string;
};

type SocialPostsVariables = {
  supabase: SupabaseClient | null;
  userId: string;
};

const app = new Hono<{
  Bindings: SocialPostsBindings;
  Variables: SocialPostsVariables;
}>();

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
app.get(
  "/",
  authMiddleware,
  zValidator("query", getSocialPostsSchema),
  async (c) => {
    try {
      const userId = c.get("userId");
      const { user_id, tab, limit, offset } = c.req.valid("query");

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

      return c.json({
        success: true,
        data: enrichedPosts,
      });
    } catch (error) {
      console.error("フィード取得エラー:", error);
      return c.json(
        { success: false, error: "フィードの取得に失敗しました" },
        500,
      );
    }
  },
);

// GET /daily-limits — Free ユーザーの日次投稿・返信使用量を取得
app.get("/daily-limits", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const supabase = c.get("supabase")!;

    const premium = await isPremiumUser(supabase, userId);
    if (premium) {
      return c.json({
        success: true,
        data: {
          posts: { used: 0, limit: -1 },
          replies: { used: 0, limit: -1 },
          favorites: { used: 0, limit: -1 },
          is_premium: true,
        },
      });
    }

    const [postsUsed, repliesUsed, favoritesUsed] = await Promise.all([
      getCountInWindow(supabase, userId, "SocialPost", 1440),
      getCountInWindow(supabase, userId, "SocialReply", 1440),
      getCountInWindow(supabase, userId, "SocialFavorite", 1440),
    ]);

    return c.json({
      success: true,
      data: {
        posts: { used: postsUsed, limit: 3 },
        replies: { used: repliesUsed, limit: 3 },
        favorites: { used: favoritesUsed, limit: 5 },
        is_premium: false,
      },
    });
  } catch (error) {
    console.error("日次制限取得エラー:", error);
    return c.json(
      { success: false, error: "日次制限の取得に失敗しました" },
      500,
    );
  }
});

// POST / — 投稿作成
app.post(
  "/",
  authMiddleware,
  zValidator("json", createSocialPostSchema),
  async (c) => {
    try {
      const userId = c.get("userId");
      const input = c.req.valid("json");

      if (userId !== input.user_id) {
        return c.json({ success: false, error: "認証エラー" }, 403);
      }

      const supabase = c.get("supabase")!;

      // Premium 判定は daily limit を呼ぶか否かに影響するため先に評価する。
      // それ以外の独立した DB アクセス（60分レート制限・NGワード・User取得）と
      // 並列実行して RTT 累積を抑える。
      const [premium, rateLimited, ngResult, userResult] = await Promise.all([
        isPremiumUser(supabase, userId),
        checkRateLimit(supabase, userId, "SocialPost", 60, 10),
        containsNgWord(input.content, supabase),
        supabase
          .from("User")
          .select("publicity_setting, dojo_style_id, dojo_style_name")
          .eq("id", input.user_id)
          .single(),
      ]);

      // Free ユーザーのみ daily limit をチェック
      if (!premium) {
        const dailyLimited = await checkRateLimit(
          supabase,
          userId,
          "SocialPost",
          1440,
          3,
        );
        if (dailyLimited) {
          return c.json(
            {
              success: false,
              error: "1日の投稿上限（3件）に達しました",
              code: "DAILY_LIMIT_REACHED",
            },
            429,
          );
        }
      }

      // レート制限チェック（60分以内に10件まで）
      if (rateLimited) {
        return c.json(
          {
            success: false,
            error: "投稿の頻度が高すぎます。しばらくお待ちください。",
          },
          429,
        );
      }

      // NGワードチェック（拒否）
      if (ngResult.found) {
        console.warn(
          `[NGワード検出] 投稿作成 userId=${input.user_id} matchedWord="${ngResult.matchedWord}"`,
        );
        return c.json(
          {
            success: false,
            error: "不適切な表現が含まれているため投稿できません",
            code: "NG_WORD",
          },
          400,
        );
      }

      const user = userResult.data;
      if (!user) {
        return c.json(
          { success: false, error: "ユーザーが見つかりません" },
          404,
        );
      }

      const post = await createSocialPost(supabase, {
        user_id: input.user_id,
        content: input.content,
        post_type: input.post_type,
        author_dojo_style_id: user.dojo_style_id ?? null,
        author_dojo_name: user.dojo_style_name ?? null,
        source_page_id: input.source_page_id,
      });

      // タグ紐付け（投稿一覧で表示するため同期で確定させる）
      if (input.tag_ids && input.tag_ids.length > 0) {
        await createSocialPostTags(supabase, post.id, input.tag_ids);
      }

      // ハッシュタグ抽出・登録は UI 表示に必須ではない（content から再抽出可能）ため
      // Cloudflare Workers の waitUntil でレスポンス後に非同期実行し、応答を早く返す。
      const hashtagNames = extractHashtags(input.content);
      if (hashtagNames.length > 0) {
        const hashtagTask = (async () => {
          try {
            const hashtags = await upsertHashtags(supabase, hashtagNames);
            await createSocialPostHashtags(
              supabase,
              post.id,
              hashtags.map((h) => h.id),
            );
          } catch (error) {
            console.error("ハッシュタグ処理エラー:", error);
          }
        })();
        // c.executionCtx は Cloudflare Workers Runtime 外（テスト等）では getter が
        // throw する仕様のため、try/catch で防御。テスト環境では fire-and-forget だが
        // IIFE 内で try/catch しているので unhandled rejection にはならない。
        try {
          c.executionCtx.waitUntil(hashtagTask);
        } catch {
          // executionCtx が利用できない環境では何もしない
        }
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
      console.error("投稿作成エラー:", error);
      return c.json({ success: false, error: "投稿の作成に失敗しました" }, 500);
    }
  },
);

// GET /public/:id — 未認証ユーザー向け投稿詳細（publicity_setting=public のみ）
app.get("/public/:id", async (c) => {
  try {
    const postId = c.req.param("id");

    const supabase = c.get("supabase");
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
app.get("/:id", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const postId = c.req.param("id");

    const supabase = c.get("supabase")!;

    const details = await getSocialPostWithDetails(supabase, postId, userId);

    if (!details) {
      return c.json({ success: false, error: "投稿が見つかりません" }, 404);
    }

    // 公開範囲チェック（User.publicity_setting ベース）
    const { post } = details;
    const visibilityError = await checkPostVisibility(
      supabase,
      post.user_id,
      userId,
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
            post.user_id === userId ? post.favorite_count : undefined,
        },
        source_page: sourcePage,
      },
    });
  } catch (error) {
    console.error("投稿詳細取得エラー:", error);
    return c.json({ success: false, error: "投稿の取得に失敗しました" }, 500);
  }
});

// PUT /:id — 投稿更新
app.put(
  "/:id",
  authMiddleware,
  zValidator("json", updateSocialPostSchema),
  async (c) => {
    try {
      const userId = c.get("userId");
      const postId = c.req.param("id");
      const input = c.req.valid("json");

      const supabase = c.get("supabase")!;

      // 所有者チェック
      const existing = await getSocialPostById(supabase, postId);
      if (!existing) {
        return c.json({ success: false, error: "投稿が見つかりません" }, 404);
      }
      if (existing.user_id !== userId) {
        return c.json(
          { success: false, error: "この投稿を編集する権限がありません" },
          403,
        );
      }

      // NGワードチェック（拒否）
      if (input.content) {
        const ngResult = await containsNgWord(input.content, supabase);
        if (ngResult.found) {
          console.warn(
            `[NGワード検出] 投稿更新 userId=${userId} postId=${postId} matchedWord="${ngResult.matchedWord}"`,
          );
          return c.json(
            {
              success: false,
              error: "不適切な表現が含まれているため更新できません",
              code: "NG_WORD",
            },
            400,
          );
        }
      }

      const updateData: { content?: string } = {};
      if (input.content) updateData.content = input.content;

      const post = await updateSocialPost(supabase, postId, userId, updateData);

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
      console.error("投稿更新エラー:", error);
      return c.json({ success: false, error: "投稿の更新に失敗しました" }, 500);
    }
  },
);

// DELETE /:id — 論理削除
app.delete("/:id", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const postId = c.req.param("id");

    const supabase = c.get("supabase")!;

    // 所有者チェック
    const existing = await getSocialPostById(supabase, postId);
    if (!existing) {
      return c.json({ success: false, error: "投稿が見つかりません" }, 404);
    }
    if (existing.user_id !== userId) {
      return c.json(
        { success: false, error: "この投稿を削除する権限がありません" },
        403,
      );
    }

    await softDeleteSocialPost(supabase, postId, userId);

    return c.json({
      success: true,
      message: "投稿を削除しました",
    });
  } catch (error) {
    console.error("投稿削除エラー:", error);
    return c.json({ success: false, error: "投稿の削除に失敗しました" }, 500);
  }
});

// POST /:id/replies — 返信作成
app.post(
  "/:id/replies",
  authMiddleware,
  zValidator("json", createSocialReplySchema),
  async (c) => {
    try {
      const userId = c.get("userId");
      const postId = c.req.param("id");
      const input = c.req.valid("json");

      if (userId !== input.user_id) {
        return c.json({ success: false, error: "認証エラー" }, 403);
      }

      const supabase = c.get("supabase")!;

      // Free ユーザー: 1日3件まで返信可能
      const premiumForReply = await isPremiumUser(supabase, userId);
      if (!premiumForReply) {
        const dailyLimited = await checkRateLimit(
          supabase,
          userId,
          "SocialReply",
          1440,
          3,
        );
        if (dailyLimited) {
          return c.json(
            {
              success: false,
              error: "1日の返信上限（3件）に達しました",
              code: "DAILY_LIMIT_REACHED",
            },
            429,
          );
        }
      }

      // レート制限チェック（60分以内に20件まで）
      const rateLimited = await checkRateLimit(
        supabase,
        userId,
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
        userId,
      );
      if (replyVisibilityError) {
        return c.json(
          { success: false, error: "この投稿には返信できません" },
          403,
        );
      }

      // NGワードチェック（拒否）
      const ngResult = await containsNgWord(input.content, supabase);
      if (ngResult.found) {
        console.warn(
          `[NGワード検出] 返信作成 userId=${userId} postId=${postId} matchedWord="${ngResult.matchedWord}"`,
        );
        return c.json(
          {
            success: false,
            error: "不適切な表現が含まれているため返信できません",
            code: "NG_WORD",
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
      console.error("返信作成エラー:", error);
      return c.json({ success: false, error: "返信の作成に失敗しました" }, 500);
    }
  },
);

// PUT /:id/replies/:replyId — 返信編集
app.put(
  "/:id/replies/:replyId",
  authMiddleware,
  zValidator("json", updateSocialReplySchema),
  async (c) => {
    try {
      const userId = c.get("userId");
      const postId = c.req.param("id");
      const replyId = c.req.param("replyId");
      const input = c.req.valid("json");

      const supabase = c.get("supabase")!;

      // 返信存在チェック
      const existingReply = await getSocialReplyById(supabase, replyId);
      if (!existingReply || existingReply.post_id !== postId) {
        return c.json({ success: false, error: "返信が見つかりません" }, 404);
      }

      // owner検証
      if (existingReply.user_id !== userId) {
        return c.json(
          { success: false, error: "この返信を編集する権限がありません" },
          403,
        );
      }

      // NGワードチェック（拒否）
      const ngResult = await containsNgWord(input.content, supabase);
      if (ngResult.found) {
        console.warn(
          `[NGワード検出] 返信更新 userId=${userId} replyId=${replyId} matchedWord="${ngResult.matchedWord}"`,
        );
        return c.json(
          {
            success: false,
            error: "不適切な表現が含まれているため更新できません",
            code: "NG_WORD",
          },
          400,
        );
      }

      const reply = await updateSocialReply(supabase, replyId, userId, {
        content: input.content,
      });

      return c.json({
        success: true,
        data: reply,
        message: "返信を更新しました",
      });
    } catch (error) {
      console.error("返信更新エラー:", error);
      return c.json({ success: false, error: "返信の更新に失敗しました" }, 500);
    }
  },
);

// DELETE /:id/replies/:replyId — 返信削除
app.delete("/:id/replies/:replyId", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const postId = c.req.param("id");
    const replyId = c.req.param("replyId");

    const supabase = c.get("supabase")!;

    // 返信存在チェック
    const existingReply = await getSocialReplyById(supabase, replyId);
    if (!existingReply || existingReply.post_id !== postId) {
      return c.json({ success: false, error: "返信が見つかりません" }, 404);
    }

    // owner検証
    if (existingReply.user_id !== userId) {
      return c.json(
        { success: false, error: "この返信を削除する権限がありません" },
        403,
      );
    }

    await softDeleteSocialReply(supabase, replyId, userId);

    return c.json({
      success: true,
      message: "返信を削除しました",
    });
  } catch (error) {
    console.error("返信削除エラー:", error);
    return c.json({ success: false, error: "返信の削除に失敗しました" }, 500);
  }
});

export default app;

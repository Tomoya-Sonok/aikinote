import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import {
  createTrainingPage,
  deleteTrainingPage,
  getPublicTrainingPages,
  getTrainingPageById,
  getTrainingPages,
  supabase,
  syncSocialPostForTrainingPage,
  updateTrainingPage,
} from "../../lib/supabase.js";
import {
  type ApiResponse,
  createPageSchema,
  getPageSchema,
  getPagesSchema,
  type PagesListResponse,
  type PageWithTagsResponse,
  updatePageSchema,
} from "../../lib/validation.js";

const app = new Hono();

// ページ作成API
app.post("/", zValidator("json", createPageSchema), async (c) => {
  try {
    const input = c.req.valid("json");

    // Supabaseにページを保存
    const result = await createTrainingPage(
      {
        title: input.title,
        content: input.content,
        comment: input.comment,
        user_id: input.user_id,
        is_public: input.is_public ?? false,
        created_at: input.created_at,
      },
      {
        tori: input.tori,
        uke: input.uke,
        waza: input.waza,
      },
    );

    // is_public=true の場合、SocialPost を連動作成
    if (input.is_public && supabase) {
      try {
        await syncSocialPostForTrainingPage(
          supabase,
          result.page.id,
          input.user_id,
          input.content,
          true,
        );
      } catch (socialError) {
        console.error("SocialPost 連動作成エラー:", socialError);
      }
    }

    const response: ApiResponse<PageWithTagsResponse> = {
      success: true,
      data: result,
      message: "ページが正常に作成されました",
    };

    return c.json(response, 201);
  } catch (error) {
    console.error("ページ作成エラー:", error);

    const errorResponse: ApiResponse<never> = {
      success: false,
      error:
        error instanceof Error ? error.message : "不明なエラーが発生しました",
    };

    return c.json(errorResponse, 500);
  }
});

// ページ一覧取得API
app.get("/", zValidator("query", getPagesSchema), async (c) => {
  try {
    const {
      user_id,
      limit,
      offset,
      query,
      tags,
      start_date,
      end_date,
      date,
      sort_order,
    } = c.req.valid("query");

    // Supabaseからページ一覧を取得
    const { pages: pagesWithTags, totalCount } = await getTrainingPages({
      userId: user_id,
      limit,
      offset,
      query,
      tags,
      startDate: start_date,
      endDate: end_date,
      date,
      sortOrder: sort_order,
    });

    // 添付ファイルをバッチ取得
    const pageIds = pagesWithTags.map(({ page }) => page.id);
    // biome-ignore lint/suspicious/noExplicitAny: Supabase query results
    let attachmentsData: any[] = [];
    if (pageIds.length > 0) {
      const { data } = await supabase
        .from("PageAttachment")
        .select(
          "id, page_id, type, url, thumbnail_url, original_filename, sort_order",
        )
        .in("page_id", pageIds)
        .order("sort_order", { ascending: true });
      attachmentsData = data ?? [];
    }

    // biome-ignore lint/suspicious/noExplicitAny: Supabase query results
    const attachmentMap = new Map<string, any[]>();
    for (const att of attachmentsData) {
      const list = attachmentMap.get(att.page_id) ?? [];
      list.push(att);
      attachmentMap.set(att.page_id, list);
    }

    // レスポンス形式に変換
    const trainingPages = pagesWithTags.map(({ page, tags }) => ({
      page: {
        id: page.id,
        title: page.title,
        content: page.content,
        comment: page.comment,
        user_id: page.user_id,
        is_public: page.is_public,
        created_at: page.created_at,
        updated_at: page.updated_at,
      },
      tags: tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        category: tag.category,
      })),
      attachments: (attachmentMap.get(page.id) ?? []).map(
        (att: {
          id: string;
          type: string;
          url: string;
          thumbnail_url: string | null;
          original_filename: string | null;
        }) => ({
          id: att.id,
          type: att.type,
          url: att.url,
          thumbnail_url: att.thumbnail_url,
          original_filename: att.original_filename,
        }),
      ),
    }));

    const response: ApiResponse<PagesListResponse> = {
      success: true,
      data: { training_pages: trainingPages, total_count: totalCount },
      message: "ページ一覧を取得しました",
    };

    return c.json(response);
  } catch (error) {
    console.error("ページ一覧取得エラー:", error);
    console.error(error);

    const errorResponse: ApiResponse<never> = {
      success: false,
      error:
        error instanceof Error ? error.message : "不明なエラーが発生しました",
    };

    return c.json(errorResponse, 500);
  }
});

// ページ詳細取得API
app.get("/:id", zValidator("query", getPageSchema), async (c) => {
  try {
    const pageId = c.req.param("id");
    const { user_id } = c.req.valid("query");

    // Supabaseからページ詳細を取得
    const result = await getTrainingPageById(pageId, user_id);

    // レスポンス形式に変換
    const pageWithTags = {
      page: {
        id: result.page.id,
        title: result.page.title,
        content: result.page.content,
        comment: result.page.comment,
        user_id: result.page.user_id,
        is_public: result.page.is_public,
        created_at: result.page.created_at,
        updated_at: result.page.updated_at,
      },
      tags: result.tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        category: tag.category,
      })),
    };

    const response: ApiResponse<PageWithTagsResponse> = {
      success: true,
      data: pageWithTags,
      message: "ページ詳細を取得しました",
    };

    return c.json(response);
  } catch (error) {
    console.error("ページ詳細取得エラー:", error);

    const errorResponse: ApiResponse<never> = {
      success: false,
      error:
        error instanceof Error ? error.message : "不明なエラーが発生しました",
    };

    return c.json(errorResponse, 500);
  }
});

// ページ更新API
app.put("/:id", zValidator("json", updatePageSchema), async (c) => {
  try {
    const input = c.req.valid("json");
    const pageId = c.req.param("id");

    // パスパラメータとボディのIDの一致チェック
    if (pageId !== input.id) {
      const errorResponse: ApiResponse<never> = {
        success: false,
        error: "パスパラメータとリクエストボディのIDが一致しません",
      };
      return c.json(errorResponse, 400);
    }

    // Supabaseでページを更新
    const newIsPublic = input.is_public ?? false;
    const result = await updateTrainingPage(
      {
        id: input.id,
        title: input.title,
        content: input.content,
        comment: input.comment,
        user_id: input.user_id,
        is_public: newIsPublic,
      },
      {
        tori: input.tori,
        uke: input.uke,
        waza: input.waza,
      },
    );

    // is_public が明示指定されている場合のみ SocialPost を同期
    if (supabase && input.is_public !== undefined) {
      try {
        await syncSocialPostForTrainingPage(
          supabase,
          input.id,
          input.user_id,
          input.content,
          newIsPublic,
        );
      } catch (socialError) {
        console.error("SocialPost 連動更新エラー:", socialError);
      }
    }

    const response: ApiResponse<PageWithTagsResponse> = {
      success: true,
      data: result,
      message: "ページが正常に更新されました",
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("ページ更新エラー:", error);

    const errorResponse: ApiResponse<never> = {
      success: false,
      error:
        error instanceof Error ? error.message : "不明なエラーが発生しました",
    };

    return c.json(errorResponse, 500);
  }
});

// ページ削除API
app.delete("/:id", zValidator("query", getPageSchema), async (c) => {
  try {
    const pageId = c.req.param("id");
    const { user_id } = c.req.valid("query");

    await deleteTrainingPage(pageId, user_id);

    const response: ApiResponse<never> = {
      success: true,
      message: "ページが正常に削除されました",
    };

    return c.json(response, 200);
  } catch (error) {
    console.error("ページ削除エラー:", error);

    const errorResponse: ApiResponse<never> = {
      success: false,
      error:
        error instanceof Error ? error.message : "不明なエラーが発生しました",
    };

    return c.json(errorResponse, 500);
  }
});

// 公開稽古記録一覧取得API
app.get("/public/feed", async (c) => {
  try {
    const limit = Number(c.req.query("limit") || "20");
    const offset = Number(c.req.query("offset") || "0");

    if (!supabase) {
      return c.json({ success: false, error: "サーバー設定が不正です" }, 500);
    }

    const result = await getPublicTrainingPages(supabase, limit, offset);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("公開稽古記録取得エラー:", error);
    return c.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "不明なエラーが発生しました",
      },
      500,
    );
  }
});

export default app;

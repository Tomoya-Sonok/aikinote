import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { createTrainingPage, getTrainingPages, updateTrainingPage } from "../lib/supabase.js";
import {
  type ApiResponse,
  createPageSchema,
  getPagesSchema,
  type PagesListResponse,
  type PageWithTagsResponse,
  updatePageSchema,
} from "../lib/validation.js";

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
      },
      {
        tori: input.tori,
        uke: input.uke,
        waza: input.waza,
      },
    );

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
    const { user_id, limit, offset, query, tags, date } = c.req.valid("query");

    // Supabaseからページ一覧を取得
    const pagesWithTags = await getTrainingPages({
      userId: user_id,
      limit,
      offset,
      query,
      tags,
      date,
    });

    // レスポンス形式に変換
    const trainingPages = pagesWithTags.map(({ page, tags }) => ({
      page: {
        id: page.id,
        title: page.title,
        content: page.content,
        comment: page.comment,
        user_id: page.user_id,
        created_at: page.created_at,
        updated_at: page.updated_at,
      },
      tags: tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        category: tag.category,
      })),
    }));

    const response: ApiResponse<PagesListResponse> = {
      success: true,
      data: { training_pages: trainingPages },
      message: "ページ一覧を取得しました",
    };

    return c.json(response);
  } catch (error) {
    console.error("ページ一覧取得エラー:", error);

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
    const result = await updateTrainingPage(
      {
        id: input.id,
        title: input.title,
        content: input.content,
        comment: input.comment,
        user_id: input.user_id,
      },
      {
        tori: input.tori,
        uke: input.uke,
        waza: input.waza,
      },
    );

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

export default app;

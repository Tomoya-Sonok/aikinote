import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import type { TitleTemplateRow } from "../../lib/supabase.js";
import {
  createTitleTemplate,
  deleteTitleTemplate,
  getTitleTemplates,
} from "../../lib/supabase.js";
import { type ApiResponse } from "../../lib/validation.js";

const app = new Hono();

const MAX_TEMPLATES_PER_USER = 5;

const dateFormatEnum = z.enum([
  "yyyy-MM-dd",
  "yyyy/MM/dd",
  "yyyy.MM.dd",
  "yyyyMMdd",
]);

const createTitleTemplateSchema = z.object({
  user_id: z.string().min(1, "ユーザーIDは必須です"),
  template_text: z
    .string()
    .min(1, "テンプレート名は必須です")
    .max(35, "テンプレート名は35文字以内で入力してください"),
  date_format: dateFormatEnum.nullable().optional().default(null),
});

// タイトルテンプレート一覧取得
app.get("/", async (c) => {
  try {
    const userId = c.req.query("user_id");

    if (!userId) {
      const errorResponse: ApiResponse<never> = {
        success: false,
        error: "user_idパラメータは必須です",
      };
      return c.json(errorResponse, 400);
    }

    const templates = await getTitleTemplates(userId);

    const response: ApiResponse<TitleTemplateRow[]> = {
      success: true,
      data: templates,
      message: "タイトルテンプレート一覧を取得しました",
    };

    return c.json(response);
  } catch (error) {
    console.error("タイトルテンプレート取得エラー:", error);

    const errorResponse: ApiResponse<never> = {
      success: false,
      error:
        error instanceof Error ? error.message : "不明なエラーが発生しました",
    };

    return c.json(errorResponse, 500);
  }
});

// タイトルテンプレート新規作成
app.post("/", zValidator("json", createTitleTemplateSchema), async (c) => {
  try {
    const input = c.req.valid("json");

    // 上限チェック
    const existing = await getTitleTemplates(input.user_id);
    if (existing.length >= MAX_TEMPLATES_PER_USER) {
      const errorResponse: ApiResponse<never> = {
        success: false,
        error: `テンプレートは${MAX_TEMPLATES_PER_USER}件まで登録できます`,
      };
      return c.json(errorResponse, 400);
    }

    const newTemplate = await createTitleTemplate(
      input.user_id,
      input.template_text,
      input.date_format ?? null,
      existing,
    );

    const response: ApiResponse<TitleTemplateRow> = {
      success: true,
      data: newTemplate,
      message: "タイトルテンプレートが正常に作成されました",
    };

    return c.json(response, 201);
  } catch (error) {
    console.error("タイトルテンプレート作成エラー:", error);

    const errorResponse: ApiResponse<never> = {
      success: false,
      error:
        error instanceof Error ? error.message : "不明なエラーが発生しました",
    };

    return c.json(errorResponse, 500);
  }
});

// タイトルテンプレート削除
app.delete("/:id", async (c) => {
  try {
    const templateId = c.req.param("id");
    const userId = c.req.query("user_id");

    if (!userId) {
      const errorResponse: ApiResponse<never> = {
        success: false,
        error: "user_idパラメータは必須です",
      };
      return c.json(errorResponse, 400);
    }

    if (!templateId) {
      const errorResponse: ApiResponse<never> = {
        success: false,
        error: "テンプレートIDは必須です",
      };
      return c.json(errorResponse, 400);
    }

    const deleted = await deleteTitleTemplate(templateId, userId);

    if (!deleted) {
      const errorResponse: ApiResponse<never> = {
        success: false,
        error: "指定されたテンプレートが見つかりません",
      };
      return c.json(errorResponse, 404);
    }

    const response: ApiResponse<TitleTemplateRow> = {
      success: true,
      data: deleted,
      message: "タイトルテンプレートを削除しました",
    };

    return c.json(response);
  } catch (error) {
    console.error("タイトルテンプレート削除エラー:", error);

    const errorResponse: ApiResponse<never> = {
      success: false,
      error:
        error instanceof Error ? error.message : "不明なエラーが発生しました",
    };

    return c.json(errorResponse, 500);
  }
});

export default app;

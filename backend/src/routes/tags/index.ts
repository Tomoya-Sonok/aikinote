import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import {
  checkDuplicateTag,
  createUserTag,
  getUserTags,
} from "../../lib/supabase.js";
import { type ApiResponse } from "../../lib/validation.js";

const app = new Hono();

// タグの型定義
export const tagSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  user_id: z.string(),
  created_at: z.string(),
});

export const createTagSchema = z.object({
  name: z
    .string()
    .min(1, "タグ名は必須です")
    .max(20, "タグ名は20文字以内で入力してください")
    .regex(
      /^[a-zA-Z0-9ぁ-んァ-ンー一-龠０-９]+$/,
      "タグ名は全角・半角英数字のみ使用可能です",
    ),
  category: z.enum(["取り", "受け", "技"], {
    errorMap: () => ({
      message: "カテゴリは「取り」「受け」「技」のいずれかを選択してください",
    }),
  }),
  user_id: z.string(),
});

export type Tag = z.infer<typeof tagSchema>;
export type CreateTagInput = z.infer<typeof createTagSchema>;

// タグ一覧取得API
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

    const tags = await getUserTags(userId);

    const response: ApiResponse<Tag[]> = {
      success: true,
      data: tags,
      message: "タグ一覧を取得しました",
    };

    return c.json(response);
  } catch (error) {
    console.error("タグ取得エラー:", error);

    const errorResponse: ApiResponse<never> = {
      success: false,
      error:
        error instanceof Error ? error.message : "不明なエラーが発生しました",
    };

    return c.json(errorResponse, 500);
  }
});

// 新規タグ作成API
app.post("/", zValidator("json", createTagSchema), async (c) => {
  try {
    const input = c.req.valid("json");

    // 既存タグの重複チェック
    const existingTag = await checkDuplicateTag(
      input.user_id,
      input.name,
      input.category,
    );

    if (existingTag) {
      const errorResponse: ApiResponse<never> = {
        success: false,
        error: "同じ名前とカテゴリのタグが既に存在します",
      };
      return c.json(errorResponse, 400);
    }

    // 新規タグ作成
    const newTag = await createUserTag(
      input.user_id,
      input.name,
      input.category,
    );

    const response: ApiResponse<Tag> = {
      success: true,
      data: newTag,
      message: "タグが正常に作成されました",
    };

    return c.json(response, 201);
  } catch (error) {
    console.error("タグ作成エラー:", error);

    const errorResponse: ApiResponse<never> = {
      success: false,
      error:
        error instanceof Error ? error.message : "不明なエラーが発生しました",
    };

    return c.json(errorResponse, 500);
  }
});

export default app;

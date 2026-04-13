import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import {
  createUserCategory,
  deleteUserCategory,
  getUserCategories,
  type UserCategoryRow,
  updateUserCategory,
} from "../../lib/supabase.js";
import { type ApiResponse } from "../../lib/validation.js";

const app = new Hono();

// カテゴリの型定義
export const categorySchema = z.object({
  id: z.string(),
  user_id: z.string(),
  name: z.string(),
  slug: z.string(),
  sort_order: z.number(),
  is_default: z.boolean(),
  created_at: z.string(),
});

export const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, "カテゴリ名は必須です")
    .max(10, "カテゴリ名は10文字以内で入力してください"),
  user_id: z.string().min(1, "user_idは必須です"),
});

export const updateCategorySchema = z.object({
  name: z
    .string()
    .min(1, "カテゴリ名は必須です")
    .max(10, "カテゴリ名は10文字以内で入力してください"),
});

export type Category = z.infer<typeof categorySchema>;

// カテゴリ一覧取得API
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

    const categories = await getUserCategories(userId);

    const response: ApiResponse<UserCategoryRow[]> = {
      success: true,
      data: categories,
      message: "カテゴリ一覧を取得しました",
    };

    return c.json(response);
  } catch (error) {
    console.error("カテゴリ取得エラー:", error);

    const errorResponse: ApiResponse<never> = {
      success: false,
      error:
        error instanceof Error ? error.message : "不明なエラーが発生しました",
    };

    return c.json(errorResponse, 500);
  }
});

// カテゴリ作成API
app.post("/", zValidator("json", createCategorySchema), async (c) => {
  try {
    const input = c.req.valid("json");

    const newCategory = await createUserCategory(input.user_id, input.name);

    const response: ApiResponse<UserCategoryRow> = {
      success: true,
      data: newCategory,
      message: "カテゴリを作成しました",
    };

    return c.json(response, 201);
  } catch (error) {
    console.error("カテゴリ作成エラー:", error);

    const message =
      error instanceof Error ? error.message : "不明なエラーが発生しました";
    const status =
      message.includes("最大") || message.includes("既に存在") ? 400 : 500;

    const errorResponse: ApiResponse<never> = {
      success: false,
      error: message,
    };

    return c.json(errorResponse, status);
  }
});

// カテゴリ名更新API
app.put("/:id", zValidator("json", updateCategorySchema), async (c) => {
  try {
    const categoryId = c.req.param("id");
    const userId = c.req.query("user_id");

    if (!userId) {
      const errorResponse: ApiResponse<never> = {
        success: false,
        error: "user_idパラメータは必須です",
      };
      return c.json(errorResponse, 400);
    }

    const input = c.req.valid("json");

    const updated = await updateUserCategory(categoryId, userId, input.name);

    const response: ApiResponse<UserCategoryRow> = {
      success: true,
      data: updated,
      message: "カテゴリを更新しました",
    };

    return c.json(response);
  } catch (error) {
    console.error("カテゴリ更新エラー:", error);

    const message =
      error instanceof Error ? error.message : "不明なエラーが発生しました";
    const status =
      message.includes("見つかりません") || message.includes("既に存在")
        ? 400
        : 500;

    const errorResponse: ApiResponse<never> = {
      success: false,
      error: message,
    };

    return c.json(errorResponse, status);
  }
});

// カテゴリ削除API
app.delete("/:id", async (c) => {
  try {
    const categoryId = c.req.param("id");
    const userId = c.req.query("user_id");

    if (!userId) {
      const errorResponse: ApiResponse<never> = {
        success: false,
        error: "user_idパラメータは必須です",
      };
      return c.json(errorResponse, 400);
    }

    await deleteUserCategory(categoryId, userId);

    const response: ApiResponse<null> = {
      success: true,
      data: null,
      message: "カテゴリと所属タグを削除しました",
    };

    return c.json(response);
  } catch (error) {
    console.error("カテゴリ削除エラー:", error);

    const message =
      error instanceof Error ? error.message : "不明なエラーが発生しました";
    const status = message.includes("見つかりません") ? 400 : 500;

    const errorResponse: ApiResponse<never> = {
      success: false,
      error: message,
    };

    return c.json(errorResponse, status);
  }
});

export default app;

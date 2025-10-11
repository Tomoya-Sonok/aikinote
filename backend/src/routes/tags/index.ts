import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import {
  checkDuplicateTag,
  createUserTag,
  deleteUserTag,
  getUserTags,
  updateUserTagOrder,
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
  sort_order: z.number().nullable().optional(),
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

export const updateTagOrderSchema = z.object({
  user_id: z.string().min(1, "user_idパラメータは必須です"),
  tori: z.array(z.string()).optional().default([]),
  uke: z.array(z.string()).optional().default([]),
  waza: z.array(z.string()).optional().default([]),
});

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

app.delete("/:id", async (c) => {
  try {
    const tagId = c.req.param("id");
    const userId = c.req.query("user_id");

    if (!userId) {
      const errorResponse: ApiResponse<never> = {
        success: false,
        error: "user_idパラメータは必須です",
      };
      return c.json(errorResponse, 400);
    }

    if (!tagId) {
      const errorResponse: ApiResponse<never> = {
        success: false,
        error: "タグIDは必須です",
      };
      return c.json(errorResponse, 400);
    }

    const deletedTag = await deleteUserTag(tagId, userId);

    if (!deletedTag) {
      const errorResponse: ApiResponse<never> = {
        success: false,
        error: "指定されたタグが見つかりません",
      };
      return c.json(errorResponse, 404);
    }

    const response: ApiResponse<Tag> = {
      success: true,
      data: deletedTag,
      message: "タグを削除しました",
    };

    return c.json(response);
  } catch (error) {
    console.error("タグ削除エラー:", error);

    const errorResponse: ApiResponse<never> = {
      success: false,
      error:
        error instanceof Error ? error.message : "不明なエラーが発生しました",
    };

    return c.json(errorResponse, 500);
  }
});

app.patch("/order", zValidator("json", updateTagOrderSchema), async (c) => {
  try {
    const input = c.req.valid("json");

    const { user_id: userId, tori, uke, waza } = input;

    if (!userId) {
      const errorResponse: ApiResponse<never> = {
        success: false,
        error: "user_idパラメータは必須です",
      };
      return c.json(errorResponse, 400);
    }

    const allTagIds = [...tori, ...uke, ...waza];
    const uniqueIds = new Set(allTagIds);

    if (uniqueIds.size !== allTagIds.length) {
      const errorResponse: ApiResponse<never> = {
        success: false,
        error: "同じタグIDが複数箇所に含まれています",
      };
      return c.json(errorResponse, 400);
    }

    const categoryConfigs: {
      ids: string[];
      category: "取り" | "受け" | "技";
    }[] = [
      { ids: tori, category: "取り" },
      { ids: uke, category: "受け" },
      { ids: waza, category: "技" },
    ];

    const orderUpdates: {
      id: string;
      category: "取り" | "受け" | "技";
      sort_order: number;
    }[] = [];

    let sequenceCounter = 1;

    for (const { ids, category } of categoryConfigs) {
      for (const id of ids) {
        orderUpdates.push({
          id,
          category,
          sort_order: sequenceCounter,
        });
        sequenceCounter += 1;
      }
    }

    await updateUserTagOrder(userId, orderUpdates);

    const reorderedTags = await getUserTags(userId);

    const response: ApiResponse<Tag[]> = {
      success: true,
      data: reorderedTags,
      message: "タグの並び順を更新しました",
    };

    return c.json(response);
  } catch (error) {
    console.error("タグ並び順更新エラー:", error);

    const errorResponse: ApiResponse<never> = {
      success: false,
      error:
        error instanceof Error ? error.message : "不明なエラーが発生しました",
    };

    return c.json(errorResponse, 500);
  }
});

export default app;

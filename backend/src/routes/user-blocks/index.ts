import type { SupabaseClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import {
  createUserBlock,
  deleteUserBlock,
  getUserBlocks,
} from "../../lib/supabase.js";
import { authMiddleware } from "../../middleware/auth.js";

type UserBlocksBindings = {
  JWT_SECRET?: string;
};

type UserBlocksVariables = {
  supabase: SupabaseClient | null;
  userId: string;
};

const app = new Hono<{
  Bindings: UserBlocksBindings;
  Variables: UserBlocksVariables;
}>();

// GET / — 自分のブロックリスト取得
app.get("/", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const supabase = c.get("supabase")!;

  try {
    const blocks = await getUserBlocks(supabase, userId);
    return c.json({ success: true, data: blocks });
  } catch (error) {
    console.error("ブロック一覧取得エラー:", error);
    return c.json(
      { success: false, error: "ブロック一覧の取得に失敗しました" },
      500,
    );
  }
});

// POST /:blockedUserId — ブロック作成
app.post("/:blockedUserId", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const supabase = c.get("supabase")!;
  const blockedUserId = c.req.param("blockedUserId");

  if (userId === blockedUserId) {
    return c.json(
      { success: false, error: "自分自身をブロックすることはできません" },
      400,
    );
  }

  try {
    // 対象ユーザーの存在確認
    const { data: targetUser, error: targetError } = await supabase
      .from("User")
      .select("id")
      .eq("id", blockedUserId)
      .maybeSingle();

    if (targetError) {
      console.error("対象ユーザー存在確認エラー:", targetError);
      return c.json(
        { success: false, error: "ブロック対象の確認に失敗しました" },
        500,
      );
    }
    if (!targetUser) {
      return c.json({ success: false, error: "ユーザーが見つかりません" }, 404);
    }

    const block = await createUserBlock(supabase, userId, blockedUserId);
    return c.json({ success: true, data: block }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_BLOCKED") {
      return c.json(
        { success: false, error: "このユーザーは既にブロック済みです" },
        409,
      );
    }
    console.error("ユーザーブロック作成エラー:", error);
    return c.json({ success: false, error: "ブロック処理に失敗しました" }, 500);
  }
});

// DELETE /:blockedUserId — ブロック解除
app.delete("/:blockedUserId", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const supabase = c.get("supabase")!;
  const blockedUserId = c.req.param("blockedUserId");

  try {
    await deleteUserBlock(supabase, userId, blockedUserId);
    return c.json({ success: true });
  } catch (error) {
    console.error("ユーザーブロック解除エラー:", error);
    return c.json({ success: false, error: "ブロック解除に失敗しました" }, 500);
  }
});

export default app;

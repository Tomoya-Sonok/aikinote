import type { SupabaseClient } from "@supabase/supabase-js";
import { createMiddleware } from "hono/factory";
import { extractTokenFromHeader, verifyToken } from "../lib/jwt.js";
import { isPremiumUser } from "../lib/subscription.js";

type Env = {
  Bindings: { JWT_SECRET?: string };
  Variables: { supabase: SupabaseClient | null; userId: string };
};

/**
 * JWT 認証ミドルウェア。
 * Authorization ヘッダーから JWT を検証し、c.set("userId", ...) でユーザーIDをセットする。
 * supabase クライアントが未初期化の場合は 500 を返す。
 */
export const authMiddleware = createMiddleware<Env>(async (c, next) => {
  try {
    const authHeader = c.req.header("Authorization");
    const token = extractTokenFromHeader(authHeader);
    const payload = await verifyToken(token, c.env);

    const supabase = c.get("supabase");
    if (!supabase) {
      return c.json(
        { success: false, error: "Supabase クライアント未初期化" },
        500,
      );
    }

    c.set("userId", payload.userId);
    await next();
  } catch {
    return c.json({ success: false, error: "認証エラー" }, 401);
  }
});

/**
 * Premium プラン必須ミドルウェア。authMiddleware の後に使用する。
 */
export const premiumMiddleware = createMiddleware<Env>(async (c, next) => {
  const supabase = c.get("supabase");
  const userId = c.get("userId");

  if (!supabase || !userId) {
    return c.json({ success: false, error: "認証エラー" }, 401);
  }

  const premium = await isPremiumUser(supabase, userId);
  if (!premium) {
    return c.json({ success: false, error: "Premium プランが必要です" }, 403);
  }

  await next();
});

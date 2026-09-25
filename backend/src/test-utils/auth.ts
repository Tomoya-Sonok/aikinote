import type { Hono } from "hono";
import { generateToken } from "../lib/jwt.js";

// verifyToken は c.env が無いテスト環境では process.env.JWT_SECRET を使う
process.env.JWT_SECRET ??= "test-jwt-secret";

/** 指定ユーザーのバックエンド用 JWT を Authorization ヘッダー形式で返す */
export const createAuthHeader = async (userId: string) => {
  const token = await generateToken(
    { userId },
    { JWT_SECRET: process.env.JWT_SECRET },
  );
  return `Bearer ${token}`;
};

/**
 * 以降のリクエストを指定ユーザーとして認証済みにするテスト用ミドルウェアを登録する。
 * ルート登録（app.route）より前に呼ぶこと。Authorization を明示したリクエストはそのまま通す。
 */
export const authenticateTestRequestsAs = (app: Hono, userId: string) => {
  app.use("*", async (c, next) => {
    if (!c.req.raw.headers.has("Authorization")) {
      c.req.raw.headers.set("Authorization", await createAuthHeader(userId));
    }
    await next();
  });
};

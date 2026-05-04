import type { User } from "@supabase/supabase-js";
import { cacheLife, cacheTag, revalidateTag } from "next/cache";
import type { UserSession } from "@/lib/auth";
import { fetchUserInfoFromHono } from "@/lib/server/auth";

export const CACHE_TAG_USER_INFO = "user-info";

/**
 * ユーザーごとのキャッシュタグを生成
 */
export const getUserInfoCacheTag = (userId: string) => {
  return `${CACHE_TAG_USER_INFO}-${userId}`;
};

/**
 * "use cache" 内では cookies() を呼べないため、`fetchUserInfoFromHono` が
 * JWT 生成に使う id / email だけをプリミティブ引数で受け取り、fallback の
 * `createBackendAuthToken` (cookies 依存) を経由させない実装に切り出している。
 * `fetchUserInfoFromHono` 内で参照されるのは `id` / `email` のみ
 * (auth.ts:44-45) なので User 型へのキャストは安全。
 */
async function getCachedUserInfoInner(
  userId: string,
  email: string,
): Promise<UserSession | null> {
  "use cache";
  cacheLife({ revalidate: 604800 }); // 1 週間 (旧 unstable_cache の TTL を維持)
  cacheTag(getUserInfoCacheTag(userId));
  return fetchUserInfoFromHono(userId, { id: userId, email } as User);
}

/**
 * ユーザー情報をキャッシュ付きで取得
 * TTL: 1週間 (604800秒)
 */
export const getCachedUserInfo = async (
  userId: string,
  user: User,
): Promise<UserSession | null> => {
  return getCachedUserInfoInner(userId, user.email ?? "");
};

/**
 * ユーザー情報のキャッシュを無効化
 * Next.js 16 の revalidateTag は 2 引数 signature が推奨。
 * 'max' プロファイルでユーザー情報の更新を即時反映する。
 */
export const revalidateUserInfo = (userId: string) => {
  revalidateTag(getUserInfoCacheTag(userId), "max");
};

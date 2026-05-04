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

// "use cache" 内では cookies() を呼べないため、fetchUserInfoFromHono が JWT 生成で使う
// id / email だけをプリミティブ引数で受け取り、cookies 依存の fallback を経由させない
async function getCachedUserInfoInner(
  userId: string,
  email: string,
): Promise<UserSession | null> {
  "use cache";
  cacheLife({ revalidate: 604800 });
  cacheTag(getUserInfoCacheTag(userId));
  return fetchUserInfoFromHono(userId, { id: userId, email } as User);
}

/**
 * ユーザー情報をキャッシュ付きで取得 (TTL: 1 週間)
 */
export const getCachedUserInfo = async (
  userId: string,
  user: User,
): Promise<UserSession | null> => {
  return getCachedUserInfoInner(userId, user.email ?? "");
};

/**
 * ユーザー情報のキャッシュを無効化 (プロフィール更新後の即時反映用)
 */
export const revalidateUserInfo = (userId: string) => {
  revalidateTag(getUserInfoCacheTag(userId), "max");
};

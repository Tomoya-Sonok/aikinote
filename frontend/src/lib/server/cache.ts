import type { Session } from "@supabase/supabase-js";
import { revalidateTag, unstable_cache } from "next/cache";
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
 * ユーザー情報をキャッシュ付きで取得
 * TTL: 1週間 (604800秒)
 */
export const getCachedUserInfo = async (
  userId: string,
  session: Session,
): Promise<UserSession | null> => {
  const getUserInfo = unstable_cache(
    async () => {
      // キャッシュミス時にHono APIから取得
      return fetchUserInfoFromHono(userId, session);
    },
    [getUserInfoCacheTag(userId)],
    {
      tags: [getUserInfoCacheTag(userId)],
      revalidate: 604800, // 1週間
    },
  );

  return getUserInfo();
};

/**
 * ユーザー情報のキャッシュを無効化
 */
export const revalidateUserInfo = (userId: string) => {
  // @ts-expect-error Next.js 16.0.10 type definition mismatch workaround
  revalidateTag(getUserInfoCacheTag(userId));
};

import type { Session } from "@supabase/supabase-js";
import { revalidateTag, unstable_cache } from "next/cache";
import type { UserSession } from "@/lib/auth";
import { fetchUserBasicInfoFromHono } from "@/lib/server/auth";

export const CACHE_TAG_USER_BASIC_INFO = "user-basic-info";

/**
 * ユーザーごとのキャッシュタグを生成
 */
export const getUserBasicInfoCacheTag = (userId: string) => {
  return `${CACHE_TAG_USER_BASIC_INFO}-${userId}`;
};

/**
 * ユーザー基本情報をキャッシュ付きで取得
 * TTL: 1週間 (604800秒)
 */
export const getCachedUserBasicInfo = async (
  userId: string,
  session: Session,
): Promise<UserSession | null> => {
  const getBasicInfo = unstable_cache(
    async () => {
      // キャッシュミス時にHono APIから取得
      return fetchUserBasicInfoFromHono(userId, session);
    },
    [getUserBasicInfoCacheTag(userId)],
    {
      tags: [getUserBasicInfoCacheTag(userId)],
      revalidate: 604800, // 1週間
    },
  );

  return getBasicInfo();
};

/**
 * ユーザー基本情報のキャッシュを無効化
 */
export const revalidateUserBasicInfo = (userId: string) => {
  // @ts-expect-error Next.js 16.0.10 type definition mismatch workaround
  revalidateTag(getUserBasicInfoCacheTag(userId));
};

import type { Session } from "@supabase/supabase-js";
import { revalidateTag, unstable_cache } from "next/cache";
import type { UserSession } from "@/lib/auth";
import { fetchUserProfileFromHono } from "@/lib/server/auth";

export const CACHE_TAG_USER_PROFILE = "user-profile";

/**
 * ユーザーごとのキャッシュタグを生成
 */
export const getUserProfileCacheTag = (userId: string) => {
  return `${CACHE_TAG_USER_PROFILE}-${userId}`;
};

/**
 * ユーザープロフィールをキャッシュ付きで取得
 * TTL: 1週間 (604800秒)
 */
export const getCachedUserProfile = async (
  userId: string,
  session: Session,
): Promise<UserSession | null> => {
  const getProfile = unstable_cache(
    async () => {
      // キャッシュミス時にHono APIから取得
      return fetchUserProfileFromHono(userId, session);
    },
    [getUserProfileCacheTag(userId)],
    {
      tags: [getUserProfileCacheTag(userId)],
      revalidate: 604800, // 1週間
    },
  );

  return getProfile();
};

/**
 * ユーザープロフィールのキャッシュを無効化
 */
export const revalidateUserProfile = (userId: string) => {
  // @ts-expect-error Next.js 16.0.10 type definition mismatch workaround
  revalidateTag(getUserProfileCacheTag(userId));
};

"use client";

import { useCallback } from "react";
import type { SocialFeedPostData } from "@/components/features/social/SocialPostCard/SocialPostCard";
import { isDailyLimitError, toggleFavorite } from "@/lib/api/client";

interface UseSocialFavoriteResult {
  handleToggleFavorite: (
    postId: string,
    posts: SocialFeedPostData[],
    updatePost: (
      postId: string,
      updater: (post: SocialFeedPostData) => SocialFeedPostData,
    ) => void,
    onDailyLimitReached?: () => void,
  ) => Promise<void>;
}

export function useSocialFavorite(): UseSocialFavoriteResult {
  const handleToggleFavorite = useCallback(
    async (
      postId: string,
      posts: SocialFeedPostData[],
      updatePost: (
        postId: string,
        updater: (post: SocialFeedPostData) => SocialFeedPostData,
      ) => void,
      onDailyLimitReached?: () => void,
    ) => {
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      const wasFavorited = post.is_favorited;
      const prevCount = post.favorite_count ?? 0;

      // 楽観的更新
      updatePost(postId, (p) => ({
        ...p,
        is_favorited: !wasFavorited,
        favorite_count: wasFavorited
          ? Math.max(0, prevCount - 1)
          : prevCount + 1,
      }));

      try {
        await toggleFavorite(postId);
      } catch (error) {
        // ロールバック
        updatePost(postId, (p) => ({
          ...p,
          is_favorited: wasFavorited,
          favorite_count: prevCount,
        }));

        if (onDailyLimitReached && isDailyLimitError(error)) {
          onDailyLimitReached();
        }
      }
    },
    [],
  );

  return { handleToggleFavorite };
}

"use client";

import {
  type InfiniteData,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";
import type { SocialFeedPostData } from "@/components/features/social/SocialPostCard/SocialPostCard";
import { type GetSocialFeedParams, getSocialFeed } from "@/lib/api/client";

type SocialTab = "all" | "training" | "favorites";

const ALL_TABS: SocialTab[] = ["all", "training", "favorites"];
const SOCIAL_FEED_FETCH_LIMIT = 20;

interface SocialFeedPage {
  posts: SocialFeedPostData[];
  next_offset: number | null;
}

interface UseSocialFeedResult {
  posts: SocialFeedPostData[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => void;
  updatePost: (
    postId: string,
    updater: (post: SocialFeedPostData) => SocialFeedPostData,
  ) => void;
}

export const socialFeedQueryKey = (
  userId: string | undefined,
  tab: SocialTab,
) => ["social-feed", userId, tab] as const;

async function fetchSocialFeedPage(
  userId: string,
  tab: SocialTab,
  offset: number,
): Promise<SocialFeedPage> {
  const params: GetSocialFeedParams = {
    userId,
    tab,
    limit: SOCIAL_FEED_FETCH_LIMIT,
    offset,
  };
  const result = await getSocialFeed(params);
  const posts =
    result.success && result.data ? (result.data as SocialFeedPostData[]) : [];
  return {
    posts,
    next_offset:
      posts.length >= SOCIAL_FEED_FETCH_LIMIT ? offset + posts.length : null,
  };
}

export function useSocialFeed(
  userId: string | undefined,
  tab: SocialTab,
): UseSocialFeedResult {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery<
    SocialFeedPage,
    Error,
    InfiniteData<SocialFeedPage>,
    ReturnType<typeof socialFeedQueryKey>,
    number
  >({
    queryKey: socialFeedQueryKey(userId, tab),
    enabled: !!userId,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      if (!userId) return { posts: [], next_offset: null };
      return fetchSocialFeedPage(userId, tab, pageParam);
    },
    getNextPageParam: (lastPage) => lastPage.next_offset ?? undefined,
  });

  // 他タブのプリフェッチ（アクティブタブのロード完了後、idle callback で実行）
  useEffect(() => {
    if (!userId || !query.isSuccess) return;

    const prefetchOtherTabs = () => {
      for (const otherTab of ALL_TABS) {
        if (otherTab === tab) continue;
        void queryClient.prefetchInfiniteQuery<
          SocialFeedPage,
          Error,
          InfiniteData<SocialFeedPage>,
          ReturnType<typeof socialFeedQueryKey>,
          number
        >({
          queryKey: socialFeedQueryKey(userId, otherTab),
          initialPageParam: 0,
          queryFn: async ({ pageParam }) =>
            fetchSocialFeedPage(userId, otherTab, pageParam),
        });
      }
    };

    if ("requestIdleCallback" in window) {
      const handle = window.requestIdleCallback(prefetchOtherTabs, {
        timeout: 3000,
      });
      return () => window.cancelIdleCallback(handle);
    }
    const timeoutId = setTimeout(prefetchOtherTabs, 500);
    return () => clearTimeout(timeoutId);
  }, [userId, tab, query.isSuccess, queryClient]);

  const posts = useMemo(
    () => query.data?.pages.flatMap((p) => p.posts) ?? [],
    [query.data],
  );

  const hasMore = !!query.hasNextPage;

  const loadMore = useCallback(() => {
    if (!query.hasNextPage || query.isFetchingNextPage) return;
    void query.fetchNextPage();
  }, [query]);

  const refetch = useCallback(() => {
    void query.refetch();
  }, [query]);

  const updatePost = useCallback(
    (
      postId: string,
      updater: (post: SocialFeedPostData) => SocialFeedPostData,
    ) => {
      // 全タブの infinite-query キャッシュから該当 postId を差し替え
      for (const t of ALL_TABS) {
        queryClient.setQueryData<InfiniteData<SocialFeedPage>>(
          socialFeedQueryKey(userId, t),
          (old) =>
            old
              ? {
                  ...old,
                  pages: old.pages.map((page) => ({
                    ...page,
                    posts: page.posts.map((p) =>
                      p.id === postId ? updater(p) : p,
                    ),
                  })),
                }
              : old,
        );
      }
    },
    [userId, queryClient],
  );

  return {
    posts,
    isLoading: query.isLoading,
    isLoadingMore: query.isFetchingNextPage,
    hasMore,
    loadMore,
    refetch,
    updatePost,
  };
}

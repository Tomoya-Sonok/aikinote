"use client";

import {
  type InfiniteData,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import type { SocialFeedPostData } from "@/components/features/social/SocialPostCard/SocialPostCard";
import { type GetSocialFeedParams, getSocialFeed } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";

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
  /** キャッシュ表示中だが直近の refetch が失敗している */
  isRefetchError: boolean;
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

export function useSocialFeed(tab: SocialTab): UseSocialFeedResult {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const query = useInfiniteQuery<
    SocialFeedPage,
    Error,
    SocialFeedPostData[],
    ReturnType<typeof socialFeedQueryKey>,
    number
  >({
    queryKey: socialFeedQueryKey(user?.id, tab),
    enabled: !authLoading && !!user?.id,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      if (!user?.id) return { posts: [], next_offset: null };
      return fetchSocialFeedPage(user.id, tab, pageParam);
    },
    getNextPageParam: (lastPage) => lastPage.next_offset ?? undefined,
    // structural sharing により同一データなら同一参照が返るので、useMemo より再レンダ抑制効果が高い
    select: (data) => data.pages.flatMap((p) => p.posts),
  });

  // 他タブのプリフェッチ（アクティブタブのロード完了後、idle callback で実行）
  useEffect(() => {
    if (!user?.id || !query.isSuccess) return;
    const currentUserId = user.id;

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
          queryKey: socialFeedQueryKey(currentUserId, otherTab),
          initialPageParam: 0,
          queryFn: async ({ pageParam }) =>
            fetchSocialFeedPage(currentUserId, otherTab, pageParam),
        });
      }
    };

    // idle callback のタイムアウトが長すぎるとユーザーがタブをすぐ切替えた際にプリフェッチが間に合わない。
    // アクティブタブのロードが済んだ直後にバックグラウンド fetch を開始させたいので 1 秒で打ち切る
    if ("requestIdleCallback" in window) {
      const handle = window.requestIdleCallback(prefetchOtherTabs, {
        timeout: 1000,
      });
      return () => window.cancelIdleCallback(handle);
    }
    const timeoutId = setTimeout(prefetchOtherTabs, 300);
    return () => clearTimeout(timeoutId);
  }, [user?.id, tab, query.isSuccess, queryClient]);

  const posts = query.data ?? [];

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
          socialFeedQueryKey(user?.id, t),
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
    [user?.id, queryClient],
  );

  return {
    posts,
    isLoading: authLoading || query.isLoading,
    isLoadingMore: query.isFetchingNextPage,
    hasMore,
    isRefetchError: query.isError && !!query.data,
    loadMore,
    refetch,
    updatePost,
  };
}

/**
 * 投稿削除時の楽観的 UI 用フック。useSocialFeed を呼ばないルート（投稿詳細など）から、
 * フィードキャッシュ上の該当投稿を即時除去できる。
 */
export function useRemoveFromSocialFeedCache() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useCallback(
    (postId: string) => {
      for (const t of ALL_TABS) {
        queryClient.setQueryData<InfiniteData<SocialFeedPage>>(
          socialFeedQueryKey(user?.id, t),
          (old) =>
            old
              ? {
                  ...old,
                  pages: old.pages.map((page) => ({
                    ...page,
                    posts: page.posts.filter((p) => p.id !== postId),
                  })),
                }
              : old,
        );
      }
    },
    [user?.id, queryClient],
  );
}

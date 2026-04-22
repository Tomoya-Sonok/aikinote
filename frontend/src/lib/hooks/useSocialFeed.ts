"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SocialFeedPostData } from "@/components/features/social/SocialPostCard/SocialPostCard";
import { type GetSocialFeedParams, getSocialFeed } from "@/lib/api/client";

type SocialTab = "all" | "training" | "favorites";

const ALL_TABS: SocialTab[] = ["all", "training", "favorites"];

interface TabState {
  posts: SocialFeedPostData[];
  offset: number;
  hasMore: boolean;
  /** null = 未取得, true = ロード中, false = 取得済み */
  initialLoading: boolean | null;
}

const createEmptyTabState = (): TabState => ({
  posts: [],
  offset: 0,
  hasMore: true,
  initialLoading: null,
});

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

const SOCIAL_FEED_FETCH_LIMIT = 20;

export function useSocialFeed(
  userId: string | undefined,
  tab: SocialTab,
): UseSocialFeedResult {
  const [tabCache, setTabCache] = useState<Record<SocialTab, TabState>>({
    all: createEmptyTabState(),
    training: createEmptyTabState(),
    favorites: createEmptyTabState(),
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const prefetchedRef = useRef(false);
  const tabCacheRef = useRef(tabCache);
  tabCacheRef.current = tabCache;

  const fetchTab = useCallback(
    async (targetTab: SocialTab, offset: number, append: boolean) => {
      if (!userId) return;

      try {
        const params: GetSocialFeedParams = {
          userId,
          tab: targetTab,
          limit: SOCIAL_FEED_FETCH_LIMIT,
          offset,
        };

        const result = await getSocialFeed(params);
        const newPosts =
          result.success && result.data
            ? (result.data as SocialFeedPostData[])
            : [];

        setTabCache((prev) => ({
          ...prev,
          [targetTab]: {
            posts: append ? [...prev[targetTab].posts, ...newPosts] : newPosts,
            offset: offset + newPosts.length,
            hasMore: newPosts.length >= SOCIAL_FEED_FETCH_LIMIT,
            initialLoading: false,
          },
        }));
      } catch (error) {
        console.error("フィード取得エラー:", error);
        setTabCache((prev) => ({
          ...prev,
          [targetTab]: {
            ...prev[targetTab],
            initialLoading: false,
          },
        }));
      }
    },
    [userId],
  );

  // アクティブタブの初回ロード
  useEffect(() => {
    if (!userId) return;
    if (tabCacheRef.current[tab].initialLoading !== null) return;

    setTabCache((prev) => ({
      ...prev,
      [tab]: { ...prev[tab], initialLoading: true },
    }));
    fetchTab(tab, 0, false);
  }, [userId, tab, fetchTab]);

  // 他タブのプリフェッチ（アクティブタブのロード完了後）
  useEffect(() => {
    if (!userId || prefetchedRef.current) return;
    if (tabCacheRef.current[tab].initialLoading !== false) return;

    prefetchedRef.current = true;

    const prefetch = () => {
      const cache = tabCacheRef.current;
      for (const otherTab of ALL_TABS) {
        if (otherTab === tab) continue;
        if (cache[otherTab].initialLoading !== null) continue;

        setTabCache((prev) => ({
          ...prev,
          [otherTab]: { ...prev[otherTab], initialLoading: true },
        }));
        fetchTab(otherTab, 0, false);
      }
    };

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(prefetch, { timeout: 3000 });
    } else {
      setTimeout(prefetch, 500);
    }
  }, [userId, tab, fetchTab]);

  const currentState = tabCache[tab];

  const loadMore = useCallback(() => {
    if (isLoadingMore || !currentState.hasMore) return;
    setIsLoadingMore(true);
    fetchTab(tab, currentState.offset, true).finally(() =>
      setIsLoadingMore(false),
    );
  }, [fetchTab, tab, currentState.offset, currentState.hasMore, isLoadingMore]);

  const refetch = useCallback(() => {
    setTabCache((prev) => ({
      ...prev,
      [tab]: { ...createEmptyTabState(), initialLoading: true },
    }));
    fetchTab(tab, 0, false);
  }, [fetchTab, tab]);

  const updatePost = useCallback(
    (
      postId: string,
      updater: (post: SocialFeedPostData) => SocialFeedPostData,
    ) => {
      // 全タブのキャッシュを更新（同じ投稿が複数タブに存在しうる）
      setTabCache((prev) => {
        const next = { ...prev };
        for (const t of ALL_TABS) {
          const state = prev[t];
          if (state.posts.some((p) => p.id === postId)) {
            next[t] = {
              ...state,
              posts: state.posts.map((p) => (p.id === postId ? updater(p) : p)),
            };
          }
        }
        return next;
      });
    },
    [],
  );

  return {
    posts: currentState.posts,
    isLoading: currentState.initialLoading !== false,
    isLoadingMore,
    hasMore: currentState.hasMore,
    loadMore,
    refetch,
    updatePost,
  };
}

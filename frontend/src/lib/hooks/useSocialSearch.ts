"use client";

import {
  type InfiniteData,
  keepPreviousData,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useState } from "react";
import type { SocialFeedPostData } from "@/components/features/social/SocialPostCard/SocialPostCard";
import {
  type SearchSocialPostsParams,
  searchSocialPosts,
} from "@/lib/api/client";
import { useDebounce } from "@/lib/hooks/useDebounce";

interface SearchInput {
  query: string;
  dojoName?: string;
  rank?: string;
  hashtag?: string;
  postType?: "post" | "training_record";
}

interface SocialSearchPage {
  posts: SocialFeedPostData[];
  next_offset: number | null;
}

interface UseSocialSearchResult {
  results: SocialFeedPostData[];
  /** 初回ロード中（前回結果が無い状態でフェッチ中）。大きな Loader 表示用 */
  isLoading: boolean;
  /** バックグラウンドフェッチ中（前回結果あり、新クエリ実行中）。subtle インジケータ用 */
  isFetching: boolean;
  /** 追加 page 取得中 */
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  search: (
    query: string,
    dojoName?: string,
    rank?: string,
    hashtag?: string,
    postType?: "post" | "training_record",
  ) => void;
  updateResult: (
    postId: string,
    updater: (post: SocialFeedPostData) => SocialFeedPostData,
  ) => void;
}

const DEBOUNCE_MS = 400;
const SOCIAL_SEARCH_FETCH_LIMIT = 20;

function hasMeaningfulParams(input: SearchInput | null): boolean {
  if (!input) return false;
  return !!(
    input.query.trim() ||
    input.dojoName ||
    input.rank ||
    input.hashtag
  );
}

export const socialSearchQueryKey = (
  userId: string | undefined,
  input: SearchInput | null,
) => ["social-search", userId, input] as const;

async function fetchSocialSearchPage(
  userId: string,
  input: SearchInput,
  offset: number,
): Promise<SocialSearchPage> {
  const params: SearchSocialPostsParams = {
    userId,
    query: input.query.trim() || undefined,
    dojoName: input.dojoName || undefined,
    rank: input.rank || undefined,
    hashtag: input.hashtag || undefined,
    postType: input.postType || undefined,
    limit: SOCIAL_SEARCH_FETCH_LIMIT,
    offset,
  };
  const result = await searchSocialPosts(params);
  const posts =
    result.success && result.data ? (result.data as SocialFeedPostData[]) : [];
  return {
    posts,
    next_offset:
      posts.length >= SOCIAL_SEARCH_FETCH_LIMIT ? offset + posts.length : null,
  };
}

export function useSocialSearch(
  userId: string | undefined,
): UseSocialSearchResult {
  const queryClient = useQueryClient();
  const [input, setInput] = useState<SearchInput | null>(null);
  const debouncedInput = useDebounce(input, DEBOUNCE_MS);

  const enabled =
    !!userId && !!debouncedInput && hasMeaningfulParams(debouncedInput);

  const query = useInfiniteQuery<
    SocialSearchPage,
    Error,
    SocialFeedPostData[],
    ReturnType<typeof socialSearchQueryKey>,
    number
  >({
    queryKey: socialSearchQueryKey(userId, debouncedInput),
    enabled,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      if (!userId || !debouncedInput) {
        return { posts: [], next_offset: null };
      }
      return fetchSocialSearchPage(userId, debouncedInput, pageParam);
    },
    getNextPageParam: (lastPage) => lastPage.next_offset ?? undefined,
    // 検索条件が変わっても前回の結果リストを保持し、入力中に大きな Loader が
    // 出て画面が空になる UX 悪化を防ぐ
    placeholderData: keepPreviousData,
    select: (data) => data.pages.flatMap((p) => p.posts),
  });

  const search = useCallback(
    (
      query: string,
      dojoName?: string,
      rank?: string,
      hashtag?: string,
      postType?: "post" | "training_record",
    ) => {
      const next: SearchInput = { query, dojoName, rank, hashtag, postType };
      if (!hasMeaningfulParams(next)) {
        setInput(null);
        return;
      }
      setInput(next);
    },
    [],
  );

  const loadMore = useCallback(() => {
    if (!query.hasNextPage || query.isFetchingNextPage) return;
    void query.fetchNextPage();
  }, [query]);

  const updateResult = useCallback(
    (
      postId: string,
      updater: (post: SocialFeedPostData) => SocialFeedPostData,
    ) => {
      // 全ての social-search キャッシュ（複数の検索条件 × InfiniteData）の該当 postId を差し替え
      queryClient.setQueriesData<InfiniteData<SocialSearchPage>>(
        { queryKey: ["social-search", userId] },
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
    },
    [userId, queryClient],
  );

  return {
    results: enabled ? (query.data ?? []) : [],
    isLoading: enabled && query.isLoading,
    isFetching: enabled && query.isFetching && !query.isLoading,
    isLoadingMore: query.isFetchingNextPage,
    hasMore: !!query.hasNextPage,
    loadMore,
    search,
    updateResult,
  };
}

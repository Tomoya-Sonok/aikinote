"use client";

import {
  keepPreviousData,
  useQuery,
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

interface UseSocialSearchResult {
  results: SocialFeedPostData[];
  /** 初回ロード中（前回結果が無い状態でフェッチ中）。大きな Loader 表示用 */
  isLoading: boolean;
  /** バックグラウンドフェッチ中（前回結果あり、新クエリ実行中）。subtle インジケータ用 */
  isFetching: boolean;
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

export function useSocialSearch(
  userId: string | undefined,
): UseSocialSearchResult {
  const queryClient = useQueryClient();
  const [input, setInput] = useState<SearchInput | null>(null);
  const debouncedInput = useDebounce(input, DEBOUNCE_MS);

  const enabled =
    !!userId && !!debouncedInput && hasMeaningfulParams(debouncedInput);

  const query = useQuery<SocialFeedPostData[], Error>({
    queryKey: socialSearchQueryKey(userId, debouncedInput),
    enabled,
    queryFn: async () => {
      if (!userId || !debouncedInput) return [];
      const params: SearchSocialPostsParams = {
        userId,
        query: debouncedInput.query.trim() || undefined,
        dojoName: debouncedInput.dojoName || undefined,
        rank: debouncedInput.rank || undefined,
        hashtag: debouncedInput.hashtag || undefined,
        postType: debouncedInput.postType || undefined,
        limit: SOCIAL_SEARCH_FETCH_LIMIT,
      };
      const result = await searchSocialPosts(params);
      return result.success && result.data
        ? (result.data as SocialFeedPostData[])
        : [];
    },
    // 検索条件が変わっても前回の結果リストを保持し、入力中に大きな Loader が
    // 出て画面が空になる UX 悪化を防ぐ
    placeholderData: keepPreviousData,
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

  const updateResult = useCallback(
    (
      postId: string,
      updater: (post: SocialFeedPostData) => SocialFeedPostData,
    ) => {
      // 全ての social-search キャッシュ（複数の検索条件）の該当 postId を差し替え
      queryClient.setQueriesData<SocialFeedPostData[]>(
        { queryKey: ["social-search", userId] },
        (old) =>
          old ? old.map((p) => (p.id === postId ? updater(p) : p)) : old,
      );
    },
    [userId, queryClient],
  );

  return {
    results: enabled ? (query.data ?? []) : [],
    isLoading: enabled && query.isLoading,
    isFetching: enabled && query.isFetching && !query.isLoading,
    search,
    updateResult,
  };
}

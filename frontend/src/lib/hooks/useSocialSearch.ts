"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SocialFeedPostData } from "@/components/features/social/SocialPostCard/SocialPostCard";
import {
  type SearchSocialPostsParams,
  searchSocialPosts,
} from "@/lib/api/client";

interface UseSocialSearchResult {
  results: SocialFeedPostData[];
  isLoading: boolean;
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

export function useSocialSearch(
  userId: string | undefined,
): UseSocialSearchResult {
  const [results, setResults] = useState<SocialFeedPostData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(
    (
      query: string,
      dojoName?: string,
      rank?: string,
      hashtag?: string,
      postType?: "post" | "training_record",
    ) => {
      if (timerRef.current) clearTimeout(timerRef.current);

      if (!userId || (!query.trim() && !dojoName && !rank && !hashtag)) {
        setResults([]);
        return;
      }

      timerRef.current = setTimeout(async () => {
        setIsLoading(true);
        try {
          const params: SearchSocialPostsParams = {
            userId,
            query: query.trim() || undefined,
            dojoName: dojoName || undefined,
            rank: rank || undefined,
            hashtag: hashtag || undefined,
            postType: postType || undefined,
            limit: SOCIAL_SEARCH_FETCH_LIMIT,
          };
          const result = await searchSocialPosts(params);
          if (result.success && result.data) {
            setResults(result.data as SocialFeedPostData[]);
          }
        } catch (error) {
          console.error("検索エラー:", error);
        } finally {
          setIsLoading(false);
        }
      }, DEBOUNCE_MS);
    },
    [userId],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const updateResult = useCallback(
    (
      postId: string,
      updater: (post: SocialFeedPostData) => SocialFeedPostData,
    ) => {
      setResults((prev) => prev.map((p) => (p.id === postId ? updater(p) : p)));
    },
    [],
  );

  return { results, isLoading, search, updateResult };
}

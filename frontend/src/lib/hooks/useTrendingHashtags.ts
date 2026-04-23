"use client";

import { useQuery } from "@tanstack/react-query";
import { getTrendingHashtags } from "@/lib/api/client";

interface TrendingHashtag {
  name: string;
  count: number;
}

interface UseTrendingHashtagsResult {
  trending: TrendingHashtag[];
  isLoading: boolean;
}

export const trendingHashtagsQueryKey = () => ["trending-hashtags"] as const;

export function useTrendingHashtags(): UseTrendingHashtagsResult {
  const query = useQuery<TrendingHashtag[], Error>({
    queryKey: trendingHashtagsQueryKey(),
    queryFn: async () => {
      const result = await getTrendingHashtags();
      return result.success && result.data ? result.data : [];
    },
  });

  return {
    trending: query.data ?? [],
    isLoading: query.isLoading,
  };
}

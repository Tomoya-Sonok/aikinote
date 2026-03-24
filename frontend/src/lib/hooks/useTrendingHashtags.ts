"use client";

import { useCallback, useEffect, useState } from "react";
import { getTrendingHashtags } from "@/lib/api/client";

interface TrendingHashtag {
  name: string;
  count: number;
}

interface UseTrendingHashtagsResult {
  trending: TrendingHashtag[];
  isLoading: boolean;
}

export function useTrendingHashtags(): UseTrendingHashtagsResult {
  const [trending, setTrending] = useState<TrendingHashtag[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTrending = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await getTrendingHashtags();
      if (result.success && result.data) {
        setTrending(result.data);
      }
    } catch {
      // エラー時は空配列のまま
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  return { trending, isLoading };
}

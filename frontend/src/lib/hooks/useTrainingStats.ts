"use client";

import { useCallback, useEffect, useState } from "react";
import { getTrainingStats } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";

export interface TagStatItem {
  tag_id: string;
  tag_name: string;
  category: string;
  page_count: number;
}

export interface MonthlyStatItem {
  month: string;
  attended_days: number;
  page_count: number;
}

export interface TrainingStatsData {
  training_start_date: string | null;
  first_training_date: string | null;
  total_attended_days: number;
  total_pages: number;
  attended_days_in_period: number;
  pages_in_period: number;
  tag_stats: TagStatItem[];
  monthly_stats: MonthlyStatItem[];
}

export interface UseTrainingStatsOptions {
  startDate?: string | null;
  endDate?: string | null;
}

export function useTrainingStats(options?: UseTrainingStatsOptions) {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TrainingStatsData | null>(null);

  const fetchStats = useCallback(async () => {
    if (authLoading) return;
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getTrainingStats({
        userId: user.id,
        startDate: options?.startDate ?? undefined,
        endDate: options?.endDate ?? undefined,
      });

      if (!response.success || !response.data) {
        throw new Error(
          (response as { error?: string }).error ??
            "統計データの取得に失敗しました",
        );
      }

      setData(response.data as TrainingStatsData);
    } catch (err) {
      console.error("Failed to fetch training stats:", err);
      setError(
        err instanceof Error ? err.message : "統計データの取得に失敗しました",
      );
    } finally {
      setLoading(false);
    }
  }, [authLoading, user?.id, options?.startDate, options?.endDate]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { loading, error, data, refetch: fetchStats };
}

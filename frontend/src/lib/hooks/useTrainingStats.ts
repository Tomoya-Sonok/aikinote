"use client";

import { useQuery } from "@tanstack/react-query";
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

export const trainingStatsQueryKey = (
  userId: string | undefined,
  startDate: string | null | undefined,
  endDate: string | null | undefined,
) => ["training-stats", userId, startDate ?? null, endDate ?? null] as const;

export function useTrainingStats(options?: UseTrainingStatsOptions) {
  const { user, loading: authLoading } = useAuth();

  const query = useQuery<TrainingStatsData, Error>({
    queryKey: trainingStatsQueryKey(
      user?.id,
      options?.startDate ?? null,
      options?.endDate ?? null,
    ),
    enabled: !authLoading && !!user?.id,
    queryFn: async () => {
      if (!user?.id) throw new Error("ユーザー未ログイン");
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
      return response.data as TrainingStatsData;
    },
  });

  return {
    loading: authLoading || query.isLoading,
    error: query.error?.message ?? null,
    data: query.data ?? null,
    refetch: query.refetch,
  };
}

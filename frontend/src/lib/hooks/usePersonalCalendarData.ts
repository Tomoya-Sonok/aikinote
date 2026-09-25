"use client";

import {
  keepPreviousData,
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import {
  getTrainingDatesMonth,
  removeTrainingDateAttendance,
  upsertTrainingDateAttendance,
} from "@/lib/api/client";

export type DayStatus = {
  isAttended: boolean;
  pageCount: number;
};

export type CalendarReminder = {
  reminder_time: string;
  reminder_days: number[];
};

export type ExamGoal = {
  exam_rank: string;
  exam_date: string;
  prev_exam_date: string | null;
  target_attendance: number;
};

type MonthSummary = {
  attendanceDates: string[];
  pageCounts: Array<{ training_date: string; page_count: number }>;
};

type ReminderSettings = {
  reminderEnabled: boolean;
  reminders: CalendarReminder[];
};

type ExamGoalData = {
  examGoal: ExamGoal | null;
  examAttendanceCount: number;
};

export const trainingDatesMonthQueryKey = (
  userId: string | undefined,
  year: number,
  month: number,
) => ["training-dates-month", userId, year, month] as const;

export const monthlyTrainingGoalQueryKey = (userId: string | undefined) =>
  ["monthly-training-goal", userId] as const;

export const reminderSettingsQueryKey = (userId: string | undefined) =>
  ["reminder-settings", userId] as const;

export const examGoalQueryKey = (userId: string | undefined) =>
  ["exam-goal", userId] as const;

/**
 * 稽古ページの作成・編集・削除や出欠の変更で、カレンダーの件数表示が変わるときに呼ぶ。
 * カレンダーは月ごとにキャッシュするため、変更後に古い件数が残らないよう全月を無効化する。
 */
export const invalidateCalendarQueries = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({ queryKey: ["training-dates-month"] });

export const buildDayStatusMap = ({
  attendanceDates,
  pageCounts,
}: MonthSummary): Record<string, DayStatus> => {
  const nextMap: Record<string, DayStatus> = {};

  for (const item of pageCounts) {
    nextMap[item.training_date] = {
      isAttended: false,
      pageCount: item.page_count,
    };
  }

  for (const trainingDate of attendanceDates) {
    const current = nextMap[trainingDate];
    nextMap[trainingDate] = {
      isAttended: true,
      pageCount: current?.pageCount ?? 0,
    };
  }

  return nextMap;
};

const fetchMonthSummary = async (
  userId: string,
  year: number,
  month: number,
): Promise<MonthSummary> => {
  const response = await getTrainingDatesMonth({ userId, year, month });
  if (!response.success || !response.data) {
    throw new Error("稽古参加日の月次データ取得に失敗しました");
  }
  return {
    attendanceDates: response.data.training_dates
      .filter((item) => item.is_attended)
      .map((item) => item.training_date),
    pageCounts: response.data.page_counts,
  };
};

const fetchJson = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(`${url} の取得に失敗しました (${res.status})`);
  return res.json();
};

const shiftMonth = (year: number, month: number, delta: number) => {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
};

/**
 * カレンダー画面のデータ（月ごとの出欠・ページ件数、月間目標、リマインダー、審査目標）。
 * 月ごとにキャッシュし、月を切り替えても前の月の表示を残したまま取得する。
 * 前後の月も先読みするので、月送りは基本的に待たずに表示できる。
 */
export function usePersonalCalendarData(
  userId: string | undefined,
  year: number,
  month: number,
) {
  const queryClient = useQueryClient();
  const enabled = !!userId;

  const monthQuery = useQuery({
    queryKey: trainingDatesMonthQueryKey(userId, year, month),
    enabled,
    placeholderData: keepPreviousData,
    queryFn: () => fetchMonthSummary(userId as string, year, month),
  });

  // 前後の月を先読み（キャッシュ済みで新しければ何もしない）
  useEffect(() => {
    if (!userId) return;
    for (const delta of [-1, 1]) {
      const adjacent = shiftMonth(year, month, delta);
      void queryClient.prefetchQuery({
        queryKey: trainingDatesMonthQueryKey(
          userId,
          adjacent.year,
          adjacent.month,
        ),
        queryFn: () => fetchMonthSummary(userId, adjacent.year, adjacent.month),
      });
    }
  }, [queryClient, userId, year, month]);

  const goalQuery = useQuery({
    queryKey: monthlyTrainingGoalQueryKey(userId),
    enabled,
    queryFn: async (): Promise<number | null> => {
      const json = await fetchJson("/api/training-goals");
      return json?.data?.goal ?? null;
    },
  });

  const reminderQuery = useQuery({
    queryKey: reminderSettingsQueryKey(userId),
    enabled,
    queryFn: async (): Promise<ReminderSettings> => {
      const json = await fetchJson("/api/notification-preferences");
      const data = json?.data;
      return {
        reminderEnabled: data?.preferences?.reminder_enabled ?? false,
        reminders: (data?.reminders ?? []).map((r: CalendarReminder) => ({
          reminder_time: r.reminder_time,
          reminder_days: r.reminder_days,
        })),
      };
    },
  });

  const examGoalQuery = useQuery({
    queryKey: examGoalQueryKey(userId),
    enabled,
    queryFn: async (): Promise<ExamGoalData> => {
      const res = await fetch("/api/exam-goals", { credentials: "include" });
      if (!res.ok) return { examGoal: null, examAttendanceCount: 0 };
      const json = await res.json();
      const examGoal: ExamGoal | null = json?.data ?? null;
      if (!examGoal) return { examGoal: null, examAttendanceCount: 0 };

      const params = new URLSearchParams({ to: examGoal.exam_date });
      if (examGoal.prev_exam_date) params.set("from", examGoal.prev_exam_date);
      const countRes = await fetch(
        `/api/training-dates-count?${params.toString()}`,
        { credentials: "include" },
      );
      const count = countRes.ok
        ? ((await countRes.json())?.data?.count ?? 0)
        : 0;
      return { examGoal, examAttendanceCount: count };
    },
  });

  const monthKey = trainingDatesMonthQueryKey(userId, year, month);

  // 出欠の切り替えは押した時点で表示を更新し、失敗したら元に戻す
  const attendanceMutation = useMutation({
    mutationFn: async ({
      dateKey,
      attend,
    }: {
      dateKey: string;
      attend: boolean;
    }) => {
      if (!userId) throw new Error("ユーザー未ログイン");
      if (attend) {
        await upsertTrainingDateAttendance({ userId, trainingDate: dateKey });
      } else {
        await removeTrainingDateAttendance({ userId, trainingDate: dateKey });
      }
    },
    onMutate: async ({ dateKey, attend }) => {
      await queryClient.cancelQueries({ queryKey: monthKey });
      const previous = queryClient.getQueryData<MonthSummary>(monthKey);
      if (previous) {
        const others = previous.attendanceDates.filter((d) => d !== dateKey);
        queryClient.setQueryData<MonthSummary>(monthKey, {
          ...previous,
          attendanceDates: attend ? [...others, dateKey] : others,
        });
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(monthKey, context.previous);
      }
    },
    onSettled: () => {
      // 審査目標の参加回数にも影響するため再取得
      void queryClient.invalidateQueries({
        queryKey: examGoalQueryKey(userId),
      });
    },
  });

  const dayStatusMap = useMemo(
    () => (monthQuery.data ? buildDayStatusMap(monthQuery.data) : {}),
    [monthQuery.data],
  );

  return {
    dayStatusMap,
    /** 表示できる月データがまだ無い（初回ロード） */
    isMonthLoading: monthQuery.isPending && enabled,
    /** 前の月の表示を残したまま、新しい月を取得中 */
    isMonthRefreshing: monthQuery.isPlaceholderData,
    monthError: monthQuery.error,
    monthlyGoal: goalQuery.data ?? null,
    setMonthlyGoal: (goal: number | null) =>
      queryClient.setQueryData(monthlyTrainingGoalQueryKey(userId), goal),
    reminderEnabled: reminderQuery.data?.reminderEnabled ?? false,
    reminders: reminderQuery.data?.reminders ?? [],
    examGoal: examGoalQuery.data?.examGoal ?? null,
    examAttendanceCount: examGoalQuery.data?.examAttendanceCount ?? 0,
    refetchExamGoal: () =>
      queryClient.invalidateQueries({ queryKey: examGoalQueryKey(userId) }),
    toggleAttendance: attendanceMutation.mutateAsync,
    isTogglingAttendance: attendanceMutation.isPending,
  };
}

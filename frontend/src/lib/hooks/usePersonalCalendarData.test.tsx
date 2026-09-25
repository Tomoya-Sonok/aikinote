/**
 * usePersonalCalendarData のテスト
 * 月ごとのキャッシュ・月切り替え時の表示維持・出欠の楽観的更新とロールバックを検証する
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePersonalCalendarData } from "./usePersonalCalendarData";

const mockGetTrainingDatesMonth = vi.fn();
const mockUpsertAttendance = vi.fn();
const mockRemoveAttendance = vi.fn();

vi.mock("@/lib/api/client", () => ({
  getTrainingDatesMonth: (...args: unknown[]) =>
    mockGetTrainingDatesMonth(...args),
  upsertTrainingDateAttendance: (...args: unknown[]) =>
    mockUpsertAttendance(...args),
  removeTrainingDateAttendance: (...args: unknown[]) =>
    mockRemoveAttendance(...args),
}));

const monthResponse = (dates: string[], pageCounts = [] as unknown[]) => ({
  success: true,
  data: {
    training_dates: dates.map((d) => ({ training_date: d, is_attended: true })),
    page_counts: pageCounts,
  },
});

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, Wrapper };
};

describe("usePersonalCalendarData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 月間目標・リマインダー・審査目標の取得（fetch）は空で返す
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }),
    );
    mockGetTrainingDatesMonth.mockImplementation(async ({ month }) =>
      month === 9 ? monthResponse(["2026-09-10"]) : monthResponse([]),
    );
  });

  it("表示中の月と前後の月のデータを取得する", async () => {
    // Arrange
    const { Wrapper } = createWrapper();

    // Act
    const { result } = renderHook(
      () => usePersonalCalendarData("user-1", 2026, 9),
      { wrapper: Wrapper },
    );

    // Assert
    await waitFor(() => {
      expect(result.current.dayStatusMap["2026-09-10"]?.isAttended).toBe(true);
    });
    const requestedMonths = mockGetTrainingDatesMonth.mock.calls.map(
      ([arg]) => arg.month,
    );
    expect(requestedMonths).toEqual(expect.arrayContaining([8, 9, 10]));
  });

  it("月を切り替えても、新しい月のデータが届くまで前の月の表示を残す", async () => {
    // Arrange
    const { Wrapper } = createWrapper();
    const { result, rerender } = renderHook(
      ({ month }) => usePersonalCalendarData("user-1", 2026, month),
      { wrapper: Wrapper, initialProps: { month: 9 } },
    );
    await waitFor(() => {
      expect(result.current.dayStatusMap["2026-09-10"]).toBeDefined();
    });
    mockGetTrainingDatesMonth.mockImplementation(() => new Promise(() => {}));

    // Act: 未取得の月（12 月）へ移動
    rerender({ month: 12 });

    // Assert: ローダーを出さず、前の月の表示を維持している
    expect(result.current.isMonthLoading).toBe(false);
    expect(result.current.isMonthRefreshing).toBe(true);
    expect(result.current.dayStatusMap["2026-09-10"]).toBeDefined();
  });

  it("出欠を付けると API の完了を待たずに表示へ反映し、API を呼ぶ", async () => {
    // Arrange
    let resolveUpsert: () => void = () => {};
    mockUpsertAttendance.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveUpsert = resolve;
        }),
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => usePersonalCalendarData("user-1", 2026, 9),
      { wrapper: Wrapper },
    );
    await waitFor(() => {
      expect(result.current.dayStatusMap["2026-09-10"]).toBeDefined();
    });

    // Act
    let togglePromise: Promise<unknown> = Promise.resolve();
    act(() => {
      togglePromise = result.current.toggleAttendance({
        dateKey: "2026-09-11",
        attend: true,
      });
    });

    // Assert
    await waitFor(() => {
      expect(result.current.dayStatusMap["2026-09-11"]?.isAttended).toBe(true);
    });
    expect(mockUpsertAttendance).toHaveBeenCalledWith({
      userId: "user-1",
      trainingDate: "2026-09-11",
    });
    await act(async () => {
      resolveUpsert();
      await togglePromise;
    });
  });

  it("出欠の更新に失敗した場合、表示を元に戻す", async () => {
    // Arrange
    mockRemoveAttendance.mockRejectedValue(new Error("network error"));
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => usePersonalCalendarData("user-1", 2026, 9),
      { wrapper: Wrapper },
    );
    await waitFor(() => {
      expect(result.current.dayStatusMap["2026-09-10"]).toBeDefined();
    });

    // Act
    await act(async () => {
      await result.current
        .toggleAttendance({ dateKey: "2026-09-10", attend: false })
        .catch(() => {});
    });

    // Assert
    expect(result.current.dayStatusMap["2026-09-10"]?.isAttended).toBe(true);
  });
});

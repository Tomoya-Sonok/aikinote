import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// モック定義
const mockGetDailyLimits = vi.fn();

vi.mock("@/lib/api/client", () => ({
  getDailyLimits: (...args: unknown[]) => mockGetDailyLimits(...args),
}));

vi.mock("@/lib/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({ user: { id: "user-1" } })),
}));

const mockUseSubscription = vi.fn(() => ({
  isPremium: false,
  loading: false,
}));

vi.mock("@/lib/hooks/useSubscription", () => ({
  useSubscription: (...args: unknown[]) => mockUseSubscription(...args),
}));

import { useDailyLimits } from "./useDailyLimits";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useDailyLimits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSubscription.mockReturnValue({ isPremium: false, loading: false });
  });

  describe("Freeユーザーの制限値計算", () => {
    it("API取得した使用量から残り回数を計算する", async () => {
      // Arrange: 投稿1件・返信2件・いいね3件使用済み
      mockGetDailyLimits.mockResolvedValue({
        posts: { used: 1, limit: 3 },
        replies: { used: 2, limit: 3 },
        favorites: { used: 3, limit: 5 },
        is_premium: false,
      });

      // Act
      const { result } = renderHook(() => useDailyLimits(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Assert: 残り = 制限値 - 使用量
      expect(result.current.postsRemaining).toBe(2);
      expect(result.current.repliesRemaining).toBe(1);
      expect(result.current.favoritesRemaining).toBe(2);
    });

    it("使用量が制限値に達した場合は残り0になりcanPostがfalseになる", async () => {
      // Arrange: 投稿3件使用済み（上限到達）
      mockGetDailyLimits.mockResolvedValue({
        posts: { used: 3, limit: 3 },
        replies: { used: 0, limit: 3 },
        favorites: { used: 0, limit: 5 },
        is_premium: false,
      });

      // Act
      const { result } = renderHook(() => useDailyLimits(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Assert: 残り0で投稿不可
      expect(result.current.postsRemaining).toBe(0);
      expect(result.current.canPost).toBe(false);
      expect(result.current.canReply).toBe(true);
    });

    it("API取得失敗時はデフォルト制限値（投稿3/いいね5）にフォールバックする", async () => {
      // Arrange
      mockGetDailyLimits.mockRejectedValue(new Error("Network error"));

      // Act
      const { result } = renderHook(() => useDailyLimits(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Assert: デフォルト値（使用量0）で全残り回数が制限値と一致
      expect(result.current.postsRemaining).toBe(3);
      expect(result.current.repliesRemaining).toBe(3);
      expect(result.current.favoritesRemaining).toBe(5);
    });
  });

  describe("Premiumユーザーの制限", () => {
    it("Premiumユーザーは残り回数がInfinityでcanPost/canReply/canFavoriteが全てtrue", async () => {
      // Arrange
      mockUseSubscription.mockReturnValue({ isPremium: true, loading: false });

      // Act
      const { result } = renderHook(() => useDailyLimits(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Assert
      expect(result.current.postsRemaining).toBe(Number.POSITIVE_INFINITY);
      expect(result.current.repliesRemaining).toBe(Number.POSITIVE_INFINITY);
      expect(result.current.favoritesRemaining).toBe(Number.POSITIVE_INFINITY);
      expect(result.current.canPost).toBe(true);
      expect(result.current.canReply).toBe(true);
      expect(result.current.canFavorite).toBe(true);
      expect(result.current.isPremium).toBe(true);
    });

    it("PremiumユーザーはAPIを呼ばずにローカルで制限値を設定する", async () => {
      // Arrange
      mockUseSubscription.mockReturnValue({ isPremium: true, loading: false });

      // Act
      const { result } = renderHook(() => useDailyLimits(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Assert
      expect(mockGetDailyLimits).not.toHaveBeenCalled();
    });
  });

  describe("インクリメント操作", () => {
    it("incrementPostCountで投稿使用量が1増加し残り回数が1減少する", async () => {
      // Arrange
      mockGetDailyLimits.mockResolvedValue({
        posts: { used: 1, limit: 3 },
        replies: { used: 0, limit: 3 },
        favorites: { used: 0, limit: 5 },
        is_premium: false,
      });
      const { result } = renderHook(() => useDailyLimits(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Act
      act(() => result.current.incrementPostCount());

      // Assert: 残り2 → 1に減少
      await waitFor(() => expect(result.current.postsRemaining).toBe(1));
    });

    it("incrementFavoriteCountでいいね使用量が1増加する", async () => {
      // Arrange
      mockGetDailyLimits.mockResolvedValue({
        posts: { used: 0, limit: 3 },
        replies: { used: 0, limit: 3 },
        favorites: { used: 4, limit: 5 },
        is_premium: false,
      });
      const { result } = renderHook(() => useDailyLimits(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Act
      act(() => result.current.incrementFavoriteCount());

      // Assert: 残り1 → 0、canFavoriteがfalseに
      await waitFor(() => {
        expect(result.current.favoritesRemaining).toBe(0);
        expect(result.current.canFavorite).toBe(false);
      });
    });
  });
});

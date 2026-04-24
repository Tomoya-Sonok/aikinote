import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// モック定義
const mockShowToast = vi.fn();
const mockGetTags = vi.fn();
const mockGetCategories = vi.fn();
const mockCreateTag = vi.fn();
const mockCreateCategory = vi.fn();
const mockInitializeUserTags = vi.fn();

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/contexts/ToastContext", () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

vi.mock("@/lib/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/lib/api/client", () => ({
  getTags: (...args: unknown[]) => mockGetTags(...args),
  getCategories: (...args: unknown[]) => mockGetCategories(...args),
  createTag: (...args: unknown[]) => mockCreateTag(...args),
  createCategory: (...args: unknown[]) => mockCreateCategory(...args),
  initializeUserTags: (...args: unknown[]) => mockInitializeUserTags(...args),
}));

import { useTagManagement } from "./useTagManagement";

/** TanStack Query 化に伴い useQuery を使うので、renderHook を QueryClientProvider で包む */
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

/** 共通のモック初期化 */
const setupDefaultMocks = () => {
  mockGetCategories.mockResolvedValue({
    success: true,
    data: [
      { id: "cat-1", name: "取り", user_id: "user-1", sort_order: 1 },
      { id: "cat-2", name: "受け", user_id: "user-1", sort_order: 2 },
      { id: "cat-3", name: "技", user_id: "user-1", sort_order: 3 },
    ],
  });
  mockGetTags.mockResolvedValue({
    success: true,
    data: [
      { id: "t1", name: "立技", category: "取り", user_id: "user-1" },
      { id: "t2", name: "座技", category: "取り", user_id: "user-1" },
      { id: "t3", name: "正面打ち", category: "受け", user_id: "user-1" },
      { id: "t4", name: "四方投げ", category: "技", user_id: "user-1" },
    ],
  });
};

describe("useTagManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  describe("タグトグル操作", () => {
    it("未選択のタグをトグルすると選択状態になる", async () => {
      // Arrange
      const { result } = renderHook(() => useTagManagement(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Act
      act(() => result.current.handleTagToggle("取り", "立技"));

      // Assert
      expect(result.current.selectedByCategory["取り"]).toEqual(["立技"]);
    });

    it("選択済みのタグをトグルすると選択解除される", async () => {
      // Arrange
      const { result } = renderHook(() => useTagManagement(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.loading).toBe(false));
      act(() => result.current.handleTagToggle("取り", "立技"));

      // Act
      act(() => result.current.handleTagToggle("取り", "立技"));

      // Assert
      expect(result.current.selectedByCategory["取り"]).toEqual([]);
    });

    it("複数カテゴリのタグを独立してトグルできる", async () => {
      // Arrange
      const { result } = renderHook(() => useTagManagement(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Act
      act(() => {
        result.current.handleTagToggle("取り", "立技");
        result.current.handleTagToggle("受け", "正面打ち");
      });

      // Assert
      expect(result.current.selectedByCategory["取り"]).toEqual(["立技"]);
      expect(result.current.selectedByCategory["受け"]).toEqual(["正面打ち"]);
    });
  });

  describe("新規タグ作成バリデーション", () => {
    it("空文字列の場合はエラートーストを表示しAPIを呼ばない", async () => {
      // Arrange
      const { result } = renderHook(() => useTagManagement(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.loading).toBe(false));
      act(() => result.current.setNewTagInput("   "));

      // Act
      act(() => result.current.handleSubmitNewTag("取り"));

      // Assert
      expect(mockShowToast).toHaveBeenCalledWith(
        "pageModal.tagNameRequired",
        "error",
      );
      expect(mockCreateTag).not.toHaveBeenCalled();
    });

    it("21文字以上の場合はエラートーストを表示する", async () => {
      // Arrange
      const { result } = renderHook(() => useTagManagement(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.loading).toBe(false));
      act(() => result.current.setNewTagInput("あ".repeat(21)));

      // Act
      act(() => result.current.handleSubmitNewTag("取り"));

      // Assert
      expect(mockShowToast).toHaveBeenCalledWith(
        "pageModal.tagNameTooLong",
        "error",
      );
      expect(mockCreateTag).not.toHaveBeenCalled();
    });

    it("不正な文字（@#$）を含む場合はエラートーストを表示する", async () => {
      // Arrange
      const { result } = renderHook(() => useTagManagement(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.loading).toBe(false));
      act(() => result.current.setNewTagInput("タグ@#$"));

      // Act
      act(() => result.current.handleSubmitNewTag("取り"));

      // Assert
      expect(mockShowToast).toHaveBeenCalledWith(
        "pageModal.tagNameInvalid",
        "error",
      );
    });

    it("20文字以内の日本語・英数字タグ名はバリデーションを通過しAPIが呼ばれる", async () => {
      // Arrange
      mockCreateTag.mockResolvedValue({
        success: true,
        data: {
          id: "new-1",
          name: "半身半立ち",
          category: "取り",
          user_id: "user-1",
        },
      });
      const { result } = renderHook(() => useTagManagement(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.loading).toBe(false));
      act(() => result.current.setNewTagInput("半身半立ち"));

      // Act
      act(() => result.current.handleSubmitNewTag("取り"));

      // Assert
      expect(mockCreateTag).toHaveBeenCalledWith({
        name: "半身半立ち",
        category: "取り",
        user_id: "user-1",
      });
    });
  });

  describe("カテゴリ追加", () => {
    it("MAX_CATEGORIES（5）に達している場合はエラートーストを表示する", async () => {
      // Arrange: 5カテゴリを返す
      mockGetCategories.mockResolvedValue({
        success: true,
        data: Array.from({ length: 5 }, (_, i) => ({
          id: `cat-${i}`,
          name: `カテゴリ${i}`,
          user_id: "user-1",
          sort_order: i,
        })),
      });
      const { result } = renderHook(() => useTagManagement(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Act
      await act(() => result.current.handleCreateCategory("新カテゴリ"));

      // Assert
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining("tagManagement.categoryLimitReached"),
        "error",
      );
      expect(mockCreateCategory).not.toHaveBeenCalled();
    });

    it("カテゴリ数が上限未満の場合はAPIが呼ばれ成功トーストを表示する", async () => {
      // Arrange
      mockCreateCategory.mockResolvedValue({
        success: true,
        data: {
          id: "cat-new",
          name: "新カテゴリ",
          user_id: "user-1",
          sort_order: 4,
        },
      });
      const { result } = renderHook(() => useTagManagement(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Act
      await act(() => result.current.handleCreateCategory("新カテゴリ"));

      // Assert
      expect(mockCreateCategory).toHaveBeenCalledWith({
        name: "新カテゴリ",
        user_id: "user-1",
      });
      expect(mockShowToast).toHaveBeenCalledWith(
        "tagManagement.categoryCreateSuccess",
        "success",
      );
    });
  });

  describe("旧形式互換プロパティ", () => {
    it("tagsByCategoryから取り・受け・技のタグが導出される", async () => {
      // Arrange & Act
      const { result } = renderHook(() => useTagManagement(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Assert
      expect(result.current.toriTags).toEqual(["立技", "座技"]);
      expect(result.current.ukeTags).toEqual(["正面打ち"]);
      expect(result.current.wazaTags).toEqual(["四方投げ"]);
    });

    it("setSelectedToriで取りカテゴリの選択状態が更新される", async () => {
      // Arrange
      const { result } = renderHook(() => useTagManagement(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Act
      act(() => result.current.setSelectedTori(["立技"]));

      // Assert
      expect(result.current.selectedTori).toEqual(["立技"]);
      expect(result.current.selectedByCategory["取り"]).toEqual(["立技"]);
    });
  });

  describe("タグ初期化判定", () => {
    it("タグが0件の場合はneedsInitialTagsがtrueになる", async () => {
      // Arrange
      mockGetTags.mockResolvedValue({ success: true, data: [] });

      // Act
      const { result } = renderHook(() => useTagManagement(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Assert
      expect(result.current.needsInitialTags).toBe(true);
    });

    it("タグが1件以上ある場合はneedsInitialTagsがfalseになる", async () => {
      // Arrange & Act
      const { result } = renderHook(() => useTagManagement(), {
        wrapper: createWrapper(),
      });
      await waitFor(() => expect(result.current.loading).toBe(false));

      // Assert
      expect(result.current.needsInitialTags).toBe(false);
    });
  });
});

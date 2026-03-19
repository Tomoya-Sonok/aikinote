import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useParams, useRouter } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deletePage, getPage, getTags, updatePage } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { I18nTestProvider } from "@/test-utils/i18n-test-provider";
import { PageDetail } from "./PageDetail";

// モック設定
vi.mock("next/navigation", () => ({
  useParams: vi.fn(),
  useRouter: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  getPage: vi.fn(),
  getTags: vi.fn(),
  updatePage: vi.fn(),
  deletePage: vi.fn(),
  getAttachments: vi.fn().mockResolvedValue({ success: true, data: [] }),
}));

vi.mock("@/lib/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/contexts/ToastContext", () => ({
  useToast: vi.fn(() => ({
    showToast: vi.fn(),
  })),
}));

vi.mock("@/components/shared/TabNavigation/TabNavigation", () => ({
  TabNavigation: () => <div data-testid="tab-navigation">TabNavigation</div>,
}));

vi.mock("@/components/shared/Tag/Tag", () => ({
  Tag: ({ children }: { children: ReactNode }) => (
    <span data-testid="tag">{children}</span>
  ),
}));

describe("ページ詳細画面", () => {
  const mockUseRouter = vi.mocked(useRouter);
  const mockUseParams = vi.mocked(useParams);
  const mockUseAuth = vi.mocked(useAuth);
  const mockGetPage = vi.mocked(getPage);
  const mockGetTags = vi.mocked(getTags);
  const mockUpdatePage = vi.mocked(updatePage);
  const mockDeletePage = vi.mocked(deletePage);

  const mockPush = vi.fn();
  const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

  // モックデータの定義
  const mockInitialPageData = {
    success: true,
    data: {
      page: {
        id: "test-page-id",
        title: "テスト稽古ページ",
        content: "今日は基本動作の稽古を行いました",
        user_id: "test-user-id",
        is_public: false,
        created_at: "2023-01-01T00:00:00.000Z",
        updated_at: "2023-01-01T00:00:00.000Z",
      },
      tags: [
        { id: "tag1", name: "立技", category: "取り" },
        { id: "tag2", name: "正面打ち", category: "受け" },
      ],
    },
  };

  const mockAvailableTags = {
    success: true,
    data: [
      { id: "tag1", name: "立技", category: "取り" },
      { id: "tag2", name: "正面打ち", category: "受け" },
      { id: "tag3", name: "片手取り", category: "受け" },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseRouter.mockReturnValue({ push: mockPush });
    mockUseParams.mockReturnValue({ page_id: "test-page-id" });
    mockUseAuth.mockReturnValue({
      user: {
        id: "test-user-id",
        email: "test@example.com",
        username: "テストユーザー",
        profile_image_url: null,
      },
      loading: false,
      isInitializing: false,
      isProcessing: false,
      error: null,
      signUp: vi.fn(),
      signInWithCredentials: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOutUser: vi.fn(),
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
      verifyEmail: vi.fn(),
      clearError: vi.fn(),
    });

    // デフォルトのAPIモック
    mockGetPage.mockResolvedValue(mockInitialPageData);
    mockGetTags.mockResolvedValue(mockAvailableTags);
    mockDeletePage.mockReset();
    alertSpy.mockClear();
  });

  describe("表示", () => {
    it("ページ詳細が正常に表示されること", async () => {
      // Arrange
      await act(async () => {
        render(
          <I18nTestProvider>
            <PageDetail />
          </I18nTestProvider>,
        );
      });

      // Act & Assert
      await waitFor(() => {
        expect(screen.getByText("テスト稽古ページ")).toBeInTheDocument();
      });
      expect(
        screen.getByText("今日は基本動作の稽古を行いました"),
      ).toBeInTheDocument();
      expect(screen.getByText("立技")).toBeInTheDocument();
      expect(screen.getByText("正面打ち")).toBeInTheDocument();
    });

    it("読み込み中の状態が表示されること", async () => {
      // Arrange
      mockGetPage.mockImplementation(() => new Promise(() => {})); // 解決しないPromise

      // Act
      await act(async () => {
        render(
          <I18nTestProvider>
            <PageDetail />
          </I18nTestProvider>,
        );
      });

      // Assert
      expect(screen.getByText("内容")).toBeInTheDocument();
      expect(screen.getByText("ページ一覧へ")).toBeInTheDocument();
    });

    it("ページが見つからない場合にエラーメッセージが表示されること", async () => {
      // Arrange
      mockGetPage.mockResolvedValue({ success: false, error: "Not Found" });

      // Act
      await act(async () => {
        render(
          <I18nTestProvider>
            <PageDetail />
          </I18nTestProvider>,
        );
      });

      // Assert
      await waitFor(() => {
        expect(
          screen.getByText("ページが見つかりませんでした"),
        ).toBeInTheDocument();
      });
    });

    describe("削除機能", () => {
      it("削除ボタン押下後に確認しページを削除できること", async () => {
        // Arrange
        mockDeletePage.mockResolvedValue({
          success: true,
          message: "ページが正常に削除されました",
        });

        const user = userEvent.setup();

        await act(async () => {
          render(
            <I18nTestProvider>
              <PageDetail />
            </I18nTestProvider>,
          );
        });

        await waitFor(() => {
          expect(screen.getByText("テスト稽古ページ")).toBeInTheDocument();
        });

        // Act
        const deleteButton = screen.getByRole("button", { name: "削除" });
        await user.click(deleteButton);

        const dialog = await screen.findByRole("dialog");
        const confirmButton = within(dialog).getByRole("button", {
          name: "削除",
        });
        await user.click(confirmButton);

        // Assert
        await waitFor(() => {
          expect(mockDeletePage).toHaveBeenCalledWith(
            "test-page-id",
            "test-user-id",
          );
        });

        await waitFor(() => {
          expect(mockPush).toHaveBeenCalledWith("/ja/personal/pages");
        });
      });
    });
  });

  describe("編集機能", () => {
    it("編集ボタンをクリックすると、編集ページに遷移すること", async () => {
      // Arrange
      await act(async () => {
        render(
          <I18nTestProvider>
            <PageDetail />
          </I18nTestProvider>,
        );
      });
      await waitFor(() => {
        expect(screen.getByText("テスト稽古ページ")).toBeInTheDocument();
      });

      // Act
      const editButton = screen.getByRole("button", { name: "編集" });
      await userEvent.click(editButton);

      // Assert
      expect(window.location.href).toContain(
        "/personal/pages/test-page-id/edit",
      );
    });
  });
});

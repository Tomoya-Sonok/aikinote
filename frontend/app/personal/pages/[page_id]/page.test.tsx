import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useParams, useRouter } from "next/navigation";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import type { PageEditModalProps } from "@/components/organisms/PageEditModal/PageEditModal";
import { getPage, getTags, updatePage } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import PageDetailPage from "./page";

// モック設定
vi.mock("next/navigation", () => ({
  useParams: vi.fn(),
  useRouter: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  getPage: vi.fn(),
  getTags: vi.fn(),
  updatePage: vi.fn(),
}));

vi.mock("@/lib/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}));

vi.mock("@/components/molecules/TabNavigation/TabNavigation", () => ({
  TabNavigation: () => <div data-testid="tab-navigation">TabNavigation</div>,
}));

vi.mock("@/components/atoms/Tag/Tag", () => ({
  Tag: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="tag">{children}</span>
  ),
}));

// PageEditModalのモック
// vi.hoisted でモック用コンポーネントを定義
const { MockPageEditModal } = vi.hoisted(() => {
  return {
    MockPageEditModal: vi.fn(({ isOpen }: { isOpen: boolean }) =>
      isOpen ? <div data-testid="page-edit-modal">モーダル</div> : null,
    ),
  };
});

// モジュールモック
vi.mock("@/components/organisms/PageEditModal/PageEditModal", () => ({
  PageEditModal: MockPageEditModal,
}));

describe("ページ詳細画面", () => {
  const mockUseRouter = vi.mocked(useRouter);
  const mockUseParams = vi.mocked(useParams);
  const mockUseAuth = vi.mocked(useAuth);
  const mockGetPage = vi.mocked(getPage);
  const mockGetTags = vi.mocked(getTags);
  const mockUpdatePage = vi.mocked(updatePage);

  const mockPush = vi.fn();

  // モックデータの定義
  const mockInitialPageData = {
    success: true,
    data: {
      page: {
        id: "test-page-id",
        title: "テスト稽古ページ",
        content: "今日は基本動作の稽古を行いました",
        comment: "姿勢に注意が必要",
        user_id: "test-user-id",
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
  });

  describe("表示", () => {
    it("ページ詳細が正常に表示されること", async () => {
      // Arrange
      render(<PageDetailPage />);

      // Act & Assert
      await waitFor(() => {
        expect(screen.getByText("テスト稽古ページ")).toBeInTheDocument();
      });
      expect(
        screen.getByText("今日は基本動作の稽古を行いました"),
      ).toBeInTheDocument();
      expect(screen.getByText("姿勢に注意が必要")).toBeInTheDocument();
      expect(screen.getByText("立技")).toBeInTheDocument();
      expect(screen.getByText("正面打ち")).toBeInTheDocument();
    });

    it("読み込み中の状態が表示されること", () => {
      // Arrange
      mockGetPage.mockImplementation(() => new Promise(() => {})); // 解決しないPromise

      // Act
      render(<PageDetailPage />);

      // Assert
      expect(screen.getByText("読み込み中...")).toBeInTheDocument();
    });

    it("ページが見つからない場合にエラーメッセージが表示されること", async () => {
      // Arrange
      mockGetPage.mockResolvedValue({ success: false, error: "Not Found" });

      // Act
      render(<PageDetailPage />);

      // Assert
      await waitFor(() => {
        expect(
          screen.getByText("ページが見つかりませんでした"),
        ).toBeInTheDocument();
      });
    });
  });

  describe("編集機能", () => {
    it("編集ボタンをクリックすると、ページ編集モーダルが表示されること", async () => {
      // Arrange
      render(<PageDetailPage />);
      await waitFor(() => {
        expect(screen.getByText("テスト稽古ページ")).toBeInTheDocument();
      });

      // Act
      const editButton = screen.getByRole("button", { name: "編集" });
      await userEvent.click(editButton);

      // Assert
      expect(screen.getByTestId("page-edit-modal")).toBeInTheDocument();
    });

    it("モーダルに渡される初期データが正しいこと", async () => {
      // Arrange
      render(<PageDetailPage />);
      await waitFor(() => {
        expect(screen.getByText("テスト稽古ページ")).toBeInTheDocument();
      });

      // Act
      const editButton = screen.getByRole("button", { name: "編集" });
      await userEvent.click(editButton);

      // Assert
      const expectedInitialData = {
        id: "test-page-id",
        title: "テスト稽古ページ",
        content: "今日は基本動作の稽古を行いました",
        comment: "姿勢に注意が必要",
        tori: ["立技"],
        uke: ["正面打ち"],
        waza: [],
      };
      expect(MockPageEditModal).toHaveBeenCalledWith(
        expect.objectContaining({ initialData: expectedInitialData }),
        expect.anything(),
      );
    });

    it("ページ更新が成功すると、表示が更新されること", async () => {
      // Arrange
      const updatedPageData = {
        success: true,
        data: {
          page: {
            id: "test-page-id",
            title: "更新された稽古ページ",
            content: "更新された内容",
            comment: "更新されたコメント",
            user_id: "test-user-id",
            created_at: "2023-01-01T00:00:00.000Z",
            updated_at: "2023-01-02T00:00:00.000Z",
          },
          tags: [{ id: "tag3", name: "片手取り", category: "受け" }],
        },
      };
      mockUpdatePage.mockResolvedValue(updatedPageData);

      render(<PageDetailPage />);
      await waitFor(() => {
        expect(screen.getByText("テスト稽古ページ")).toBeInTheDocument();
      });

      // Act
      const editButton = screen.getByRole("button", { name: "編集" });
      await userEvent.click(editButton);

      const onUpdate = (MockPageEditModal as Mock<[PageEditModalProps]>).mock
        .calls[0][0].onUpdate;

      await act(async () => {
        await onUpdate({ id: "test-page-id", title: "更新された稽古ページ" });
      });

      // Assert
      await waitFor(() => {
        expect(screen.getByText("更新された稽古ページ")).toBeInTheDocument();
      });
      expect(screen.getByText("更新された内容")).toBeInTheDocument();
      expect(screen.getByText("更新されたコメント")).toBeInTheDocument();
      expect(screen.getByText("片手取り")).toBeInTheDocument();
      expect(screen.queryByText("テスト稽古ページ")).not.toBeInTheDocument();
    });

    it("ページ更新APIの呼び出しが正しいパラメータで行われること", async () => {
      // Arrange
      render(<PageDetailPage />);
      await waitFor(() => {
        expect(screen.getByText("テスト稽古ページ")).toBeInTheDocument();
      });

      // Act
      const editButton = screen.getByRole("button", { name: "編集" });
      await userEvent.click(editButton);

      const onUpdate = (MockPageEditModal as Mock<[PageEditModalProps]>).mock
        .calls[0][0].onUpdate;

      const updatePayload = {
        id: "test-page-id",
        title: "更新ペイロード",
        content: "内容",
        comment: "コメント",
        tori: [],
        uke: [],
        waza: [],
      };
      await act(async () => {
        await onUpdate(updatePayload);
      });

      // Assert
      expect(mockUpdatePage).toHaveBeenCalledWith(updatePayload);
    });
  });
});

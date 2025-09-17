import { render, screen, waitFor } from "@testing-library/react";
import { useParams, useRouter } from "next/navigation";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { getPage } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import PageDetailPage from "./page";

// モック設定
vi.mock("next/navigation", () => ({
  useParams: vi.fn(),
  useRouter: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  getPage: vi.fn(),
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

describe("ページ詳細画面", () => {
  const mockUseRouter = vi.mocked(useRouter);
  const mockUseParams = vi.mocked(useParams);
  const mockUseAuth = vi.mocked(useAuth);
  const mockGetPage = vi.mocked(getPage);

  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseRouter.mockReturnValue({
      push: mockPush,
    } as any);

    mockUseParams.mockReturnValue({
      page_id: "test-page-id",
    });

    mockUseAuth.mockReturnValue({
      session: {
        user: {
          id: "test-user-id",
        },
      },
    } as any);
  });

  it("ページ詳細が正常に表示されること", async () => {
    // Arrange
    const mockApiResponse = {
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
          {
            id: "tag1",
            name: "立技",
            category: "取り",
          },
          {
            id: "tag2",
            name: "正面打ち",
            category: "受け",
          },
        ],
      },
      message: "ページ詳細を取得しました",
    };

    mockGetPage.mockResolvedValue(mockApiResponse);

    // Act
    render(<PageDetailPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("テスト稽古ページ")).toBeInTheDocument();
    });

    expect(screen.getByText("今日は基本動作の稽古を行いました")).toBeInTheDocument();
    expect(screen.getByText("姿勢に注意が必要")).toBeInTheDocument();
    expect(screen.getByText("立技")).toBeInTheDocument();
    expect(screen.getByText("正面打ち")).toBeInTheDocument();
  });

  it("読み込み中の状態が表示されること", async () => {
    // Arrange
    mockGetPage.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    // Act
    render(<PageDetailPage />);

    // Assert
    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });

  it("ページが見つからない場合にエラーメッセージが表示されること", async () => {
    // Arrange
    mockGetPage.mockRejectedValue(new Error("ページが見つかりません"));

    // Act
    render(<PageDetailPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("ページが見つかりませんでした")).toBeInTheDocument();
    });

    expect(screen.getByText("ページ一覧に戻る")).toBeInTheDocument();
  });

  it("APIレスポンスが失敗の場合にエラーメッセージが表示されること", async () => {
    // Arrange
    const mockApiResponse = {
      success: false,
      error: "アクセス権限がありません",
    };

    mockGetPage.mockResolvedValue(mockApiResponse);

    // Act
    render(<PageDetailPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("ページが見つかりませんでした")).toBeInTheDocument();
    });
  });

  it("ユーザーIDが存在しない場合にページが表示されないこと", async () => {
    // Arrange
    mockUseAuth.mockReturnValue({
      session: null,
    } as any);

    // Act
    render(<PageDetailPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("ページが見つかりませんでした")).toBeInTheDocument();
    });

    expect(mockGetPage).not.toHaveBeenCalled();
  });

  it("タグが存在しないページが正常に表示されること", async () => {
    // Arrange
    const mockApiResponse = {
      success: true,
      data: {
        page: {
          id: "test-page-id",
          title: "タグなし稽古ページ",
          content: "タグを設定していない稽古の記録",
          comment: "",
          user_id: "test-user-id",
          created_at: "2023-01-01T00:00:00.000Z",
          updated_at: "2023-01-01T00:00:00.000Z",
        },
        tags: [],
      },
      message: "ページ詳細を取得しました",
    };

    mockGetPage.mockResolvedValue(mockApiResponse);

    // Act
    render(<PageDetailPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("タグなし稽古ページ")).toBeInTheDocument();
    });

    expect(screen.getByText("タグを設定していない稽古の記録")).toBeInTheDocument();
    expect(screen.queryByTestId("tag")).not.toBeInTheDocument();
  });

  it("コメントが空の場合にコメントセクションが表示されないこと", async () => {
    // Arrange
    const mockApiResponse = {
      success: true,
      data: {
        page: {
          id: "test-page-id",
          title: "コメントなしページ",
          content: "稽古の記録",
          comment: "",
          user_id: "test-user-id",
          created_at: "2023-01-01T00:00:00.000Z",
          updated_at: "2023-01-01T00:00:00.000Z",
        },
        tags: [],
      },
      message: "ページ詳細を取得しました",
    };

    mockGetPage.mockResolvedValue(mockApiResponse);

    // Act
    render(<PageDetailPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("コメントなしページ")).toBeInTheDocument();
    });

    expect(screen.queryByText("その他・コメント")).not.toBeInTheDocument();
  });

  it("APIが正しいパラメータで呼び出されること", async () => {
    // Arrange
    const mockApiResponse = {
      success: true,
      data: {
        page: {
          id: "test-page-id",
          title: "テストページ",
          content: "テスト内容",
          comment: "",
          user_id: "test-user-id",
          created_at: "2023-01-01T00:00:00.000Z",
          updated_at: "2023-01-01T00:00:00.000Z",
        },
        tags: [],
      },
      message: "ページ詳細を取得しました",
    };

    mockGetPage.mockResolvedValue(mockApiResponse);

    // Act
    render(<PageDetailPage />);

    // Assert
    await waitFor(() => {
      expect(mockGetPage).toHaveBeenCalledWith("test-page-id", "test-user-id");
    });
  });
});
import { render, screen, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { getPages, getTags } from "@/lib/api/client";
import PersonalPagesPage from "./page";

// モック設定
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  getPages: vi.fn(),
  getTags: vi.fn(),
  createPage: vi.fn(),
  updatePage: vi.fn(),
}));

vi.mock("@/lib/hooks/useDebounce", () => ({
  useDebounce: vi.fn((value) => value),
}));

vi.mock("@/lib/utils/dateUtils", () => ({
  formatToLocalDateString: vi.fn((date) => "2023-01-01"),
}));

vi.mock("@/components/layout/AppLayout", () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="app-layout">{children}</div>
  ),
}));

vi.mock("@/components/molecules/TabNavigation/TabNavigation", () => ({
  TabNavigation: () => <div data-testid="tab-navigation">TabNavigation</div>,
}));

vi.mock("@/components/molecules/FilterArea/FilterArea", () => ({
  FilterArea: () => <div data-testid="filter-area">FilterArea</div>,
}));

vi.mock("@/components/molecules/TrainingCard/TrainingCard", () => ({
  TrainingCard: ({ title, onClick }: { title: string; onClick: () => void }) => (
    <div data-testid="training-card" onClick={onClick}>
      {title}
    </div>
  ),
}));

vi.mock("@/components/atoms/FloatingActionButton/FloatingActionButton", () => ({
  FloatingActionButton: ({ onClick }: { onClick: () => void }) => (
    <button data-testid="floating-action-button" onClick={onClick}>
      +
    </button>
  ),
}));

vi.mock("@/components/organisms/PageCreateModal/PageCreateModal", () => ({
  PageCreateModal: () => <div data-testid="page-create-modal">PageCreateModal</div>,
}));

vi.mock("@/components/organisms/PageEditModal/PageEditModal", () => ({
  PageEditModal: () => <div data-testid="page-edit-modal">PageEditModal</div>,
}));

vi.mock("@/components/organisms/TagFilterModal/TagFilterModal", () => ({
  TagFilterModal: () => <div data-testid="tag-filter-modal">TagFilterModal</div>,
}));

// テスト用定数
const PAGE_LIMIT = 25;

describe("ページ一覧画面", () => {
  const mockUseRouter = vi.mocked(useRouter);
  const mockUseSession = vi.mocked(useSession);
  const mockGetPages = vi.mocked(getPages);
  const mockGetTags = vi.mocked(getTags);

  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseRouter.mockReturnValue({
      push: mockPush,
    } as any);

    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: "test-user-id",
        },
      },
      status: "authenticated",
    } as any);

    mockGetTags.mockResolvedValue({
      success: true,
      data: [
        {
          id: "tag1",
          name: "立技",
          category: "取り",
          user_id: "test-user-id",
          created_at: "2023-01-01T00:00:00.000Z",
        },
      ],
    });
  });

  it("ページ一覧が正常に表示されること", async () => {
    // Arrange
    const mockPagesResponse = {
      success: true,
      data: {
        training_pages: [
          {
            page: {
              id: "page1",
              title: "稽古ページ1",
              content: "基本動作の稽古",
              comment: "姿勢改善が必要",
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
            ],
          },
          {
            page: {
              id: "page2",
              title: "稽古ページ2",
              content: "応用技の稽古",
              comment: "",
              user_id: "test-user-id",
              created_at: "2023-01-02T00:00:00.000Z",
              updated_at: "2023-01-02T00:00:00.000Z",
            },
            tags: [],
          },
        ],
      },
      message: "ページ一覧を取得しました",
    };

    mockGetPages.mockResolvedValue(mockPagesResponse);

    // Act
    render(<PersonalPagesPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("稽古ページ1")).toBeInTheDocument();
    });

    expect(screen.getByText("稽古ページ2")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("page-stats")).toHaveTextContent(
        "これまでに作成したページ数は2ページです",
      );
    });
  });

  it("読み込み中の状態が表示されること", async () => {
    // Arrange
    mockGetPages.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000)),
    );

    // Act
    render(<PersonalPagesPage />);

    // Assert
    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });

  it("認証されていない場合にログインメッセージが表示されること", async () => {
    // Arrange
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
    } as any);

    // Act
    render(<PersonalPagesPage />);

    // Assert
    expect(screen.getByText("ログインが必要です。")).toBeInTheDocument();
    expect(screen.getByText("ログインページへ")).toBeInTheDocument();
  });

  it("セッション読み込み中の状態が表示されること", async () => {
    // Arrange
    mockUseSession.mockReturnValue({
      data: null,
      status: "loading",
    } as any);

    // Act
    render(<PersonalPagesPage />);

    // Assert
    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });

  it("ページが存在しない場合に空の状態が表示されること", async () => {
    // Arrange
    const mockEmptyResponse = {
      success: true,
      data: {
        training_pages: [],
      },
      message: "ページ一覧を取得しました",
    };

    mockGetPages.mockResolvedValue(mockEmptyResponse);

    // Act
    render(<PersonalPagesPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId("page-stats")).toHaveTextContent(
        "これまでに作成したページ数は0ページです",
      );
    });

    expect(screen.queryByTestId("training-card")).not.toBeInTheDocument();
  });

  it("API呼び出しが正しいパラメータで実行されること", async () => {
    // Arrange
    const mockPagesResponse = {
      success: true,
      data: {
        training_pages: [],
      },
      message: "ページ一覧を取得しました",
    };

    mockGetPages.mockResolvedValue(mockPagesResponse);

    // Act
    render(<PersonalPagesPage />);

    // Assert
    await waitFor(() => {
      expect(mockGetPages).toHaveBeenCalledWith({
        userId: "test-user-id",
        limit: 100,
        offset: 0,
        query: "",
        tags: [],
        date: undefined,
      });
    });
  });

  it("100件を超えるページがある場合に複数回API呼び出しが実行されること", async () => {
    // Arrange
    const createMockPages = (startIndex: number, count: number) =>
      Array.from({ length: count }, (_, i) => ({
        page: {
          id: `page${startIndex + i}`,
          title: `稽古ページ${startIndex + i}`,
          content: "稽古内容",
          comment: "",
          user_id: "test-user-id",
          created_at: "2023-01-01T00:00:00.000Z",
          updated_at: "2023-01-01T00:00:00.000Z",
        },
        tags: [],
      }));

    const firstBatchResponse = {
      success: true,
      data: {
        training_pages: createMockPages(1, 100),
      },
      message: "ページ一覧を取得しました",
    };

    const secondBatchResponse = {
      success: true,
      data: {
        training_pages: createMockPages(101, 50),
      },
      message: "ページ一覧を取得しました",
    };

    mockGetPages
      .mockResolvedValueOnce(firstBatchResponse)
      .mockResolvedValueOnce(secondBatchResponse);

    // Act
    render(<PersonalPagesPage />);

    // Assert
    await waitFor(() => {
      expect(mockGetPages).toHaveBeenCalledTimes(2);
    });

    expect(mockGetPages).toHaveBeenNthCalledWith(1, {
      userId: "test-user-id",
      limit: 100,
      offset: 0,
      query: "",
      tags: [],
      date: undefined,
    });

    expect(mockGetPages).toHaveBeenNthCalledWith(2, {
      userId: "test-user-id",
      limit: 100,
      offset: 100,
      query: "",
      tags: [],
      date: undefined,
    });

    await waitFor(() => {
      expect(screen.getByTestId("page-stats")).toHaveTextContent(
        "これまでに作成したページ数は150ページです",
      );
    });
  });

  it("APIエラーが発生した場合に空の状態が表示されること", async () => {
    // Arrange
    mockGetPages.mockRejectedValue(new Error("API呼び出しエラー"));

    // Act
    render(<PersonalPagesPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId("page-stats")).toHaveTextContent(
        "これまでに作成したページ数は0ページです",
      );
    });
  });

  it("APIレスポンスが失敗の場合に空の状態が表示されること", async () => {
    // Arrange
    const mockFailureResponse = {
      success: false,
      error: "データの取得に失敗しました",
    };

    mockGetPages.mockResolvedValue(mockFailureResponse);

    // Act
    render(<PersonalPagesPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId("page-stats")).toHaveTextContent(
        "これまでに作成したページ数は0ページです",
      );
    });
  });

  it("ユーザーIDが存在しない場合にAPI呼び出しが実行されないこと", async () => {
    // Arrange
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: undefined,
        },
      },
      status: "authenticated",
    } as any);

    // Act
    render(<PersonalPagesPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId("page-stats")).toHaveTextContent(
        "これまでに作成したページ数は0ページです",
      );
    });

    expect(mockGetPages).not.toHaveBeenCalled();
  });

it("25件のページが表示される場合に正しく表示されること", async () => {
    // Arrange
    const createMockPages = (count: number) =>
      Array.from({ length: count }, (_, i) => ({
        page: {
          id: `page${i + 1}`,
          title: `稽古ページ${i + 1}`,
          content: "稽古内容",
          comment: "",
          user_id: "test-user-id",
          created_at: "2023-01-01T00:00:00.000Z",
          updated_at: "2023-01-01T00:00:00.000Z",
        },
        tags: [],
      }));

    const mockPagesResponse = {
      success: true,
      data: {
        training_pages: createMockPages(PAGE_LIMIT),
      },
      message: "ページ一覧を取得しました",
    };

    mockGetPages.mockResolvedValue(mockPagesResponse);

    // Act
    render(<PersonalPagesPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("稽古ページ1")).toBeInTheDocument();
    });

    expect(screen.getByText("稽古ページ25")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("page-stats")).toHaveTextContent(
        "これまでに作成したページ数は25ページです",
      );
      expect(screen.getByTestId("page-count")).toHaveTextContent("全25件表示中");
    });
  });

  it("25件を超えるページがある場合にもっと見るボタンが表示されること", async () => {
    // Arrange
    const createMockPages = (count: number) =>
      Array.from({ length: count }, (_, i) => ({
        page: {
          id: `page${i + 1}`,
          title: `稽古ページ${i + 1}`,
          content: "稽古内容",
          comment: "",
          user_id: "test-user-id",
          created_at: "2023-01-01T00:00:00.000Z",
          updated_at: "2023-01-01T00:00:00.000Z",
        },
        tags: [],
      }));

    const mockPagesResponse = {
      success: true,
      data: {
        training_pages: createMockPages(30),
      },
      message: "ページ一覧を取得しました",
    };

    mockGetPages.mockResolvedValue(mockPagesResponse);

    // Act
    render(<PersonalPagesPage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("稽古ページ1")).toBeInTheDocument();
    });

    expect(screen.getByText("稽古ページ25")).toBeInTheDocument();
    expect(screen.queryByText("稽古ページ26")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("page-stats")).toHaveTextContent(
        "これまでに作成したページ数は30ページです",
      );
      expect(screen.getByTestId("page-count")).toHaveTextContent(
        "全30件中 25件表示中",
      );
    });
    expect(screen.getByText("もっと見る")).toBeInTheDocument();
  });
});
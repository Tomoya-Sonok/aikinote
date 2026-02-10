import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deletePage, getPages, getTags } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { I18nTestProvider } from "@/test-utils/i18n-test-provider";
import { PersonalPagesPage } from "./PersonalPagesPage";

// モック設定
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

vi.mock("@/lib/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/lib/api/client", () => ({
  getPages: vi.fn(),
  getTags: vi.fn(),
  createPage: vi.fn(),
  updatePage: vi.fn(),
  deletePage: vi.fn(),
}));

vi.mock("@/lib/hooks/useDebounce", () => ({
  useDebounce: vi.fn((value) => value),
}));

vi.mock("@/lib/utils/dateUtils", () => ({
  formatToLocalDateString: vi.fn((_date) => "2023-01-01"),
}));

vi.mock("@/components/molecules/TabNavigation/TabNavigation", () => ({
  TabNavigation: () => <div data-testid="tab-navigation">TabNavigation</div>,
}));

vi.mock("@/components/molecules/FilterArea/FilterArea", () => ({
  FilterArea: () => <div data-testid="filter-area">FilterArea</div>,
}));

vi.mock("@/components/molecules/TrainingCard/TrainingCard", () => ({
  TrainingCard: ({
    title,
    onClick,
    onDelete,
  }: {
    title: string;
    onClick: () => void;
    onDelete?: () => void;
  }) => (
    <div>
      <button type="button" data-testid="training-card" onClick={onClick}>
        {title}
      </button>
      {onDelete && (
        <button
          type="button"
          data-testid={`delete-${title}`}
          onClick={onDelete}
        >
          削除
        </button>
      )}
    </div>
  ),
}));

vi.mock("@/components/atoms/FloatingActionButton/FloatingActionButton", () => ({
  FloatingActionButton: ({ onClick }: { onClick: () => void }) => (
    <button
      type="button"
      data-testid="floating-action-button"
      onClick={onClick}
    >
      +
    </button>
  ),
}));

vi.mock("@/components/organisms/PageCreateModal/PageCreateModal", () => ({
  PageCreateModal: () => (
    <div data-testid="page-create-modal">PageCreateModal</div>
  ),
}));

vi.mock("@/components/organisms/PageEditModal/PageEditModal", () => ({
  PageEditModal: () => <div data-testid="page-edit-modal">PageEditModal</div>,
}));

vi.mock("@/components/organisms/TagFilterModal/TagFilterModal", () => ({
  TagFilterModal: () => (
    <div data-testid="tag-filter-modal">TagFilterModal</div>
  ),
}));

// テスト用定数
const PAGE_LIMIT = 25;

describe("ページ一覧画面", () => {
  const mockUseRouter = vi.mocked(useRouter);
  const mockUseAuth = vi.mocked(useAuth);
  const mockGetPages = vi.mocked(getPages);
  const mockGetTags = vi.mocked(getTags);
  const mockDeletePage = vi.mocked(deletePage);

  const mockPush = vi.fn();
  const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

  beforeEach(() => {
    vi.clearAllMocks();
    alertSpy.mockClear();

    mockUseRouter.mockReturnValue({
      push: mockPush,
    });

    mockUseAuth.mockReturnValue({
      user: {
        id: "test-user-id",
        email: "test@example.com",
        username: "testuser",
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

    mockDeletePage.mockReset();
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
    await act(async () => {
      render(
        <I18nTestProvider>
          <PersonalPagesPage />
        </I18nTestProvider>,
      );
    });

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

  it("削除ボタン押下後に確認してページが削除されること", async () => {
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
              comment: "",
              user_id: "test-user-id",
              created_at: "2023-01-01T00:00:00.000Z",
              updated_at: "2023-01-01T00:00:00.000Z",
            },
            tags: [],
          },
        ],
      },
      message: "ページ一覧を取得しました",
    };

    mockGetPages.mockResolvedValue(mockPagesResponse);
    mockDeletePage.mockResolvedValue({
      success: true,
      message: "ページが正常に削除されました",
    });

    const user = userEvent.setup();

    await act(async () => {
      render(
        <I18nTestProvider>
          <PersonalPagesPage />
        </I18nTestProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getByText("稽古ページ1")).toBeInTheDocument();
    });

    // Act
    const deleteTrigger = screen.getByTestId("delete-稽古ページ1");
    await user.click(deleteTrigger);

    const dialog = await screen.findByRole("dialog");
    const confirmButton = within(dialog).getByRole("button", { name: "削除" });
    await user.click(confirmButton);

    // Assert
    await waitFor(() => {
      expect(mockDeletePage).toHaveBeenCalledWith("page1", "test-user-id");
    });

    await waitFor(() => {
      expect(screen.queryByText("稽古ページ1")).not.toBeInTheDocument();
    });
  });

  it("読み込み中の状態が表示されること", async () => {
    // Arrange
    mockGetPages.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000)),
    );

    // Act
    await act(async () => {
      render(
        <I18nTestProvider>
          <PersonalPagesPage />
        </I18nTestProvider>,
      );
    });

    // Assert
    expect(screen.getByText("読み込み中...")).toBeInTheDocument();
  });

  it("認証されていない場合にログインメッセージが表示されること", async () => {
    // Arrange
    mockUseAuth.mockReturnValue({
      user: null,
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

    // Act
    await act(async () => {
      render(
        <I18nTestProvider>
          <PersonalPagesPage />
        </I18nTestProvider>,
      );
    });

    // Assert
    expect(screen.getByText("ログインが必要です。")).toBeInTheDocument();
    expect(screen.getByText("ログインページへ")).toBeInTheDocument();
  });

  it("セッション読み込み中の状態が表示されること", async () => {
    // Arrange
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      isInitializing: false,
      isProcessing: true,
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

    // Act
    await act(async () => {
      render(
        <I18nTestProvider>
          <PersonalPagesPage />
        </I18nTestProvider>,
      );
    });

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
    await act(async () => {
      render(
        <I18nTestProvider>
          <PersonalPagesPage />
        </I18nTestProvider>,
      );
    });

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
    await act(async () => {
      render(
        <I18nTestProvider>
          <PersonalPagesPage />
        </I18nTestProvider>,
      );
    });

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
    await act(async () => {
      render(
        <I18nTestProvider>
          <PersonalPagesPage />
        </I18nTestProvider>,
      );
    });

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
    await act(async () => {
      render(
        <I18nTestProvider>
          <PersonalPagesPage />
        </I18nTestProvider>,
      );
    });

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
    await act(async () => {
      render(
        <I18nTestProvider>
          <PersonalPagesPage />
        </I18nTestProvider>,
      );
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId("page-stats")).toHaveTextContent(
        "これまでに作成したページ数は0ページです",
      );
    });
  });

  it("ユーザーIDが存在しない場合にAPI呼び出しが実行されないこと", async () => {
    // Arrange
    mockUseAuth.mockReturnValue({
      user: null,
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

    // Act
    await act(async () => {
      render(
        <I18nTestProvider>
          <PersonalPagesPage />
        </I18nTestProvider>,
      );
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByText("ログインが必要です。")).toBeInTheDocument();
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
    await act(async () => {
      render(
        <I18nTestProvider>
          <PersonalPagesPage />
        </I18nTestProvider>,
      );
    });

    // Assert
    await waitFor(() => {
      expect(screen.getByText("稽古ページ1")).toBeInTheDocument();
    });

    expect(screen.getByText("稽古ページ25")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId("page-stats")).toHaveTextContent(
        "これまでに作成したページ数は25ページです",
      );
      expect(screen.getByTestId("page-count")).toHaveTextContent(
        "全25件表示中",
      );
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
    await act(async () => {
      render(
        <I18nTestProvider>
          <PersonalPagesPage />
        </I18nTestProvider>,
      );
    });

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
        "全30件中25件表示中",
      );
    });
    expect(screen.getByText("もっと見る")).toBeInTheDocument();
  });
});

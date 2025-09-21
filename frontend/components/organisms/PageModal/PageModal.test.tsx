import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PageModal } from "./PageModal";
import { I18nTestProvider } from "../../../test-utils/i18n-test-provider";

// useAuth をモック
vi.mock("@/lib/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "test-user-123",
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
  }),
}));

// ToastContext をモック
vi.mock("@/contexts/ToastContext", () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

// API クライアントをモック
vi.mock("@/lib/api/client", () => ({
  getTags: vi.fn(),
  createTag: vi.fn(),
  initializeUserTags: vi.fn(),
}));

const _testInitialData = {
  id: "test-page-123",
  title: "テストページタイトル",
  tori: ["投げ"],
  uke: ["受け身"],
  waza: ["技名"],
  content: "テスト稽古内容",
  comment: "テストコメント",
};

describe("PageModal", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // 動的にモックを取得してセットアップ
    const { getTags } = await import("@/lib/api/client");
    vi.mocked(getTags).mockResolvedValue({
      success: true,
      data: [],
    });
  });

  it("モーダルが閉じている時はダイアログが表示されない", () => {
    // Arrange: モーダルが閉じられている状態でプロパティを準備する
    const mockOnClose = vi.fn();
    const mockOnSubmit = vi.fn();
    const isOpen = false;

    // Act: モーダルをレンダリングする
    render(
      <I18nTestProvider>
        <PageModal
          isOpen={isOpen}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          modalTitle="テストモーダル"
          actionButtonText="実行"
        />
      </I18nTestProvider>
    );

    // Assert: モーダルが表示されない
    expect(screen.queryByText("テストモーダル")).not.toBeInTheDocument();
  });

  it("モーダルが開いている時はカスタムタイトルが表示される", () => {
    // Arrange: モーダルが開いている状態でプロパティを準備する
    const mockOnClose = vi.fn();
    const mockOnSubmit = vi.fn();
    const isOpen = true;

    // Act: モーダルをレンダリングする
    render(
      <I18nTestProvider>
        <PageModal
          isOpen={isOpen}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          modalTitle="カスタムモーダルタイトル"
          actionButtonText="実行"
        />
      </I18nTestProvider>
    );

    // Assert: カスタムタイトルが表示される
    expect(screen.getByText("カスタムモーダルタイトル")).toBeInTheDocument();
  });

  it("カスタムアクションボタンテキストが表示される", () => {
    // Arrange: モーダルが開いている状態でプロパティを準備する
    const mockOnClose = vi.fn();
    const mockOnSubmit = vi.fn();
    const isOpen = true;

    // Act: モーダルをレンダリングする
    render(
      <I18nTestProvider>
        <PageModal
          isOpen={isOpen}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          modalTitle="テストモーダル"
          actionButtonText="カスタム実行"
        />
      </I18nTestProvider>
    );

    // Assert: カスタムアクションボタンテキストが表示される
    expect(screen.getByText("カスタム実行")).toBeInTheDocument();
  });

  it("キャンセルボタンをクリックするとonCloseが呼ばれる", async () => {
    // Arrange: モーダルが開いている状態でプロパティを準備する
    const user = userEvent.setup();
    const mockOnClose = vi.fn();
    const mockOnSubmit = vi.fn();
    const isOpen = true;

    render(
      <I18nTestProvider>
        <PageModal
          isOpen={isOpen}
          onClose={mockOnClose}
          onSubmit={mockOnSubmit}
          modalTitle="テストモーダル"
          actionButtonText="実行"
        />
      </I18nTestProvider>
    );

    const cancelButton = screen.getByText("キャンセル");

    // Act: キャンセルボタンをクリックする
    await user.click(cancelButton);

    // Assert: onCloseが呼ばれる
    expect(mockOnClose).toHaveBeenCalledOnce();
  });
});

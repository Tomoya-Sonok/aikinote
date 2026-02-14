import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PageEditModal } from "./PageEditModal";

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

// PageModalをモック
vi.mock("../PageModal/PageModal", () => ({
  PageModal: ({
    isOpen,
    modalTitle,
    actionButtonText,
    onSubmit,
    initialData,
  }: {
    isOpen: boolean;
    modalTitle: string;
    actionButtonText: string;
    onSubmit: (data: unknown) => void;
    initialData?: {
      id: string;
      title: string;
      tori?: string[];
      uke?: string[];
      waza?: string[];
      content?: string;
      comment?: string;
    };
  }) => {
    if (!isOpen) return null;
    return (
      <div>
        <h2>{modalTitle}</h2>
        <input defaultValue={initialData?.title} data-testid="title-input" />
        <button
          type="button"
          onClick={() =>
            onSubmit({
              id: initialData?.id ?? "",
              title: "更新されたタイトル",
              tori: initialData?.tori ?? [],
              uke: initialData?.uke ?? [],
              waza: initialData?.waza ?? [],
              content: initialData?.content ?? "",
              comment: initialData?.comment ?? "",
            })
          }
        >
          {actionButtonText}
        </button>
      </div>
    );
  },
}));

const testInitialData = {
  id: "test-page-123",
  title: "既存のページタイトル",
  tori: ["投げ"],
  uke: ["受け身"],
  waza: ["技名"],
  content: "既存の稽古内容",
  comment: "既存のコメント",
};

describe("PageEditModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("モーダルが閉じている時はページ編集ダイアログが表示されない", async () => {
    // Arrange: モーダルが閉じられている状態でプロパティを準備する
    const mockOnClose = vi.fn();
    const mockOnUpdate = vi.fn();
    const isOpen = false;

    // Act: モーダルをレンダリングする
    render(
      <PageEditModal
        isOpen={isOpen}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        initialData={testInitialData}
      />,
    );

    // Assert: モーダルが表示されない
    expect(screen.queryByText("ページ編集")).not.toBeInTheDocument();
  });

  it("モーダルが開いている時はページ編集ダイアログが表示される", async () => {
    // Arrange: モーダルが開いている状態でプロパティを準備する
    const mockOnClose = vi.fn();
    const mockOnUpdate = vi.fn();
    const isOpen = true;

    // Act: モーダルをレンダリングする
    render(
      <PageEditModal
        isOpen={isOpen}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        initialData={testInitialData}
      />,
    );

    // Assert: ページ編集モーダルが表示される
    expect(screen.getByText("ページ編集")).toBeInTheDocument();
  });

  it("初期データがフォームフィールドに正しく表示される", async () => {
    // Arrange: 初期データを含むプロパティを準備する
    const mockOnClose = vi.fn();
    const mockOnUpdate = vi.fn();
    const isOpen = true;

    // Act: モーダルをレンダリングする
    render(
      <PageEditModal
        isOpen={isOpen}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        initialData={testInitialData}
      />,
    );

    // Assert: 初期データがフィールドに表示される
    expect(
      screen.getByDisplayValue("既存のページタイトル"),
    ).toBeInTheDocument();
  });

  it("更新ボタンが表示される", async () => {
    // Arrange: モーダルが開いている状態でプロパティを準備する
    const mockOnClose = vi.fn();
    const mockOnUpdate = vi.fn();
    const isOpen = true;

    // Act: モーダルをレンダリングする
    render(
      <PageEditModal
        isOpen={isOpen}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        initialData={testInitialData}
      />,
    );

    // Assert: 更新ボタンが表示される
    expect(screen.getByText("更新")).toBeInTheDocument();
  });

  it("更新ボタンをクリックするとonUpdateが正しいデータで呼ばれる", async () => {
    // Arrange: モーダルが開いている状態でプロパティを準備する
    const user = userEvent.setup();
    const mockOnClose = vi.fn();
    const mockOnUpdate = vi.fn();
    const isOpen = true;

    render(
      <PageEditModal
        isOpen={isOpen}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
        initialData={testInitialData}
      />,
    );

    const updateButton = screen.getByText("更新");

    // Act: 更新ボタンをクリックする
    await user.click(updateButton);

    // Assert: onUpdateが正しいデータで呼ばれる
    expect(mockOnUpdate).toHaveBeenCalledWith({
      id: "test-page-123",
      title: "更新されたタイトル",
      tori: ["投げ"],
      uke: ["受け身"],
      waza: ["技名"],
      content: "既存の稽古内容",
      comment: "既存のコメント",
      user_id: "test-user-123",
    });
  });
});

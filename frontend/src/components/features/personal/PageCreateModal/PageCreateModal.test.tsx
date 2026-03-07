import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nTestProvider } from "@/test-utils/i18n-test-provider";
import { PageCreateModal } from "./PageCreateModal";

// PageModalをモック
vi.mock("../PageModal/PageModal", () => ({
  PageModal: ({
    isOpen,
    modalTitle,
    actionButtonText,
    titlePlaceholder,
    onSubmit,
  }: {
    isOpen: boolean;
    modalTitle: string;
    actionButtonText: string;
    titlePlaceholder: string;
    onSubmit: (data: {
      title: string;
      tori: string[];
      uke: string[];
      waza: string[];
      content: string;
      comment: string;
      attachments: never[];
    }) => void;
  }) => {
    if (!isOpen) return null;
    return (
      <div>
        <h2>{modalTitle}</h2>
        <p data-testid="title-placeholder">{titlePlaceholder}</p>
        <button
          type="button"
          onClick={() =>
            onSubmit({
              title: "テストタイトル",
              tori: [],
              uke: [],
              waza: [],
              content: "テスト内容",
              comment: "",
              attachments: [],
            })
          }
        >
          {actionButtonText}
        </button>
      </div>
    );
  },
}));

describe("PageCreateModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("モーダルが閉じている時はページ作成ダイアログが表示されない", async () => {
    // Arrange: モーダルが閉じられている状態でプロパティを準備する
    const mockOnClose = vi.fn();
    const mockOnSave = vi.fn();
    const isOpen = false;

    // Act: モーダルをレンダリングする
    render(
      <I18nTestProvider>
        <PageCreateModal
          isOpen={isOpen}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      </I18nTestProvider>,
    );

    // Assert: モーダルが表示されない
    expect(screen.queryByText("ページ作成")).not.toBeInTheDocument();
  });

  it("モーダルが開いている時はページ作成ダイアログが表示される", async () => {
    // Arrange: モーダルが開いている状態でプロパティを準備する
    const mockOnClose = vi.fn();
    const mockOnSave = vi.fn();
    const isOpen = true;

    // Act: モーダルをレンダリングする
    render(
      <I18nTestProvider>
        <PageCreateModal
          isOpen={isOpen}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      </I18nTestProvider>,
    );

    // Assert: ページ作成モーダルが表示される
    expect(screen.getByText("ページ作成")).toBeInTheDocument();
  });

  it("保存ボタンが表示される", async () => {
    // Arrange: モーダルが開いている状態でプロパティを準備する
    const mockOnClose = vi.fn();
    const mockOnSave = vi.fn();
    const isOpen = true;

    // Act: モーダルをレンダリングする
    render(
      <I18nTestProvider>
        <PageCreateModal
          isOpen={isOpen}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      </I18nTestProvider>,
    );

    // Assert: 保存ボタンが表示される
    expect(screen.getByText("保存")).toBeInTheDocument();
  });

  it("保存ボタンをクリックするとonSaveが正しいデータで呼ばれる", async () => {
    // Arrange: モーダルが開いている状態でプロパティを準備する
    const user = userEvent.setup();
    const mockOnClose = vi.fn();
    const mockOnSave = vi.fn();
    const isOpen = true;

    render(
      <I18nTestProvider>
        <PageCreateModal
          isOpen={isOpen}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      </I18nTestProvider>,
    );

    const saveButton = screen.getByText("保存");

    // Act: 保存ボタンをクリックする
    await user.click(saveButton);

    // Assert: onSaveが正しいデータで呼ばれる
    expect(mockOnSave).toHaveBeenCalledWith({
      title: "テストタイトル",
      tori: [],
      uke: [],
      waza: [],
      content: "テスト内容",
      comment: "",
      attachments: [],
    });
  });

  it("placeholderDateを渡すとtitle placeholderに選択日が表示される", async () => {
    // Arrange
    const mockOnClose = vi.fn();
    const mockOnSave = vi.fn();
    const placeholderDate = new Date(2026, 2, 13);

    // Act
    render(
      <I18nTestProvider>
        <PageCreateModal
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          placeholderDate={placeholderDate}
        />
      </I18nTestProvider>,
    );

    // Assert
    expect(screen.getByTestId("title-placeholder")).toHaveTextContent(
      "2026-03-13 稽古記録",
    );
  });
});

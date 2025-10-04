import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nTestProvider } from "../../../test-utils/i18n-test-provider";
import { TagFilterModal } from "./TagFilterModal";

// TagSelectionをモック
vi.mock("@/components/molecules/TagSelection/TagSelection", () => ({
  TagSelection: ({
    title,
    tags,
    selectedTags,
    onTagToggle,
  }: {
    title: string;
    tags: string[];
    selectedTags: string[];
    onTagToggle: (tagName: string) => void;
  }) => {
    return (
      <div>
        <h3>{title}</h3>
        {tags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onTagToggle(tag)}
            data-selected={selectedTags.includes(tag)}
          >
            {tag}
          </button>
        ))}
      </div>
    );
  },
}));

describe("TagFilterModal", () => {
  const mockTags = [
    { id: "1", name: "基本練習", category: "取り" },
    { id: "2", name: "応用練習", category: "取り" },
    { id: "3", name: "前受け身", category: "受け" },
    { id: "4", name: "後ろ受け身", category: "受け" },
    { id: "5", name: "四方投げ", category: "技" },
    { id: "6", name: "小手返し", category: "技" },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("モーダルが閉じている時はタグ絞り込みダイアログが表示されない", async () => {
    // Arrange: モーダルが閉じられている状態でプロパティを準備する
    const mockOnClose = vi.fn();
    const mockOnTagsConfirm = vi.fn();
    const isOpen = false;

    // Act: モーダルをレンダリングする
    render(
      <I18nTestProvider>
        <TagFilterModal
          isOpen={isOpen}
          onClose={mockOnClose}
          tags={mockTags}
          selectedTags={[]}
          onTagsConfirm={mockOnTagsConfirm}
          title="タグで絞り込み"
        />
      </I18nTestProvider>,
    );

    // Assert: モーダルが表示されない
    expect(screen.queryByText("タグで絞り込み")).not.toBeInTheDocument();
  });

  it("モーダルが開いている時はタグ絞り込みダイアログが表示される", async () => {
    // Arrange: モーダルが開いている状態でプロパティを準備する
    const mockOnClose = vi.fn();
    const mockOnTagsConfirm = vi.fn();
    const isOpen = true;

    // Act: モーダルをレンダリングする
    render(
      <I18nTestProvider>
        <TagFilterModal
          isOpen={isOpen}
          onClose={mockOnClose}
          tags={mockTags}
          selectedTags={[]}
          onTagsConfirm={mockOnTagsConfirm}
          title="タグで絞り込み"
        />
      </I18nTestProvider>,
    );

    // Assert: タグ絞り込みモーダルが表示される
    expect(screen.getByText("タグで絞り込み")).toBeInTheDocument();
  });

  it("閉じるボタンが表示される", async () => {
    // Arrange: モーダルが開いている状態でプロパティを準備する
    const mockOnClose = vi.fn();
    const mockOnTagsConfirm = vi.fn();
    const isOpen = true;

    // Act: モーダルをレンダリングする
    render(
      <I18nTestProvider>
        <TagFilterModal
          isOpen={isOpen}
          onClose={mockOnClose}
          tags={mockTags}
          selectedTags={[]}
          onTagsConfirm={mockOnTagsConfirm}
          title="タグで絞り込み"
        />
      </I18nTestProvider>,
    );

    // Assert: 閉じるボタンが表示される
    expect(screen.getByLabelText("閉じる")).toBeInTheDocument();
  });

  it("キャンセルボタンが表示される", async () => {
    // Arrange: モーダルが開いている状態でプロパティを準備する
    const mockOnClose = vi.fn();
    const mockOnTagsConfirm = vi.fn();
    const isOpen = true;

    // Act: モーダルをレンダリングする
    render(
      <I18nTestProvider>
        <TagFilterModal
          isOpen={isOpen}
          onClose={mockOnClose}
          tags={mockTags}
          selectedTags={[]}
          onTagsConfirm={mockOnTagsConfirm}
          title="タグで絞り込み"
        />
      </I18nTestProvider>,
    );

    // Assert: キャンセルボタンが表示される
    expect(screen.getByText("キャンセル")).toBeInTheDocument();
  });

  it("絞り込みボタンが表示される", async () => {
    // Arrange: モーダルが開いている状態でプロパティを準備する
    const mockOnClose = vi.fn();
    const mockOnTagsConfirm = vi.fn();
    const isOpen = true;

    // Act: モーダルをレンダリングする
    render(
      <I18nTestProvider>
        <TagFilterModal
          isOpen={isOpen}
          onClose={mockOnClose}
          tags={mockTags}
          selectedTags={[]}
          onTagsConfirm={mockOnTagsConfirm}
          title="タグで絞り込み"
        />
      </I18nTestProvider>,
    );

    // Assert: 絞り込みボタンが表示される
    expect(screen.getByText("絞り込み")).toBeInTheDocument();
  });

  it("タグセクションが表示される", async () => {
    // Arrange: モーダルが開いている状態でプロパティを準備する
    const mockOnClose = vi.fn();
    const mockOnTagsConfirm = vi.fn();
    const isOpen = true;

    // Act: モーダルをレンダリングする
    render(
      <I18nTestProvider>
        <TagFilterModal
          isOpen={isOpen}
          onClose={mockOnClose}
          tags={mockTags}
          selectedTags={[]}
          onTagsConfirm={mockOnTagsConfirm}
          title="タグで絞り込み"
        />
      </I18nTestProvider>,
    );

    // Assert: 取りタグセクションが表示される
    expect(screen.getByText("取り")).toBeInTheDocument();

    // Assert: 受けタグセクションが表示される
    expect(screen.getByText("受け")).toBeInTheDocument();

    // Assert: 技タグセクションが表示される
    expect(screen.getByText("技")).toBeInTheDocument();
  });

  it("閉じるボタンをクリックするとonCloseが呼び出される", async () => {
    // Arrange: モーダルが開いている状態でプロパティを準備する
    const user = userEvent.setup();
    const mockOnClose = vi.fn();
    const mockOnTagsConfirm = vi.fn();
    const isOpen = true;

    // Act: モーダルをレンダリングして閉じるボタンをクリックする
    render(
      <I18nTestProvider>
        <TagFilterModal
          isOpen={isOpen}
          onClose={mockOnClose}
          tags={mockTags}
          selectedTags={[]}
          onTagsConfirm={mockOnTagsConfirm}
          title="タグで絞り込み"
        />
      </I18nTestProvider>,
    );

    const closeButton = screen.getByLabelText("閉じる");
    await user.click(closeButton);

    // Assert: onCloseが呼び出される
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("キャンセルボタンをクリックするとonCloseが呼び出される", async () => {
    // Arrange: モーダルが開いている状態でプロパティを準備する
    const user = userEvent.setup();
    const mockOnClose = vi.fn();
    const mockOnTagsConfirm = vi.fn();
    const isOpen = true;

    // Act: モーダルをレンダリングしてキャンセルボタンをクリックする
    render(
      <I18nTestProvider>
        <TagFilterModal
          isOpen={isOpen}
          onClose={mockOnClose}
          tags={mockTags}
          selectedTags={[]}
          onTagsConfirm={mockOnTagsConfirm}
          title="タグで絞り込み"
        />
      </I18nTestProvider>,
    );

    const cancelButton = screen.getByText("キャンセル");
    await user.click(cancelButton);

    // Assert: onCloseが呼び出される
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("絞り込みボタンをクリックするとonTagsConfirmとonCloseが呼び出される", async () => {
    // Arrange: モーダルが開いている状態でプロパティを準備する
    const user = userEvent.setup();
    const mockOnClose = vi.fn();
    const mockOnTagsConfirm = vi.fn();
    const selectedTags = ["基本練習"];
    const isOpen = true;

    // Act: モーダルをレンダリングして絞り込みボタンをクリックする
    render(
      <I18nTestProvider>
        <TagFilterModal
          isOpen={isOpen}
          onClose={mockOnClose}
          tags={mockTags}
          selectedTags={selectedTags}
          onTagsConfirm={mockOnTagsConfirm}
          title="タグで絞り込み"
        />
      </I18nTestProvider>,
    );

    const confirmButton = screen.getByText("絞り込み");
    await user.click(confirmButton);

    // Assert: onTagsConfirmが選択されたタグとともに呼び出される
    expect(mockOnTagsConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnTagsConfirm).toHaveBeenCalledWith(selectedTags);

    // Assert: onCloseが呼び出される
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("選択済みタグがある場合は該当タグが選択状態で表示される", async () => {
    // Arrange: 基本練習タグが選択された状態でプロパティを準備する
    const mockOnClose = vi.fn();
    const mockOnTagsConfirm = vi.fn();
    const selectedTags = ["基本練習"];
    const isOpen = true;

    // Act: モーダルをレンダリングする
    render(
      <I18nTestProvider>
        <TagFilterModal
          isOpen={isOpen}
          onClose={mockOnClose}
          tags={mockTags}
          selectedTags={selectedTags}
          onTagsConfirm={mockOnTagsConfirm}
          title="タグで絞り込み"
        />
      </I18nTestProvider>,
    );

    // Assert: 選択されたタグが選択状態で表示される
    const tagButton = screen.getByRole("button", { name: "基本練習" });
    expect(tagButton).toHaveAttribute("data-selected", "true");
  });

  it("カスタムタイトルが正しく表示される", async () => {
    // Arrange: カスタムタイトルを設定してプロパティを準備する
    const mockOnClose = vi.fn();
    const mockOnTagsConfirm = vi.fn();
    const customTitle = "練習内容で絞り込み";
    const isOpen = true;

    // Act: モーダルをレンダリングする
    render(
      <I18nTestProvider>
        <TagFilterModal
          isOpen={isOpen}
          onClose={mockOnClose}
          tags={mockTags}
          selectedTags={[]}
          onTagsConfirm={mockOnTagsConfirm}
          title={customTitle}
        />
      </I18nTestProvider>,
    );

    // Assert: カスタムタイトルが表示される
    expect(screen.getByText(customTitle)).toBeInTheDocument();
  });

  it("タグが空の場合でもモーダルが正常に表示される", async () => {
    // Arrange: タグが空の状態でプロパティを準備する
    const mockOnClose = vi.fn();
    const mockOnTagsConfirm = vi.fn();
    const emptyTags: never[] = [];
    const isOpen = true;

    // Act: モーダルをレンダリングする
    render(
      <I18nTestProvider>
        <TagFilterModal
          isOpen={isOpen}
          onClose={mockOnClose}
          tags={emptyTags}
          selectedTags={[]}
          onTagsConfirm={mockOnTagsConfirm}
          title="タグで絞り込み"
        />
      </I18nTestProvider>,
    );

    // Assert: モーダルが表示される
    expect(screen.getByText("タグで絞り込み")).toBeInTheDocument();

    // Assert: セクションヘッダーが表示される
    expect(screen.getByText("取り")).toBeInTheDocument();
    expect(screen.getByText("受け")).toBeInTheDocument();
    expect(screen.getByText("技")).toBeInTheDocument();
  });

  it("複数のタグが選択された場合は全て選択状態で表示される", async () => {
    // Arrange: 複数のタグが選択された状態でプロパティを準備する
    const mockOnClose = vi.fn();
    const mockOnTagsConfirm = vi.fn();
    const selectedTags = ["基本練習", "前受け身", "四方投げ"];
    const isOpen = true;

    // Act: モーダルをレンダリングする
    render(
      <I18nTestProvider>
        <TagFilterModal
          isOpen={isOpen}
          onClose={mockOnClose}
          tags={mockTags}
          selectedTags={selectedTags}
          onTagsConfirm={mockOnTagsConfirm}
          title="タグで絞り込み"
        />
      </I18nTestProvider>,
    );

    // Assert: 選択された全てのタグが選択状態で表示される
    const basicTag = screen.getByRole("button", { name: "基本練習" });
    expect(basicTag).toHaveAttribute("data-selected", "true");

    const ukemiTag = screen.getByRole("button", { name: "前受け身" });
    expect(ukemiTag).toHaveAttribute("data-selected", "true");

    const techniqueTag = screen.getByRole("button", { name: "四方投げ" });
    expect(techniqueTag).toHaveAttribute("data-selected", "true");
  });
});

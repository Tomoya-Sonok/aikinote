import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nTestProvider } from "../../../test-utils/i18n-test-provider";
import { FilterArea } from "./FilterArea";

describe("FilterArea", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("コンポーネントを初期化すると検索入力フィールドが表示される", () => {
    // Arrange: プロパティを準備する
    const props = {
      onSearchChange: vi.fn(),
      onDateFilterChange: vi.fn(),
      onTagFilterChange: vi.fn(),
      currentSearchQuery: "",
      currentSelectedDate: null,
      currentSelectedTags: [],
      onOpenTagSelection: vi.fn(),
      onOpenDateSelection: vi.fn(),
    };

    // Act: コンポーネントをレンダリングする
    render(
      <I18nTestProvider>
        <FilterArea {...props} />
      </I18nTestProvider>,
    );

    // Assert: 検索入力フィールドが表示される
    expect(
      screen.getByPlaceholderText("フリーワードで絞り込む"),
    ).toBeInTheDocument();
  });

  it("コンポーネントを初期化するとタグフィルターが表示される", () => {
    // Arrange: プロパティを準備する
    const props = {
      onSearchChange: vi.fn(),
      onDateFilterChange: vi.fn(),
      onTagFilterChange: vi.fn(),
      currentSearchQuery: "",
      currentSelectedDate: null,
      currentSelectedTags: [],
      onOpenTagSelection: vi.fn(),
      onOpenDateSelection: vi.fn(),
    };

    // Act: コンポーネントをレンダリングする
    render(
      <I18nTestProvider>
        <FilterArea {...props} />
      </I18nTestProvider>,
    );

    // Assert: タグフィルターが表示される
    expect(screen.getByText("タグ")).toBeInTheDocument();
  });

  it("コンポーネントを初期化すると日付フィルターが表示される", () => {
    // Arrange: プロパティを準備する
    const props = {
      onSearchChange: vi.fn(),
      onDateFilterChange: vi.fn(),
      onTagFilterChange: vi.fn(),
      currentSearchQuery: "",
      currentSelectedDate: null,
      currentSelectedTags: [],
      onOpenTagSelection: vi.fn(),
      onOpenDateSelection: vi.fn(),
    };

    // Act: コンポーネントをレンダリングする
    render(
      <I18nTestProvider>
        <FilterArea {...props} />
      </I18nTestProvider>,
    );

    // Assert: 日付フィルターが表示される
    expect(screen.getByText("日付")).toBeInTheDocument();
  });

  it("タグが選択されていない場合にタグフィルターで指定なしと表示される", () => {
    // Arrange: タグが選択されていないプロパティを準備する
    const props = {
      onSearchChange: vi.fn(),
      onDateFilterChange: vi.fn(),
      onTagFilterChange: vi.fn(),
      currentSearchQuery: "",
      currentSelectedDate: null,
      currentSelectedTags: [],
      onOpenTagSelection: vi.fn(),
      onOpenDateSelection: vi.fn(),
    };

    // Act: コンポーネントをレンダリングする
    render(
      <I18nTestProvider>
        <FilterArea {...props} />
      </I18nTestProvider>,
    );

    // Assert: タグフィルターに「指定なし」が表示される
    const tagFilterElements = screen.getAllByText("指定なし");
    expect(tagFilterElements.length).toBeGreaterThan(0);
  });

  it("タグが選択されている場合に選択されたタグ名が表示される", () => {
    // Arrange: 選択されたタグがあるプロパティを準備する
    const selectedTags = ["React", "TypeScript"];
    const props = {
      onSearchChange: vi.fn(),
      onDateFilterChange: vi.fn(),
      onTagFilterChange: vi.fn(),
      currentSearchQuery: "",
      currentSelectedDate: null,
      currentSelectedTags: selectedTags,
      onOpenTagSelection: vi.fn(),
      onOpenDateSelection: vi.fn(),
    };

    // Act: コンポーネントをレンダリングする
    render(
      <I18nTestProvider>
        <FilterArea {...props} />
      </I18nTestProvider>,
    );

    // Assert: 選択されたタグがカンマ区切りで表示される
    expect(screen.getByText("React, TypeScript")).toBeInTheDocument();
  });

  it("日付が選択されている場合に選択された日付が表示される", () => {
    // Arrange: 選択された日付があるプロパティを準備する
    const selectedDate = "2024-01-15";
    const props = {
      onSearchChange: vi.fn(),
      onDateFilterChange: vi.fn(),
      onTagFilterChange: vi.fn(),
      currentSearchQuery: "",
      currentSelectedDate: selectedDate,
      currentSelectedTags: [],
      onOpenTagSelection: vi.fn(),
      onOpenDateSelection: vi.fn(),
    };

    // Act: コンポーネントをレンダリングする
    render(
      <I18nTestProvider>
        <FilterArea {...props} />
      </I18nTestProvider>,
    );

    // Assert: 選択された日付が表示される
    expect(screen.getByText("2024-01-15")).toBeInTheDocument();
  });

  it("現在の検索クエリがプロパティで渡されると検索フィールドに表示される", () => {
    // Arrange: 検索クエリがあるプロパティを準備する
    const currentQuery = "React Hooks";
    const props = {
      onSearchChange: vi.fn(),
      onDateFilterChange: vi.fn(),
      onTagFilterChange: vi.fn(),
      currentSearchQuery: currentQuery,
      currentSelectedDate: null,
      currentSelectedTags: [],
      onOpenTagSelection: vi.fn(),
      onOpenDateSelection: vi.fn(),
    };

    // Act: コンポーネントをレンダリングする
    render(
      <I18nTestProvider>
        <FilterArea {...props} />
      </I18nTestProvider>,
    );
    const searchInput = screen.getByPlaceholderText("フリーワードで絞り込む");

    // Assert: 現在の検索クエリが表示される
    expect(searchInput).toHaveValue("React Hooks");
  });

  it("検索入力フィールドは親から渡された現在の検索クエリを表示する", () => {
    // Arrange: 現在の検索クエリを含むプロパティを準備する
    const props = {
      onSearchChange: vi.fn(),
      onDateFilterChange: vi.fn(),
      onTagFilterChange: vi.fn(),
      currentSearchQuery: "検索テスト",
      currentSelectedDate: null,
      currentSelectedTags: [],
      onOpenTagSelection: vi.fn(),
      onOpenDateSelection: vi.fn(),
    };

    // Act: コンポーネントをレンダリングする
    render(
      <I18nTestProvider>
        <FilterArea {...props} />
      </I18nTestProvider>,
    );
    const searchInput = screen.getByPlaceholderText("フリーワードで絞り込む");

    // Assert: 親から渡された検索クエリが表示される
    expect(searchInput).toHaveValue("検索テスト");
  });

  it("検索入力フィールドに1文字入力するとonSearchChangeが1回呼ばれる", async () => {
    // Arrange: ユーザーイベントとモック関数を準備する
    const user = userEvent.setup();
    const mockOnSearchChange = vi.fn();
    const props = {
      onSearchChange: mockOnSearchChange,
      onDateFilterChange: vi.fn(),
      onTagFilterChange: vi.fn(),
      currentSearchQuery: "",
      currentSelectedDate: null,
      currentSelectedTags: [],
      onOpenTagSelection: vi.fn(),
      onOpenDateSelection: vi.fn(),
    };
    render(
      <I18nTestProvider>
        <FilterArea {...props} />
      </I18nTestProvider>,
    );
    const searchInput = screen.getByPlaceholderText("フリーワードで絞り込む");

    // Act: 1文字入力する
    await user.type(searchInput, "a");

    // Assert: onSearchChangeが「a」で呼ばれる
    expect(mockOnSearchChange).toHaveBeenCalledWith("a");
  });

  it("検索入力フィールドに4文字入力するとonSearchChangeが4回呼ばれる", async () => {
    // Arrange: ユーザーイベントとモック関数を準備する
    const user = userEvent.setup();
    const mockOnSearchChange = vi.fn();
    const props = {
      onSearchChange: mockOnSearchChange,
      onDateFilterChange: vi.fn(),
      onTagFilterChange: vi.fn(),
      currentSearchQuery: "",
      currentSelectedDate: null,
      currentSelectedTags: [],
      onOpenTagSelection: vi.fn(),
      onOpenDateSelection: vi.fn(),
    };
    render(
      <I18nTestProvider>
        <FilterArea {...props} />
      </I18nTestProvider>,
    );
    const searchInput = screen.getByPlaceholderText("フリーワードで絞り込む");

    // Act: 4文字入力する
    await user.type(searchInput, "test");

    // Assert: onSearchChangeが4回呼ばれる
    expect(mockOnSearchChange).toHaveBeenCalledTimes(4);
  });

  it("検索入力フィールドに文字を順次入力すると各文字でonSearchChangeが呼ばれる", async () => {
    // Arrange: ユーザーイベントとモック関数を準備する
    const user = userEvent.setup();
    const mockOnSearchChange = vi.fn();
    const props = {
      onSearchChange: mockOnSearchChange,
      onDateFilterChange: vi.fn(),
      onTagFilterChange: vi.fn(),
      currentSearchQuery: "",
      currentSelectedDate: null,
      currentSelectedTags: [],
      onOpenTagSelection: vi.fn(),
      onOpenDateSelection: vi.fn(),
    };
    render(
      <I18nTestProvider>
        <FilterArea {...props} />
      </I18nTestProvider>,
    );
    const searchInput = screen.getByPlaceholderText("フリーワードで絞り込む");

    // Act: 1文字目を入力する
    await user.type(searchInput, "t");

    // Assert: 1文字目でonSearchChangeが呼ばれる
    expect(mockOnSearchChange).toHaveBeenCalledWith("t");
  });

  it("検索入力フィールドの文字を全削除するとonSearchChangeが空文字で呼ばれる", async () => {
    // Arrange: 既に文字が入力されている状態でプロパティを準備する
    const user = userEvent.setup();
    const mockOnSearchChange = vi.fn();
    const props = {
      onSearchChange: mockOnSearchChange,
      onDateFilterChange: vi.fn(),
      onTagFilterChange: vi.fn(),
      currentSearchQuery: "test",
      currentSelectedDate: null,
      currentSelectedTags: [],
      onOpenTagSelection: vi.fn(),
      onOpenDateSelection: vi.fn(),
    };
    render(
      <I18nTestProvider>
        <FilterArea {...props} />
      </I18nTestProvider>,
    );
    const searchInput = screen.getByPlaceholderText("フリーワードで絞り込む");

    // Act: 全文字を削除する
    await user.clear(searchInput);

    // Assert: onSearchChangeが空文字で呼ばれる
    expect(mockOnSearchChange).toHaveBeenCalledWith("");
  });

  it("検索入力フィールドにonChangeイベントで直接値を設定するとonSearchChangeが呼ばれる", () => {
    // Arrange: モック関数とプロパティを準備する
    const mockOnSearchChange = vi.fn();
    const props = {
      onSearchChange: mockOnSearchChange,
      onDateFilterChange: vi.fn(),
      onTagFilterChange: vi.fn(),
      currentSearchQuery: "",
      currentSelectedDate: null,
      currentSelectedTags: [],
      onOpenTagSelection: vi.fn(),
      onOpenDateSelection: vi.fn(),
    };
    render(
      <I18nTestProvider>
        <FilterArea {...props} />
      </I18nTestProvider>,
    );
    const searchInput = screen.getByPlaceholderText("フリーワードで絞り込む");

    // Act: onChangeイベントで直接値を設定する
    fireEvent.change(searchInput, { target: { value: "直接入力テスト" } });

    // Assert: onSearchChangeが指定した値で呼ばれる
    expect(mockOnSearchChange).toHaveBeenCalledWith("直接入力テスト");
  });

  it("currentSearchQueryプロパティで渡された値が入力フィールドに表示される", () => {
    // Arrange: 検索クエリが設定されたプロパティを準備する
    const props = {
      onSearchChange: vi.fn(),
      onDateFilterChange: vi.fn(),
      onTagFilterChange: vi.fn(),
      currentSearchQuery: "直接入力テスト",
      currentSelectedDate: null,
      currentSelectedTags: [],
      onOpenTagSelection: vi.fn(),
      onOpenDateSelection: vi.fn(),
    };

    // Act: コンポーネントをレンダリングする
    render(
      <I18nTestProvider>
        <FilterArea {...props} />
      </I18nTestProvider>,
    );
    const searchInput = screen.getByPlaceholderText("フリーワードで絞り込む");

    // Assert: プロパティで渡された値が表示される
    expect(searchInput).toHaveValue("直接入力テスト");
  });

  it("タグフィルターをクリックするとonOpenTagSelectionが呼ばれる", async () => {
    // Arrange: ユーザーイベントとモック関数を準備する
    const user = userEvent.setup();
    const mockOnOpenTagSelection = vi.fn();
    const props = {
      onSearchChange: vi.fn(),
      onDateFilterChange: vi.fn(),
      onTagFilterChange: vi.fn(),
      currentSelectedDate: null,
      currentSelectedTags: [],
      onOpenTagSelection: mockOnOpenTagSelection,
      onOpenDateSelection: vi.fn(),
    };
    render(
      <I18nTestProvider>
        <FilterArea {...props} />
      </I18nTestProvider>,
    );
    const tagFilter = screen.getByText("タグ").closest("button");

    // Act: タグフィルターをクリックする
    if (tagFilter) {
      await user.click(tagFilter);
    }

    // Assert: onOpenTagSelectionが呼ばれる
    expect(mockOnOpenTagSelection).toHaveBeenCalledTimes(1);
  });

  it("日付フィルターをクリックするとonOpenDateSelectionが呼ばれる", async () => {
    // Arrange: ユーザーイベントとモック関数を準備する
    const user = userEvent.setup();
    const mockOnOpenDateSelection = vi.fn();
    const props = {
      onSearchChange: vi.fn(),
      onDateFilterChange: vi.fn(),
      onTagFilterChange: vi.fn(),
      currentSelectedDate: null,
      currentSelectedTags: [],
      onOpenTagSelection: vi.fn(),
      onOpenDateSelection: mockOnOpenDateSelection,
    };
    render(
      <I18nTestProvider>
        <FilterArea {...props} />
      </I18nTestProvider>,
    );
    const dateFilter = screen.getByText("日付").closest("button");

    // Act: 日付フィルターをクリックする
    if (dateFilter) {
      await user.click(dateFilter);
    }

    // Assert: onOpenDateSelectionが呼ばれる
    expect(mockOnOpenDateSelection).toHaveBeenCalledTimes(1);
  });

  it("タグフィルターボタンはクリック可能な状態である", () => {
    // Arrange: プロパティを準備する
    const props = {
      onSearchChange: vi.fn(),
      onDateFilterChange: vi.fn(),
      onTagFilterChange: vi.fn(),
      currentSearchQuery: "",
      currentSelectedDate: null,
      currentSelectedTags: [],
      onOpenTagSelection: vi.fn(),
      onOpenDateSelection: vi.fn(),
    };
    render(
      <I18nTestProvider>
        <FilterArea {...props} />
      </I18nTestProvider>,
    );

    // Act: タグフィルターボタンを取得する
    const tagButton = screen.getByText("タグ").closest("button");

    // Assert: ボタンが無効化されていない
    expect(tagButton).not.toBeDisabled();
  });

  it("日付フィルターボタンはクリック可能な状態である", () => {
    // Arrange: プロパティを準備する
    const props = {
      onSearchChange: vi.fn(),
      onDateFilterChange: vi.fn(),
      onTagFilterChange: vi.fn(),
      currentSearchQuery: "",
      currentSelectedDate: null,
      currentSelectedTags: [],
      onOpenTagSelection: vi.fn(),
      onOpenDateSelection: vi.fn(),
    };
    render(
      <I18nTestProvider>
        <FilterArea {...props} />
      </I18nTestProvider>,
    );

    // Act: 日付フィルターボタンを取得する
    const dateButton = screen.getByText("日付").closest("button");

    // Assert: ボタンが無効化されていない
    expect(dateButton).not.toBeDisabled();
  });
});

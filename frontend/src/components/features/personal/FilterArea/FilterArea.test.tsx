import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { I18nTestProvider } from "@/test-utils/i18n-test-provider";
import { FilterArea } from "./FilterArea";

vi.mock("../DatePickerModal", () => ({
  DatePickerModal: ({
    isOpen,
    onDateSelect,
  }: {
    isOpen: boolean;
    onDateSelect: (range: {
      startDate: Date | null;
      endDate: Date | null;
    }) => void;
  }) =>
    isOpen ? (
      <button
        type="button"
        onClick={() =>
          onDateSelect({
            startDate: new Date("2024-01-02T00:00:00"),
            endDate: new Date("2024-01-06T00:00:00"),
          })
        }
      >
        Mock Date Picker
      </button>
    ) : null,
}));

describe("FilterArea", () => {
  const baseProps = {
    onSearchChange: vi.fn(),
    onDateFilterChange: vi.fn(),
    onTagFilterChange: vi.fn(),
    currentSearchQuery: "",
    currentSelectedDateRange: { startDate: null, endDate: null },
    currentSelectedTags: [],
    onOpenTagSelection: vi.fn(),
    onOpenDateSelection: vi.fn(),
    userId: "user-1",
  };

  it("日付範囲が指定されている場合に「開始日 ～ 終了日」形式で表示される", () => {
    // Arrange
    const props = {
      ...baseProps,
      currentSelectedDateRange: {
        startDate: "2024-01-01",
        endDate: "2024-01-05",
      },
    };

    // Act
    render(
      <I18nTestProvider>
        <FilterArea {...props} />
      </I18nTestProvider>,
    );

    // Assert
    expect(screen.getByText("2024-01-01 ～ 2024-01-05")).toBeInTheDocument();
  });

  it("日付モーダルで範囲を選択するとonDateFilterChangeがYYYY-MM-DD形式の範囲で呼ばれる", async () => {
    // Arrange
    const onDateFilterChange = vi.fn();

    // Act
    render(
      <I18nTestProvider>
        <FilterArea {...baseProps} onDateFilterChange={onDateFilterChange} />
      </I18nTestProvider>,
    );

    await userEvent.click(screen.getByText("日付"));
    await userEvent.click(screen.getByText("Mock Date Picker"));

    // Assert
    expect(onDateFilterChange).toHaveBeenCalledWith({
      startDate: "2024-01-02",
      endDate: "2024-01-06",
    });
  });

  it("クリアボタンをタップすると検索クエリ・日付範囲・タグが全てリセットされる", () => {
    // Arrange
    const onSearchChange = vi.fn();
    const onDateFilterChange = vi.fn();
    const onTagFilterChange = vi.fn();

    // Act
    render(
      <I18nTestProvider>
        <FilterArea
          {...baseProps}
          currentSearchQuery="test"
          currentSelectedDateRange={{
            startDate: "2024-01-01",
            endDate: "2024-01-02",
          }}
          currentSelectedTags={["React"]}
          onSearchChange={onSearchChange}
          onDateFilterChange={onDateFilterChange}
          onTagFilterChange={onTagFilterChange}
        />
      </I18nTestProvider>,
    );

    const clearButton = screen.getByLabelText("絞り込みをクリア");
    fireEvent.pointerDown(clearButton);
    fireEvent.pointerUp(clearButton);

    // Assert
    expect(onSearchChange).toHaveBeenCalledWith("");
    expect(onDateFilterChange).toHaveBeenCalledWith({
      startDate: null,
      endDate: null,
    });
    expect(onTagFilterChange).toHaveBeenCalledWith([]);
  });
});

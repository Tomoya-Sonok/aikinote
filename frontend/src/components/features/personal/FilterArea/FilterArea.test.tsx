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

  it("renders filters and shows default date text", () => {
    render(
      <I18nTestProvider>
        <FilterArea {...baseProps} />
      </I18nTestProvider>,
    );

    expect(
      screen.getByPlaceholderText("フリーワードで絞り込む"),
    ).toBeInTheDocument();
    expect(screen.getByText("タグ")).toBeInTheDocument();
    expect(screen.getByText("日付")).toBeInTheDocument();
    expect(screen.getAllByText("指定なし")).toHaveLength(2);
  });

  it("displays date range text when provided", () => {
    render(
      <I18nTestProvider>
        <FilterArea
          {...baseProps}
          currentSelectedDateRange={{
            startDate: "2024-01-01",
            endDate: "2024-01-05",
          }}
        />
      </I18nTestProvider>,
    );

    expect(screen.getByText("2024-01-01 ～ 2024-01-05")).toBeInTheDocument();
  });

  it("invokes onDateFilterChange when range selection fired from modal", async () => {
    const onDateFilterChange = vi.fn();
    render(
      <I18nTestProvider>
        <FilterArea {...baseProps} onDateFilterChange={onDateFilterChange} />
      </I18nTestProvider>,
    );

    await userEvent.click(screen.getByText("日付"));
    await userEvent.click(screen.getByText("Mock Date Picker"));

    expect(onDateFilterChange).toHaveBeenCalledWith({
      startDate: "2024-01-02",
      endDate: "2024-01-06",
    });
  });

  it("clears filters when clear button is clicked", () => {
    const onSearchChange = vi.fn();
    const onDateFilterChange = vi.fn();
    const onTagFilterChange = vi.fn();

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

    expect(onSearchChange).toHaveBeenCalledWith("");
    expect(onDateFilterChange).toHaveBeenCalledWith({
      startDate: null,
      endDate: null,
    });
    expect(onTagFilterChange).toHaveBeenCalledWith([]);
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTrainingDatesMonth } from "@/lib/api/client";
import { I18nTestProvider } from "@/test-utils/i18n-test-provider";
import { DatePickerModal, DateRangeSelection } from "./DatePickerModal";

vi.mock("@/lib/api/client", () => ({
  getTrainingDatesMonth: vi.fn(),
}));

describe("DatePickerModal", () => {
  const mockGetTrainingDatesMonth = vi.mocked(getTrainingDatesMonth);
  const mockOnClose = vi.fn();
  const mockOnDateSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTrainingDatesMonth.mockResolvedValue({
      success: true,
      data: {
        training_dates: [],
        page_counts: [],
      },
    });
  });

  it("isOpen=trueの場合にタイトルと開始日・終了日入力欄が描画される", () => {
    // Arrange
    const isOpen = true;

    // Act
    render(
      <I18nTestProvider>
        <DatePickerModal
          isOpen={isOpen}
          onClose={mockOnClose}
          onDateSelect={mockOnDateSelect}
        />
      </I18nTestProvider>,
    );

    // Assert
    expect(screen.getByText("日付で絞り込み")).toBeInTheDocument();
    expect(screen.getByLabelText("開始日")).toBeInTheDocument();
    expect(screen.getByLabelText("終了日")).toBeInTheDocument();
  });

  it("selectedRangeを渡すと開始日・終了日に初期値がセットされる", () => {
    // Arrange
    const selectedRange: DateRangeSelection = {
      startDate: new Date(2024, 0, 5),
      endDate: new Date(2024, 0, 12),
    };

    // Act
    render(
      <I18nTestProvider>
        <DatePickerModal
          isOpen={true}
          selectedRange={selectedRange}
          onClose={mockOnClose}
          onDateSelect={mockOnDateSelect}
        />
      </I18nTestProvider>,
    );

    // Assert
    expect(screen.getByLabelText("開始日")).toHaveValue("2024-01-05");
    expect(screen.getByLabelText("終了日")).toHaveValue("2024-01-12");
  });

  it("絞り込みボタンをクリックするとonDateSelectが入力した日付範囲で呼ばれる", async () => {
    // Arrange
    const user = userEvent.setup();

    // Act
    render(
      <I18nTestProvider>
        <DatePickerModal
          isOpen={true}
          onClose={mockOnClose}
          onDateSelect={mockOnDateSelect}
        />
      </I18nTestProvider>,
    );

    await user.type(screen.getByLabelText("開始日"), "2024-01-03");
    await user.type(screen.getByLabelText("終了日"), "2024-01-07");
    await user.click(screen.getByText("絞り込み"));

    // Assert
    expect(mockOnDateSelect).toHaveBeenCalledWith({
      startDate: new Date("2024-01-03T00:00:00"),
      endDate: new Date("2024-01-07T00:00:00"),
    });
  });
});

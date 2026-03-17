import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CalendarGrid } from "./CalendarGrid";

const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

describe("CalendarGrid", () => {
  it("マウスの pointerdown で setPointerCapture が呼ばれない", () => {
    // Arrange
    const { container } = render(
      <CalendarGrid
        currentMonth={new Date(2026, 2, 1)}
        dayNames={dayNames}
        onDateClick={vi.fn()}
        onMonthChange={vi.fn()}
      />,
    );
    const calendar = container.firstElementChild as HTMLElement;
    const spy = vi.fn();
    calendar.setPointerCapture = spy;

    // Act
    fireEvent.pointerDown(calendar, {
      pointerId: 1,
      pointerType: "mouse",
      button: 0,
    });

    // Assert
    expect(spy).not.toHaveBeenCalled();
  });

  it("タッチの pointerdown で setPointerCapture が呼ばれる", () => {
    // Arrange
    const { container } = render(
      <CalendarGrid
        currentMonth={new Date(2026, 2, 1)}
        dayNames={dayNames}
        onDateClick={vi.fn()}
        onMonthChange={vi.fn()}
      />,
    );
    const calendar = container.firstElementChild as HTMLElement;
    const spy = vi.fn();
    calendar.setPointerCapture = spy;

    // Act
    fireEvent.pointerDown(calendar, {
      pointerId: 1,
      pointerType: "touch",
      button: 0,
    });

    // Assert
    expect(spy).toHaveBeenCalledWith(1);
  });

  it("日付ボタンをクリックすると onDateClick が呼ばれる", async () => {
    // Arrange
    const user = userEvent.setup();
    const onDateClick = vi.fn();
    render(
      <CalendarGrid
        currentMonth={new Date(2026, 2, 1)}
        dayNames={dayNames}
        onDateClick={onDateClick}
        onMonthChange={vi.fn()}
      />,
    );
    const buttons = screen.getAllByRole("button");
    const day15Button = buttons.find(
      (btn) => btn.textContent?.trim() === "15",
    )!;

    // Act
    await user.click(day15Button);

    // Assert
    expect(onDateClick).toHaveBeenCalledTimes(1);
    const calledDate = onDateClick.mock.calls[0][0] as Date;
    expect(calledDate.getDate()).toBe(15);
    expect(calledDate.getMonth()).toBe(2);
    expect(calledDate.getFullYear()).toBe(2026);
  });
});

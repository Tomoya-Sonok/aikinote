import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScrollIndicator } from "./ScrollIndicator";

const originalScrollBy = window.scrollBy;
const originalInnerHeight = window.innerHeight;

class MockIntersectionObserver implements IntersectionObserver {
  constructor(
    public callback: IntersectionObserverCallback,
    public options?: IntersectionObserverInit,
  ) {}

  readonly root = null;

  readonly rootMargin = "";

  readonly thresholds: ReadonlyArray<number> = [];

  disconnect() {}

  observe() {}

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  unobserve() {}
}

describe("ScrollIndicator", () => {
  beforeEach(() => {
    window.scrollBy = vi.fn();
    Object.defineProperty(window, "innerHeight", {
      value: 800,
      writable: true,
    });
    (
      globalThis as typeof globalThis & {
        IntersectionObserver: typeof IntersectionObserver;
      }
    ).IntersectionObserver = MockIntersectionObserver;
  });

  afterEach(() => {
    window.scrollBy = originalScrollBy;
    Object.defineProperty(window, "innerHeight", {
      value: originalInnerHeight,
      writable: true,
    });
  });

  it("クリックで画面高の75%分スクロールする", async () => {
    render(<ScrollIndicator label="続きを見る" />);

    await userEvent.click(screen.getByRole("button", { name: "続きを見る" }));

    expect(window.scrollBy).toHaveBeenCalledWith({
      top: 600,
      left: 0,
      behavior: "smooth",
    });
  });
});

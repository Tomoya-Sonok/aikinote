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

    Element.prototype.scrollIntoView = vi.fn();
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      top: 200, // Viewportより下にある想定
      bottom: 0,
      left: 0,
      right: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => {},
    }));
  });

  afterEach(() => {
    window.scrollBy = originalScrollBy;
    Object.defineProperty(window, "innerHeight", {
      value: originalInnerHeight,
      writable: true,
    });
  });

  it("クリックで画面高の75%分スクロールする（フォールバック）", async () => {
    // セクションがない場合は window.scrollBy が呼ばれる
    render(<ScrollIndicator label="続きを見る" />);

    await userEvent.click(screen.getByRole("button", { name: "続きを見る" }));

    expect(window.scrollBy).toHaveBeenCalledWith({
      top: 600,
      behavior: "smooth",
    });
  });

  it("セクションがある場合は次のセクションへスクロールする", async () => {
    // セクションをDOMに追加
    const section = document.createElement("section");
    document.body.appendChild(section);

    render(<ScrollIndicator label="続きを見る" />);

    await userEvent.click(screen.getByRole("button", { name: "続きを見る" }));

    expect(section.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "start",
    });

    // テスト後にクリーンアップ
    document.body.removeChild(section);
  });
});

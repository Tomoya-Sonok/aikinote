import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTypewriter } from "./useTypewriter";

describe("useTypewriter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("isStreaming=false なら最初からフルテキストを返す（過去メッセージ即時表示）", () => {
    // Arrange & Act
    const { result } = renderHook(() => useTypewriter("こんにちは", false, 40));

    // Assert
    expect(result.current).toBe("こんにちは");
  });

  it("isStreaming=true なら空文字から始まり、tick ごとに1文字ずつ進む", () => {
    // Arrange
    const { result } = renderHook(() => useTypewriter("abcd", true, 40));
    // 40 cps → tick = 25ms
    expect(result.current).toBe("");

    // Act & Assert: 1 tick で 1 文字
    act(() => {
      vi.advanceTimersByTime(25);
    });
    expect(result.current).toBe("a");

    act(() => {
      vi.advanceTimersByTime(25);
    });
    expect(result.current).toBe("ab");

    // 全文字進めると追いつく
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe("abcd");
  });

  it("ターゲット文字数を超えて進まない（追いついたら止まる）", () => {
    // Arrange
    const { result } = renderHook(() => useTypewriter("ab", true, 40));

    // Act
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Assert
    expect(result.current).toBe("ab");
  });

  it("途中でストリーミング中に fullText が伸びても同じ cps で続きを描画する", () => {
    // Arrange
    const { result, rerender } = renderHook(
      ({ text }: { text: string }) => useTypewriter(text, true, 40),
      { initialProps: { text: "ab" } },
    );

    // Act: 2 tick → "ab" まで到達
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current).toBe("ab");

    // ストリームが続いて fullText 拡張
    rerender({ text: "abcdef" });

    // 続きが 1 文字ずつ表示される
    act(() => {
      vi.advanceTimersByTime(25);
    });
    expect(result.current).toBe("abc");

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe("abcdef");
  });
});

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebounce } from "./useDebounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("フックを初期化すると初期値を返す", () => {
    // Arrange: フックを初期化する
    const initialValue = "初期値";
    const delay = 500;

    // Act: フックを実行する
    const { result } = renderHook(() => useDebounce(initialValue, delay));

    // Assert: 初期値が返されることを確認する
    expect(result.current).toBe("初期値");
  });

  it("値を変更してから遅延時間が経過すると新しい値を返す", () => {
    // Arrange: フックを初期化する
    const initialValue = "初期値";
    const updatedValue = "更新値";
    const delay = 500;
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: initialValue, delay: delay },
      },
    );

    // Act: 値を変更する
    rerender({ value: updatedValue, delay: delay });

    // Assert: 遅延時間経過前は古い値のまま
    expect(result.current).toBe("初期値");

    // Act: 遅延時間を経過させる
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Assert: 新しい値が反映される
    expect(result.current).toBe("更新値");
  });

  it("遅延時間内に複数回値を変更すると最後の値のみが反映される", () => {
    // Arrange: フックを初期化する
    const initialValue = "初期値";
    const delay = 500;
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: initialValue, delay: delay },
      },
    );

    // Act: 値を複数回変更する
    rerender({ value: "変更1", delay: delay });
    rerender({ value: "変更2", delay: delay });
    rerender({ value: "最終変更", delay: delay });

    // Assert: 遅延時間経過前は初期値のまま
    expect(result.current).toBe("初期値");

    // Act: 遅延時間を経過させる
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Assert: 最後の値のみが反映される
    expect(result.current).toBe("最終変更");
  });

  it("遅延時間内に値を再変更するとタイマーがリセットされる", () => {
    // Arrange: フックを初期化する
    const initialValue = "初期値";
    const delay = 1000;
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: initialValue, delay: delay },
      },
    );

    // Act: 最初の値変更
    rerender({ value: "1回目変更", delay: delay });

    // Act: 800ms進める（遅延時間未満）
    act(() => {
      vi.advanceTimersByTime(800);
    });

    // Act: 2回目の値変更（タイマーリセット）
    rerender({ value: "2回目変更", delay: delay });

    // Act: さらに800ms進める（1回目から1600ms、2回目から800ms）
    act(() => {
      vi.advanceTimersByTime(800);
    });

    // Assert: 2回目の変更から1000ms経過していないので初期値のまま
    expect(result.current).toBe("初期値");

    // Act: さらに200ms進める（2回目から1000ms経過）
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Assert: 2回目の変更値が反映される
    expect(result.current).toBe("2回目変更");
  });

  it("300msの遅延時間を指定すると300ms後に値が反映される", () => {
    // Arrange: 300msの遅延時間でフックを初期化する
    const initialValue = "初期値";
    const updatedValue = "更新値";
    const delay = 300;
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: initialValue, delay: delay },
      },
    );

    // Act: 値を変更する
    rerender({ value: updatedValue, delay: delay });

    // Act: 200ms進める（遅延時間未満）
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Assert: まだ古い値
    expect(result.current).toBe("初期値");

    // Act: さらに100ms進める（合計300ms）
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Assert: 新しい値が反映される
    expect(result.current).toBe("更新値");
  });

  it("数値型の値でも正しく動作する", () => {
    // Arrange: 数値型でフックを初期化する
    const initialValue = 0;
    const updatedValue = 42;
    const delay = 500;
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: initialValue, delay: delay },
      },
    );

    // Assert: 初期値が正しく設定される
    expect(result.current).toBe(0);

    // Act: 値を変更する
    rerender({ value: updatedValue, delay: delay });

    // Act: 遅延時間を経過させる
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Assert: 新しい数値が反映される
    expect(result.current).toBe(42);
  });

  it("オブジェクト型の値でも正しく動作する", () => {
    // Arrange: オブジェクト型でフックを初期化する
    const initialValue = { name: "初期オブジェクト" };
    const updatedValue = { name: "更新オブジェクト" };
    const delay = 500;
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      {
        initialProps: { value: initialValue, delay: delay },
      },
    );

    // Assert: 初期オブジェクトが正しく設定される
    expect(result.current).toBe(initialValue);

    // Act: オブジェクトを変更する
    rerender({ value: updatedValue, delay: delay });

    // Act: 遅延時間を経過させる
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Assert: 新しいオブジェクトが反映される
    expect(result.current).toBe(updatedValue);
  });
});

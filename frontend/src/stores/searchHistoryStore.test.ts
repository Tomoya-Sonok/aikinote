import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useSearchHistoryStore } from "./searchHistoryStore";

describe("searchHistoryStore", () => {
  beforeEach(() => {
    const { setState } = useSearchHistoryStore;
    act(() => {
      setState({ history: [] });
    });
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("初期状態ではhistoryが空配列である", () => {
    const state = useSearchHistoryStore.getState();
    expect(state.history).toEqual([]);
  });

  it("addToHistoryで検索履歴を追加できる", () => {
    act(() => {
      useSearchHistoryStore.getState().addToHistory("テスト検索");
    });

    const state = useSearchHistoryStore.getState();
    expect(state.history).toEqual(["テスト検索"]);
  });

  it("addToHistoryで空文字やスペースのみの入力は無視される", () => {
    act(() => {
      useSearchHistoryStore.getState().addToHistory("");
      useSearchHistoryStore.getState().addToHistory("   ");
    });

    const state = useSearchHistoryStore.getState();
    expect(state.history).toEqual([]);
  });

  it("addToHistoryで重複する検索語を追加すると最新位置に移動する", () => {
    act(() => {
      useSearchHistoryStore.getState().addToHistory("検索A");
      useSearchHistoryStore.getState().addToHistory("検索B");
      useSearchHistoryStore.getState().addToHistory("検索A");
    });

    const state = useSearchHistoryStore.getState();
    expect(state.history).toEqual(["検索A", "検索B"]);
  });

  it("addToHistoryで最大10件まで保持される", () => {
    act(() => {
      for (let i = 1; i <= 12; i++) {
        useSearchHistoryStore.getState().addToHistory(`検索${i}`);
      }
    });

    const state = useSearchHistoryStore.getState();
    expect(state.history).toHaveLength(10);
    expect(state.history[0]).toBe("検索12");
    expect(state.history[9]).toBe("検索3");
  });

  it("removeFromHistoryで指定した検索語を削除できる", () => {
    act(() => {
      useSearchHistoryStore.getState().addToHistory("検索A");
      useSearchHistoryStore.getState().addToHistory("検索B");
      useSearchHistoryStore.getState().removeFromHistory("検索A");
    });

    const state = useSearchHistoryStore.getState();
    expect(state.history).toEqual(["検索B"]);
  });

  it("clearHistoryで全件削除できる", () => {
    act(() => {
      useSearchHistoryStore.getState().addToHistory("検索A");
      useSearchHistoryStore.getState().addToHistory("検索B");
      useSearchHistoryStore.getState().clearHistory();
    });

    const state = useSearchHistoryStore.getState();
    expect(state.history).toEqual([]);
  });
});

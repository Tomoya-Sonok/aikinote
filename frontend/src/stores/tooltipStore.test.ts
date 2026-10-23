import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useTooltipStore } from "./tooltipStore";

describe("tooltipStore", () => {
  beforeEach(() => {
    // ストアの状態をリセット
    const { setState } = useTooltipStore;
    act(() => {
      setState({ hasShownTooltip: false });
    });
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("初期状態ではhasShownTooltipがfalseである", () => {
    const state = useTooltipStore.getState();
    expect(state.hasShownTooltip).toBe(false);
  });

  it("markTooltipShownを呼ぶとhasShownTooltipがtrueになる", () => {
    act(() => {
      useTooltipStore.getState().markTooltipShown();
    });

    const state = useTooltipStore.getState();
    expect(state.hasShownTooltip).toBe(true);
  });

  it("markTooltipShownを複数回呼んでもhasShownTooltipがtrueのままである", () => {
    act(() => {
      useTooltipStore.getState().markTooltipShown();
      useTooltipStore.getState().markTooltipShown();
    });

    const state = useTooltipStore.getState();
    expect(state.hasShownTooltip).toBe(true);
  });

  it("旧フォーマット（raw 'true'文字列）からZustand形式に移行される", () => {
    // 旧フォーマットでlocalStorageに保存
    localStorage.setItem("aikinote-font-size-tooltip-shown", "true");

    // ストアを再hydrate
    act(() => {
      useTooltipStore.persist.rehydrate();
    });

    const state = useTooltipStore.getState();
    expect(state.hasShownTooltip).toBe(true);

    // localStorageが新フォーマットに更新されていることを確認
    const stored = JSON.parse(
      localStorage.getItem("aikinote-font-size-tooltip-shown") ?? "{}",
    );
    expect(stored.state?.hasShownTooltip).toBe(true);
  });
});

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
});

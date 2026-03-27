import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useSurveyStore } from "./surveyStore";

describe("surveyStore", () => {
  beforeEach(() => {
    const { setState } = useSurveyStore;
    act(() => {
      setState({ dismissedAt: null });
    });
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("初期状態ではdismissedAtがnullである", () => {
    const state = useSurveyStore.getState();
    expect(state.dismissedAt).toBeNull();
  });

  it("setDismissedAtでISO 8601文字列を設定できる", () => {
    const now = new Date().toISOString();

    act(() => {
      useSurveyStore.getState().setDismissedAt(now);
    });

    const state = useSurveyStore.getState();
    expect(state.dismissedAt).toBe(now);
  });

  it("setDismissedAtを複数回呼ぶと最後の値が保持される", () => {
    const first = "2025-01-01T00:00:00.000Z";
    const second = "2025-06-15T12:00:00.000Z";

    act(() => {
      useSurveyStore.getState().setDismissedAt(first);
      useSurveyStore.getState().setDismissedAt(second);
    });

    const state = useSurveyStore.getState();
    expect(state.dismissedAt).toBe(second);
  });
});

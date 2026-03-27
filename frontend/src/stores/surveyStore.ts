import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface SurveyState {
  /** モーダルを閉じた日時（ISO 8601文字列）。null の場合は未dismissを意味する */
  dismissedAt: string | null;
  /** モーダルを閉じた日時を記録する */
  setDismissedAt: (date: string) => void;
}

export const useSurveyStore = create<SurveyState>()(
  persist(
    (set) => ({
      dismissedAt: null,
      setDismissedAt: (date: string) => set({ dismissedAt: date }),
    }),
    {
      name: "aikinote-survey-dismissed",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

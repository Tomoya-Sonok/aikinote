import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface TutorialState {
  hasSeenTutorial: boolean;
  setHasSeenTutorial: (value: boolean) => void;
}

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set) => ({
      hasSeenTutorial: false,
      setHasSeenTutorial: (value) => set({ hasSeenTutorial: value }),
    }),
    {
      name: "aikinote-tutorial", // localStorage key
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

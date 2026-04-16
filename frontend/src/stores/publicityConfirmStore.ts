import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface PublicityConfirmState {
  hasConfirmedPublicity: boolean;
  setHasConfirmedPublicity: (value: boolean) => void;
}

export const usePublicityConfirmStore = create<PublicityConfirmState>()(
  persist(
    (set) => ({
      hasConfirmedPublicity: false,
      setHasConfirmedPublicity: (value) =>
        set({ hasConfirmedPublicity: value }),
    }),
    {
      name: "aikinote-publicity-confirm",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

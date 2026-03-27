import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface TooltipState {
  /** ツールチップが既に表示済みかどうか */
  hasShownTooltip: boolean;
  /** ツールチップを表示済みとしてマークする */
  markTooltipShown: () => void;
}

export const useTooltipStore = create<TooltipState>()(
  persist(
    (set) => ({
      hasShownTooltip: false,
      markTooltipShown: () => set({ hasShownTooltip: true }),
    }),
    {
      name: "aikinote-font-size-tooltip-shown",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

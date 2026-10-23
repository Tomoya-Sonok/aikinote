import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";

export interface TooltipState {
  /** ツールチップが既に表示済みかどうか */
  hasShownTooltip: boolean;
  /** ツールチップを表示済みとしてマークする */
  markTooltipShown: () => void;
}

/**
 * 旧フォーマット（raw "true" 文字列）からZustand persist形式への移行をサポートするストレージアダプタ
 */
const migratingStorage: StateStorage = {
  getItem: (name: string): string | null => {
    const value = localStorage.getItem(name);
    if (value === null) return null;

    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && "state" in parsed) {
        return value;
      }
    } catch {
      // JSONとしてパースできない場合は旧フォーマット
    }

    // 旧フォーマット: localStorage.setItem(key, "true")
    if (value === "true") {
      const migrated = JSON.stringify({
        state: { hasShownTooltip: true },
        version: 0,
      });
      localStorage.setItem(name, migrated);
      return migrated;
    }

    return null;
  },
  setItem: (name: string, value: string) => {
    localStorage.setItem(name, value);
  },
  removeItem: (name: string) => {
    localStorage.removeItem(name);
  },
};

export const useTooltipStore = create<TooltipState>()(
  persist(
    (set) => ({
      hasShownTooltip: false,
      markTooltipShown: () => set({ hasShownTooltip: true }),
    }),
    {
      name: "aikinote-font-size-tooltip-shown",
      storage: createJSONStorage(() => migratingStorage),
    },
  ),
);

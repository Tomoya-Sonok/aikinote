import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";

export interface SurveyState {
  /** モーダルを閉じた日時（ISO 8601文字列）。null の場合は未dismissを意味する */
  dismissedAt: string | null;
  /** モーダルを閉じた日時を記録する */
  setDismissedAt: (date: string) => void;
}

/**
 * 旧フォーマット（ISO 8601日時文字列）からZustand persist形式への移行をサポートするストレージアダプタ
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
      // JSONとしてパースできない場合は旧フォーマット（ISO 8601文字列）の可能性
    }

    // 旧フォーマット: localStorage.setItem(key, new Date().toISOString())
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      const migrated = JSON.stringify({
        state: { dismissedAt: value },
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

export const useSurveyStore = create<SurveyState>()(
  persist(
    (set) => ({
      dismissedAt: null,
      setDismissedAt: (date: string) => set({ dismissedAt: date }),
    }),
    {
      name: "aikinote-survey-dismissed",
      storage: createJSONStorage(() => migratingStorage),
    },
  ),
);

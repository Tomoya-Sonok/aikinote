import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";

const MAX_ITEMS = 10;

export interface SearchHistoryState {
  history: string[];
  addToHistory: (query: string) => void;
  removeFromHistory: (query: string) => void;
  clearHistory: () => void;
}

/**
 * 旧フォーマット（JSON配列文字列）からZustand persist形式への移行をサポートするストレージアダプタ
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
      // 旧フォーマット: localStorage.setItem(key, JSON.stringify(["query1", "query2"]))
      if (Array.isArray(parsed)) {
        const migrated = JSON.stringify({
          state: { history: parsed },
          version: 0,
        });
        localStorage.setItem(name, migrated);
        return migrated;
      }
    } catch {
      // JSONとしてパースできない場合は無視
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

export const useSearchHistoryStore = create<SearchHistoryState>()(
  persist(
    (set) => ({
      history: [],
      addToHistory: (query: string) => {
        const trimmed = query.trim();
        if (!trimmed) return;
        set((state) => {
          // 重複は古い方を削除して最新化
          const filtered = state.history.filter((item) => item !== trimmed);
          return { history: [trimmed, ...filtered].slice(0, MAX_ITEMS) };
        });
      },
      removeFromHistory: (query: string) => {
        set((state) => ({
          history: state.history.filter((item) => item !== query),
        }));
      },
      clearHistory: () => set({ history: [] }),
    }),
    {
      name: "aikinote_search_history",
      storage: createJSONStorage(() => migratingStorage),
    },
  ),
);

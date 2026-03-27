import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const MAX_ITEMS = 10;

export interface SearchHistoryState {
  history: string[];
  addToHistory: (query: string) => void;
  removeFromHistory: (query: string) => void;
  clearHistory: () => void;
}

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
      name: "aikinote-search-history",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

"use client";

import { useSearchHistoryStore } from "@/stores/searchHistoryStore";

interface UseSearchHistoryResult {
  history: string[];
  addToHistory: (query: string) => void;
  removeFromHistory: (query: string) => void;
  clearHistory: () => void;
}

export function useSearchHistory(): UseSearchHistoryResult {
  const { history, addToHistory, removeFromHistory, clearHistory } =
    useSearchHistoryStore();

  return { history, addToHistory, removeFromHistory, clearHistory };
}

"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "aikinote_search_history";
const MAX_ITEMS = 10;

interface UseSearchHistoryResult {
  history: string[];
  addToHistory: (query: string) => void;
  removeFromHistory: (query: string) => void;
  clearHistory: () => void;
}

function loadHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

function saveHistory(history: string[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // localStorage が使えない場合は無視
  }
}

export function useSearchHistory(): UseSearchHistoryResult {
  const [history, setHistory] = useState<string[]>([]);

  // SSR安全: マウント後に localStorage から読み込み
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const addToHistory = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setHistory((prev) => {
      // 重複は古い方を削除して最新化
      const filtered = prev.filter((item) => item !== trimmed);
      const next = [trimmed, ...filtered].slice(0, MAX_ITEMS);
      saveHistory(next);
      return next;
    });
  }, []);

  const removeFromHistory = useCallback((query: string) => {
    setHistory((prev) => {
      const next = prev.filter((item) => item !== query);
      saveHistory(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    saveHistory([]);
  }, []);

  return { history, addToHistory, removeFromHistory, clearHistory };
}

"use client";

import { useEffect, useRef } from "react";

/**
 * ページ離脱前に確認ダイアログを表示するフック。
 * predicate が true を返す場合に beforeunload イベントをブロックする。
 * useRef で最新の predicate を保持し、リスナーの再登録を避ける。
 */
export function useBeforeUnload(predicate: () => boolean) {
  const predicateRef = useRef(predicate);
  predicateRef.current = predicate;

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (predicateRef.current()) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);
}

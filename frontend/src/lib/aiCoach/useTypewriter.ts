"use client";

import { useEffect, useRef, useState } from "react";

// AIコーチのアシスタント応答を「1文字ずつ一定速度で」表示するためのフック。
//
// 使い方:
//   const displayed = useTypewriter(fullText, isStreaming, 40);
//
// 仕様:
// - `isStreaming=true` で開始した場合は空文字から開始し、cps レートで進む。
// - `isStreaming=false` で開始した場合（DB から読み込んだ過去メッセージ）は即時フル表示。
// - ストリーミング中に追加チャンクで `fullText` が伸びても、表示は同じ cps レートで継続。
// - ストリーミング完了後（isStreaming が false に切り替わっても）、追いつくまで cps レートで流す。
export function useTypewriter(
  fullText: string,
  isStreaming: boolean,
  cps = 40,
): string {
  // 初期状態のみ isStreaming を見る（マウント後は cps レートで自然に追いつく）。
  const [displayed, setDisplayed] = useState(() =>
    isStreaming ? "" : fullText,
  );
  const fullTextRef = useRef(fullText);
  fullTextRef.current = fullText;

  useEffect(() => {
    const intervalMs = Math.max(8, Math.floor(1000 / cps));
    const id = setInterval(() => {
      setDisplayed((prev) => {
        const target = fullTextRef.current;
        if (prev.length >= target.length) return prev;
        return target.slice(0, prev.length + 1);
      });
    }, intervalMs);
    return () => clearInterval(id);
  }, [cps]);

  return displayed;
}

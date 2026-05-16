"use client";

import { useEffect, useState } from "react";
import { isNativeApp } from "@/lib/api/native-bridge";

/**
 * 現在のレンダリング環境がネイティブアプリ (Expo WebView) かどうかを返す。
 *
 * SSR / 初回ハイドレーション時は false を返し、マウント後に
 * window.__AIKINOTE_NATIVE_APP__ の値で更新する (hydration mismatch を回避)。
 *
 * 用途:
 *   - 統計・カレンダー画面のオフラインガード (Native かつオフライン時のみ表示)
 *   - 添付フォームの動画選択肢の動的制御
 */
export function useIsNativeApp(): boolean {
  const [native, setNative] = useState(false);
  useEffect(() => {
    setNative(isNativeApp());
  }, []);
  return native;
}

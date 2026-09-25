"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useEffect } from "react";
import { isNativeApp } from "@/lib/api/native-bridge";

type NativeWindow = Window & {
  __aikinoteNavigate?: (path: string) => boolean;
  ReactNativeWebView?: { postMessage: (msg: string) => void };
};

// ネイティブのタブバーから遷移する主要画面（ネイティブ側 lib/navigation/tab-utils.ts の TABS と対応）
const NATIVE_TAB_PATH_SUFFIXES = [
  "/personal/pages",
  "/social/posts",
  "/mypage",
] as const;

/** アプリ内のパス（"/" 始まり、プロトコル相対 "//" は除外）だけを受け付ける */
export const isInAppPath = (path: unknown): path is string =>
  typeof path === "string" && path.startsWith("/") && !path.startsWith("//");

/**
 * ネイティブアプリ（Expo WebView）用のクライアント遷移ブリッジ。
 *
 * ネイティブのタブ・ロゴ・通知・検索ボタンは、これまで `location.assign` でページ全体を
 * 読み込み直していた（SSR・JS 起動・認証初期化・全データ取得をやり直すため遅い）。
 * `window.__aikinoteNavigate(path)` を公開し、Next.js のクライアント遷移（router.push）で
 * 画面を切り替えられるようにする。ブリッジを知らない旧版アプリは従来どおり動く。
 *
 * あわせて、パスが変わるたびに `ROUTE_CHANGED` をネイティブへ送る。
 * クライアント遷移では WebView の onNavigationStateChange が届かないことがあるため、
 * ネイティブ側のタブ選択状態・ヘッダー種別の判定にこの URL を使う。
 */
export function NativeNavigationBridge() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  useEffect(() => {
    if (!isNativeApp()) return;
    const win = window as NativeWindow;

    win.__aikinoteNavigate = (path: string) => {
      if (!isInAppPath(path)) return false;
      router.push(path);
      return true;
    };

    // タブ切替を即時にするため、主要画面を先読みしておく
    for (const suffix of NATIVE_TAB_PATH_SUFFIXES) {
      router.prefetch(`/${locale}${suffix}`);
    }

    return () => {
      delete win.__aikinoteNavigate;
    };
  }, [router, locale]);

  useEffect(() => {
    if (!isNativeApp() || !pathname) return;
    const win = window as NativeWindow;
    win.ReactNativeWebView?.postMessage(
      JSON.stringify({
        type: "ROUTE_CHANGED",
        payload: { url: window.location.href },
      }),
    );
  }, [pathname]);

  return null;
}

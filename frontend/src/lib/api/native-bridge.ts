"use client";

// ネイティブアプリ (Expo WebView) 判定ユーティリティ。
// IAP / OAuth / プッシュトークン等の Native 専用機能で使う。

interface NativeWindow {
  __AIKINOTE_NATIVE_APP__?: boolean;
}

declare global {
  interface Window {
    __AIKINOTE_NATIVE_APP__?: boolean;
    ReactNativeWebView?: { postMessage: (message: string) => void };
  }
}

export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as NativeWindow).__AIKINOTE_NATIVE_APP__;
}

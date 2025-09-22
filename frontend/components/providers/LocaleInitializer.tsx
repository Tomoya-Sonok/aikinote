"use client";

import { useLocale } from "next-intl";
import { useEffect } from "react";
import { useLanguageStore, type Language } from "@/stores/languageStore";

export function LocaleInitializer() {
  const currentLocale = useLocale() as Language;
  const { setLanguage } = useLanguageStore();

  useEffect(() => {
    // ページロード時に現在のlocaleでストアを初期化
    // LocalStorageの値が存在しない場合はURLのlocaleを使用
    const storedLanguage = useLanguageStore.getState().language;
    if (!storedLanguage || storedLanguage !== currentLocale) {
      setLanguage(currentLocale);
    }
  }, [currentLocale, setLanguage]);

  return null; // このコンポーネントは何も描画しない
}
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type Language = "ja" | "en";

export interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
  getNavigationPath: (basePath: string) => string;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: "ja", // デフォルトは日本語
      setLanguage: (language) => set({ language }),
      getNavigationPath: (basePath: string) => {
        const { language } = get();
        // 日本語の場合はプリフィックスなし、英語の場合は /en プリフィックス
        return language === "ja" ? basePath : `/en${basePath}`;
      },
    }),
    {
      name: "aikinote-language", // localStorage key
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

// 言語の表示名を取得するヘルパー関数
export const getLanguageLabel = (language: Language): string => {
  switch (language) {
    case "ja":
      return "日本語";
    case "en":
      return "English";
    default:
      return "日本語";
  }
};

// 言語の選択肢を取得するヘルパー関数
export const getLanguageOptions = (): Array<{
  value: Language;
  label: string;
}> => {
  return [
    { value: "ja", label: "日本語" },
    { value: "en", label: "English" },
  ];
};

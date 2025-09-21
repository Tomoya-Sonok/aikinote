import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type Language = 'ja' | 'en'

export interface LanguageState {
  language: Language
  setLanguage: (language: Language) => void
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'ja', // デフォルトは日本語
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'aikinote-language', // localStorage key
      storage: createJSONStorage(() => localStorage),
    }
  )
)

// 言語の表示名を取得するヘルパー関数
export const getLanguageLabel = (language: Language): string => {
  switch (language) {
    case 'ja':
      return '日本語'
    case 'en':
      return 'English'
    default:
      return '日本語'
  }
}

// 言語の選択肢を取得するヘルパー関数
export const getLanguageOptions = (): Array<{ value: Language; label: string }> => {
  return [
    { value: 'ja', label: '日本語' },
    { value: 'en', label: 'English' },
  ]
}
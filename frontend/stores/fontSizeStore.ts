import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type FontSize = 'small' | 'medium' | 'large'

export interface FontSizeState {
  fontSize: FontSize
  setFontSize: (fontSize: FontSize) => void
}

export const useFontSizeStore = create<FontSizeState>()(
  persist(
    (set) => ({
      fontSize: 'medium', // デフォルトは中サイズ
      setFontSize: (fontSize) => set({ fontSize }),
    }),
    {
      name: 'aikinote-font-size', // localStorage key
      storage: createJSONStorage(() => localStorage),
    }
  )
)

// フォントサイズの値をピクセルで取得するヘルパー関数
export const getFontSizeValue = (fontSize: FontSize): number => {
  switch (fontSize) {
    case 'small':
      return 14
    case 'medium':
      return 16
    case 'large':
      return 20
    default:
      return 16
  }
}

// フォントサイズのラベルを取得するヘルパー関数
export const getFontSizeLabel = (fontSize: FontSize): string => {
  switch (fontSize) {
    case 'small':
      return '小'
    case 'medium':
      return '中'
    case 'large':
      return '大'
    default:
      return '中'
  }
}

// スライダー用のインデックスとフォントサイズの相互変換
export const fontSizeToIndex = (fontSize: FontSize): number => {
  switch (fontSize) {
    case 'small':
      return 0
    case 'medium':
      return 1
    case 'large':
      return 2
    default:
      return 1
  }
}

export const indexToFontSize = (index: number): FontSize => {
  switch (index) {
    case 0:
      return 'small'
    case 1:
      return 'medium'
    case 2:
      return 'large'
    default:
      return 'medium'
  }
}
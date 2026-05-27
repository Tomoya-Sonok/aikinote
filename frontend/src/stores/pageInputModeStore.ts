import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// #280 稽古記録の入力モード
// - free: 自由入力（従来）
// - tag_based: タグごとにメモ入力
export type PageInputMode = "free" | "tag_based";

export interface PageInputModeState {
  // 新規作成画面で前回選んだモードを記憶する（初回は free）。
  // ネイティブ版は WebView ハイブリッドのため、ここでの localStorage 保存が
  // そのまま流用される（AsyncStorage 側の追加実装は不要）。
  lastMode: PageInputMode;
  setLastMode: (mode: PageInputMode) => void;
}

export const usePageInputModeStore = create<PageInputModeState>()(
  persist(
    (set) => ({
      lastMode: "free",
      setLastMode: (lastMode) => set({ lastMode }),
    }),
    {
      name: "aikinote-page-input-mode", // localStorage key
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

import { useEffect, useState } from "react";

const TOOLTIP_STORAGE_KEY = "aikinote-font-size-tooltip-shown";

export function useTooltipVisibility() {
  const [shouldShowTooltip, setShouldShowTooltip] = useState(false);

  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window === "undefined") return;

    // LocalStorageから既に表示済みかどうかを確認
    const hasShownTooltip = localStorage.getItem(TOOLTIP_STORAGE_KEY);

    if (!hasShownTooltip) {
      // 初回訪問時にtooltipを表示
      setShouldShowTooltip(true);
    }
  }, []);

  const hideTooltip = () => {
    setShouldShowTooltip(false);
    // LocalStorageにフラグを保存
    if (typeof window !== "undefined") {
      localStorage.setItem(TOOLTIP_STORAGE_KEY, "true");
    }
  };

  return {
    shouldShowTooltip,
    hideTooltip,
  };
}

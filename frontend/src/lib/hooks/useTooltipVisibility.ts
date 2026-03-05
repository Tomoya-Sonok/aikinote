import { useEffect, useState } from "react";

export function useTooltipVisibility(
  storageKey: string = "aikinote-font-size-tooltip-shown",
) {
  const [shouldShowTooltip, setShouldShowTooltip] = useState(false);

  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window === "undefined") return;

    // LocalStorageから既に表示済みかどうかを確認
    const hasShownTooltip = localStorage.getItem(storageKey);

    if (!hasShownTooltip) {
      // 初回訪問時にtooltipを表示
      setShouldShowTooltip(true);
    }
  }, [storageKey]);

  const hideTooltip = () => {
    setShouldShowTooltip(false);
    // LocalStorageにフラグを保存
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, "true");
    }
  };

  return {
    shouldShowTooltip,
    hideTooltip,
  };
}

import { useTooltipStore } from "@/stores/tooltipStore";

export function useTooltipVisibility() {
  const { hasShownTooltip, markTooltipShown } = useTooltipStore();

  // 初回訪問時（まだ表示済みフラグが立っていない場合）にtooltipを表示
  const shouldShowTooltip = !hasShownTooltip;

  const hideTooltip = () => {
    markTooltipShown();
  };

  return {
    shouldShowTooltip,
    hideTooltip,
  };
}

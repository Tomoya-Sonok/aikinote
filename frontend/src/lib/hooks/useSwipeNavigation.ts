"use client";

import {
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useRef,
  useState,
} from "react";

const SWIPE_DEAD_ZONE = 8;
const SWIPE_THRESHOLD_RATIO = 0.2;
const BOUNDARY_DAMPING = 0.2;

interface UseSwipeNavigationOptions {
  /** タブキーの順序付きリスト */
  tabs: readonly string[];
  /** 現在のアクティブタブ */
  activeTab: string;
  /** スワイプ完了時のコールバック。falseを返すと遷移をキャンセル */
  onTabChange: (newTab: string) => boolean;
  /** スワイプの有効/無効（デフォルト: true） */
  enabled?: boolean;
}

interface SwipeHandlers {
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onPointerCancel: (e: ReactPointerEvent<HTMLDivElement>) => void;
}

interface UseSwipeNavigationReturn {
  /** スワイプ対象の要素に付与するref */
  containerRef: RefObject<HTMLDivElement>;
  /** ポインターイベントハンドラー */
  handlers: SwipeHandlers;
  /** スワイプ進捗: 0=現在タブ中央, 負=次タブ方向, 正=前タブ方向 */
  swipeProgress: number;
  /** ドラッグ中かどうか */
  isDragging: boolean;
}

export function useSwipeNavigation({
  tabs,
  activeTab,
  onTabChange,
  enabled = true,
}: UseSwipeNavigationOptions): UseSwipeNavigationReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const widthRef = useRef(1);
  const dragOffsetRef = useRef(0);
  const isHorizontalRef = useRef<boolean | null>(null);
  const [swipeProgress, setSwipeProgress] = useState(0);

  const activeIndex = tabs.indexOf(activeTab);
  const isFirst = activeIndex <= 0;
  const isLast = activeIndex >= tabs.length - 1;

  const resetState = useCallback(() => {
    dragOffsetRef.current = 0;
    pointerIdRef.current = null;
    isHorizontalRef.current = null;
    setSwipeProgress(0);
  }, []);

  const settle = useCallback(() => {
    const width = widthRef.current;
    const threshold = width * SWIPE_THRESHOLD_RATIO;
    const delta = dragOffsetRef.current;

    // delta > 0: 右スワイプ (前のタブへ), delta < 0: 左スワイプ (次のタブへ)
    if (delta > threshold && !isFirst) {
      const prevTab = tabs[activeIndex - 1];
      if (!onTabChange(prevTab)) {
        // キャンセルされた
        resetState();
        return;
      }
    } else if (delta < -threshold && !isLast) {
      const nextTab = tabs[activeIndex + 1];
      if (!onTabChange(nextTab)) {
        resetState();
        return;
      }
    }

    resetState();
  }, [tabs, activeIndex, isFirst, isLast, onTabChange, resetState]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!enabled) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;

      pointerIdRef.current = event.pointerId;
      startXRef.current = event.clientX;
      startYRef.current = event.clientY;
      widthRef.current = containerRef.current?.offsetWidth ?? 1;
      dragOffsetRef.current = 0;
      isHorizontalRef.current = null;

      if (event.pointerType !== "mouse") {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }
    },
    [enabled],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current !== event.pointerId) return;

      const deltaX = event.clientX - startXRef.current;
      const deltaY = event.clientY - startYRef.current;

      // 方向未確定
      if (isHorizontalRef.current === null) {
        if (
          Math.abs(deltaX) < SWIPE_DEAD_ZONE &&
          Math.abs(deltaY) < SWIPE_DEAD_ZONE
        ) {
          return;
        }
        isHorizontalRef.current = Math.abs(deltaX) > Math.abs(deltaY);
        if (!isHorizontalRef.current) {
          // 縦方向と判定 → リリース
          pointerIdRef.current = null;
          return;
        }
      }

      if (!isHorizontalRef.current) return;

      const width = widthRef.current;
      let progress = deltaX / width;

      // 端のdampened overscroll
      if ((progress > 0 && isFirst) || (progress < 0 && isLast)) {
        progress = progress * BOUNDARY_DAMPING;
      }

      // -1〜1にクランプ
      progress = Math.max(-1, Math.min(1, progress));

      dragOffsetRef.current = deltaX;
      setSwipeProgress(progress);
    },
    [isFirst, isLast],
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current !== event.pointerId) return;
      settle();
    },
    [settle],
  );

  const handlePointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current !== event.pointerId) return;
      resetState();
    },
    [resetState],
  );

  const handlers: SwipeHandlers = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel,
  };

  return {
    containerRef,
    handlers,
    swipeProgress,
    isDragging: swipeProgress !== 0,
  };
}

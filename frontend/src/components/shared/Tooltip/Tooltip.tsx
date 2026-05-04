"use client";

import type { FC, ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./Tooltip.module.css";

interface TooltipProps {
  text: string;
  children: ReactNode;
  position?: "top" | "bottom";
  align?: "center" | "left" | "right";
  className?: string;
  ariaLabel?: string;
}

export const Tooltip: FC<TooltipProps> = ({
  text,
  children,
  position = "top",
  align = "center",
  className,
  ariaLabel,
}) => {
  const [visible, setVisible] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  const handlePointerEnter = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "mouse") setVisible(true);
  }, []);

  const handlePointerLeave = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "mouse") setVisible(false);
  }, []);

  // タッチ / ペン: pointerdown で即時トグル。preventDefault で後続の focus と synthetic click を抑制し、
  // onFocus → setVisible(true) と onClick → toggle が連続して状態が反転する競合（SP で 2 タップ必要に
  // 見えていた原因）を防ぐ。マウスは hover で開閉するので onClick toggle は不要。
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") {
      e.preventDefault();
      setVisible((v) => !v);
    }
  }, []);

  const handleFocus = useCallback(() => setVisible(true), []);
  const handleBlur = useCallback(() => setVisible(false), []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setVisible((v) => !v);
    } else if (e.key === "Escape") {
      setVisible(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    const onDocPointerDown = (e: PointerEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setVisible(false);
      }
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onDocPointerDown);
    };
  }, [visible]);

  return (
    // biome-ignore lint/a11y/useSemanticElements: Using span with role="button" for inline tooltip trigger that needs to wrap arbitrary children
    <span
      ref={wrapperRef}
      className={`${styles.wrapper}${className ? ` ${className}` : ""}`}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {children}
      {visible && (
        <span
          className={`${styles.tooltip} ${position === "bottom" ? styles.bottom : styles.top}${align === "left" ? ` ${styles.alignLeft}` : ""}${align === "right" ? ` ${styles.alignRight}` : ""}`}
          role="tooltip"
        >
          {text}
        </span>
      )}
    </span>
  );
};

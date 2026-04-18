"use client";

import type { FC, ReactNode } from "react";
import { useCallback, useRef, useState } from "react";
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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setVisible(false), []);

  const handleTouchStart = useCallback(() => {
    timerRef.current = setTimeout(() => {
      setVisible(true);
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // 表示後は少し遅延して閉じる
    setTimeout(() => setVisible(false), 2000);
  }, []);

  return (
    // biome-ignore lint/a11y/useSemanticElements: Using span with role="button" for inline tooltip trigger that needs to wrap arbitrary children
    <span
      className={`${styles.wrapper}${className ? ` ${className}` : ""}`}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
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

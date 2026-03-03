"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./ScrollIndicator.module.css";

interface ScrollIndicatorProps {
  label: string;
}

export function ScrollIndicator({ label }: ScrollIndicatorProps) {
  const [isHidden, setIsHidden] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const footer = document.querySelector("[data-scroll-footer]");
    if (!footer) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsHidden(entry.isIntersecting);
      },
      {
        root: null,
        threshold: 0.05,
        rootMargin: "0px 0px -8px 0px",
      },
    );

    observer.observe(footer);

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleClick = useCallback(() => {
    if (typeof window === "undefined") return;

    // 現在のスクロール位置より下にある最初のセクションを探す
    const sections = Array.from(document.querySelectorAll("section"));

    // getBoundingClientRect().top はViewport上端からの距離
    // これが正の値（かつ一定の閾値以上）であれば、現在の表示領域より下にあると判定できる
    const targetSection = sections.find((section) => {
      const rect = section.getBoundingClientRect();
      return rect.top > 100; // 100pxのバッファ（ヘッダー分などを考慮）
    });

    if (targetSection) {
      targetSection.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      // 次のセクションがない場合は単純に少しスクロール（フォールバック）
      window.scrollBy({
        top: window.innerHeight * 0.75,
        behavior: "smooth",
      });
    }
  }, []);

  const className = useMemo(
    () =>
      isHidden
        ? `${styles.scrollIndicator} ${styles.hidden}`
        : styles.scrollIndicator,
    [isHidden],
  );

  if (!mounted) return null;

  return createPortal(
    <button
      type="button"
      className={className}
      onClick={handleClick}
      aria-label={label}
    >
      <span className={styles.chevrons} aria-hidden="true">
        <span className={styles.chevron} />
        <span className={styles.chevron} />
        <span className={styles.chevron} />
      </span>
      <span className={styles.label}>{label}</span>
    </button>,
    document.body,
  );
}

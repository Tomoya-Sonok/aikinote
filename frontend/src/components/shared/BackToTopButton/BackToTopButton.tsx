"use client";

import type { FC } from "react";
import styles from "./BackToTopButton.module.css";

interface BackToTopButtonProps {
  label: string;
}

export const BackToTopButton: FC<BackToTopButtonProps> = ({ label }) => {
  const handleClick = () => {
    if (typeof window === "undefined") return;

    const scrollOptions: ScrollToOptions = { top: 0, behavior: "smooth" };

    // 一般的なブラウザ（Windowスクロール）
    window.scrollTo(scrollOptions);

    // HTML要素（一部のブラウザや設定）
    document.documentElement.scrollTo(scrollOptions);

    // Body要素（互換モードや特定のスタイル構成）
    document.body.scrollTo(scrollOptions);
  };

  return (
    <button type="button" className={styles.button} onClick={handleClick}>
      <span className={styles.icon} aria-hidden="true" />
      {label}
    </button>
  );
};

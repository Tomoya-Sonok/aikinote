"use client";

import type { FC } from "react";
import styles from "./BackToTopButton.module.css";

interface BackToTopButtonProps {
  label: string;
}

export const BackToTopButton: FC<BackToTopButtonProps> = ({ label }) => {
  const handleClick = () => {
    if (typeof window === "undefined") return;
    const target = document.scrollingElement ?? document.documentElement;
    if (target) {
      target.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button type="button" className={styles.button} onClick={handleClick}>
      <span className={styles.icon} aria-hidden="true" />
      {label}
    </button>
  );
};

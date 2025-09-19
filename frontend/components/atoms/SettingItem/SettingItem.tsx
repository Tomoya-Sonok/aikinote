import type { FC, ReactNode } from "react";
import styles from "./SettingItem.module.css";

interface SettingItemProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "default" | "danger";
  className?: string;
}

export const SettingItem: FC<SettingItemProps> = ({
  children,
  onClick,
  variant = "default",
  className = "",
}) => {
  return (
    <button
      type="button"
      className={`${styles.item} ${styles[variant]} ${className}`}
      onClick={onClick}
    >
      <span className={styles.text}>{children}</span>
      <span className={styles.arrow}>›</span>
    </button>
  );
};

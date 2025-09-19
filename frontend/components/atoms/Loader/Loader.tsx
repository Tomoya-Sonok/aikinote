import React from "react";
import styles from "./Loader.module.css";

export interface LoaderProps {
  /** ローダーのサイズ */
  size?: "small" | "medium" | "large";
  /** 中央揃えにするかどうか */
  centered?: boolean;
  /** 表示するテキスト */
  text?: string;
  /** カスタムクラス名 */
  className?: string;
}

/**
 * モダンなスピナーローダーコンポーネント
 */
export const Loader: React.FC<LoaderProps> = ({
  size = "medium",
  centered = false,
  text,
  className,
}) => {
  const loaderClasses = [
    styles.loader,
    size !== "medium" && styles[size],
    centered && styles.centered,
    text && styles.withText,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (text) {
    return (
      <div className={loaderClasses}>
        <div className={styles.spinner} />
        <span className={styles.text}>{text}</span>
      </div>
    );
  }

  if (centered) {
    return (
      <div className={loaderClasses}>
        <div className={styles.spinner} />
      </div>
    );
  }

  return (
    <div className={loaderClasses}>
      <div className={styles.spinner} />
    </div>
  );
};

export default Loader;

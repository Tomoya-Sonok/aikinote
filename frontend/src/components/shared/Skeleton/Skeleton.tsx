import type { FC } from "react";
import styles from "./Skeleton.module.css";

interface SkeletonProps {
  variant?: "rect" | "circle" | "text";
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
}

export const Skeleton: FC<SkeletonProps> = ({
  variant = "rect",
  width,
  height,
  borderRadius,
  className = "",
}) => {
  const variantClass = styles[variant] || "";

  return (
    <span
      className={`${styles.skeleton} ${variantClass} ${className}`}
      style={{
        width,
        height,
        ...(variant === "rect" && borderRadius ? { borderRadius } : {}),
      }}
      aria-hidden="true"
    />
  );
};

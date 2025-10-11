import type { FC, ReactNode } from "react";
import styles from "./Tag.module.css";

interface TagProps {
  children: ReactNode;
  variant?: "default" | "selected" | "selectable";
  onClick?: () => void;
  className?: string;
}

export const Tag: FC<TagProps> = ({
  children,
  variant = "default",
  onClick,
  className,
}) => {
  const baseClassName = [
    styles.tag,
    styles[variant],
    onClick ? styles.clickable : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (onClick) {
    return (
      <button type="button" className={baseClassName} onClick={onClick}>
        {children}
      </button>
    );
  }

  return <div className={baseClassName}>{children}</div>;
};

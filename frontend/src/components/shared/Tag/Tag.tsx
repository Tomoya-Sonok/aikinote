import type { FC, ReactNode } from "react";
import styles from "./Tag.module.css";

interface TagProps {
  children: ReactNode;
  variant?: "default" | "selected" | "selectable";
  onClick?: () => void;
  className?: string;
}

import { Button } from "@/components/shared/Button/Button";

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
      <Button variant="ghost" className={baseClassName} onClick={onClick}>
        {children}
      </Button>
    );
  }

  return <div className={baseClassName}>{children}</div>;
};

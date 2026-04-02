import { CaretRightIcon } from "@phosphor-icons/react";
import type { FC, ReactNode } from "react";
import { Link } from "@/lib/i18n/routing";
import styles from "./SettingItem.module.css";

interface SettingItemProps {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "default" | "danger";
  className?: string;
}

export const SettingItem: FC<SettingItemProps> = ({
  children,
  onClick,
  href,
  variant = "default",
  className = "",
}) => {
  const content = (
    <>
      <span className={styles.text}>{children}</span>
      <CaretRightIcon
        size={16}
        weight="light"
        color="var(--black)"
        className={styles.arrow}
      />
    </>
  );

  const itemClass = `${styles.item} ${styles[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={itemClass} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={itemClass} onClick={onClick}>
      {content}
    </button>
  );
};

import Image from "next/image";
import type { FC } from "react";
import styles from "./FilterItem.module.css";

interface FilterItemProps {
  icon: string;
  label: string;
  value: string;
  onClick?: () => void;
}

export const FilterItem: FC<FilterItemProps> = ({
  icon,
  label,
  value,
  onClick,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <button
      type="button"
      className={`${styles.filterItem} ${styles.filterItemButton}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <Image
        src={icon}
        alt={label}
        width={24}
        height={24}
        className={styles.filterIcon}
      />
      <span className={styles.filterLabel}>{label}</span>
      <span className={styles.filterValue}>{value}</span>
      <span className={styles.arrow}>＞</span>
    </button>
  );
};

import Image from "next/image";
import type { FC } from "react";
import { useTranslations } from "next-intl";
import styles from "./FloatingActionButton.module.css";

interface FloatingActionButtonProps {
  onClick: () => void;
  label?: string;
}

export const FloatingActionButton: FC<FloatingActionButtonProps> = ({
  onClick,
  label,
}) => {
  const t = useTranslations();
  const defaultLabel = label || t("components.createPage");
  return (
    <button className={styles.fab} onClick={onClick} type="button">
      <Image
        src="/icons/file-edit-icon-new.svg"
        alt={t("components.newCreate")}
        width={32}
        height={33}
        className={styles.icon}
      />
      <span className={styles.label}>{defaultLabel}</span>
    </button>
  );
};

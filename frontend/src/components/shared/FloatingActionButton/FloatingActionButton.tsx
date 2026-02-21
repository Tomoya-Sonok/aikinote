import { useTranslations } from "next-intl";
import type { FC } from "react";
import { NotePencilIcon } from "@phosphor-icons/react";
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
      <NotePencilIcon
        size={32}
        weight="light"
        color="var(--aikinote-white)"
        className={styles.icon}
      />
      <span className={styles.label}>{defaultLabel}</span>
    </button>
  );
};

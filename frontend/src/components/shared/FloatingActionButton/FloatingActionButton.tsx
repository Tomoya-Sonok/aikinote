import { NotePencilIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import type { FC } from "react";
import { Button } from "@/components/shared/Button/Button";
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
    <Button variant="icon" className={styles.fab} onClick={onClick}>
      <NotePencilIcon
        size={32}
        weight="light"
        color="var(--white)"
        className={styles.icon}
      />
      <span className={styles.label}>{defaultLabel}</span>
    </Button>
  );
};

import { NotePencilIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { FC } from "react";
import styles from "./FloatingActionButton.module.css";

interface FloatingActionButtonProps {
  onClick?: () => void;
  href?: string;
  label?: string;
}

export const FloatingActionButton: FC<FloatingActionButtonProps> = ({
  onClick,
  href,
  label,
}) => {
  const t = useTranslations();
  const defaultLabel = label || t("components.createPage");

  const content = (
    <>
      <NotePencilIcon
        size={32}
        weight="light"
        color="var(--white)"
        className={styles.icon}
      />
      <span className={styles.label}>{defaultLabel}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={styles.fab} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <button className={styles.fab} onClick={onClick} type="button">
      {content}
    </button>
  );
};

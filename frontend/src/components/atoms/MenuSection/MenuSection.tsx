import type { FC, ReactNode } from "react";
import styles from "./MenuSection.module.css";

interface MenuSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export const MenuSection: FC<MenuSectionProps> = ({
  title,
  children,
  className = "",
}) => {
  return (
    <section className={`${styles.section} ${className}`}>
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.content}>{children}</div>
    </section>
  );
};

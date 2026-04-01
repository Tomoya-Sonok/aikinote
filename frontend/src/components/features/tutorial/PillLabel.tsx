import type { ReactNode } from "react";
import styles from "./Tutorial.module.css";

interface PillLabelProps {
  text: string;
  icon?: ReactNode;
}

export function PillLabel({ text, icon }: PillLabelProps) {
  return (
    <span className={styles.pillLabel}>
      {icon}
      {text}
    </span>
  );
}

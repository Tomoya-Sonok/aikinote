import styles from "./Tutorial.module.css";

interface PillLabelProps {
  text: string;
}

export function PillLabel({ text }: PillLabelProps) {
  return <span className={styles.pillLabel}>{text}</span>;
}

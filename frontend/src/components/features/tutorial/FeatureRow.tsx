import type { ReactNode } from "react";
import styles from "./Tutorial.module.css";

interface FeatureRowProps {
  icon: ReactNode;
  title: string;
  sub: string;
}

export function FeatureRow({ icon, title, sub }: FeatureRowProps) {
  return (
    <div className={styles.featureRow}>
      <div className={styles.featureRowIcon}>{icon}</div>
      <div>
        <p className={styles.featureRowTitle}>{title}</p>
        <p className={styles.featureRowSub}>{sub}</p>
      </div>
    </div>
  );
}

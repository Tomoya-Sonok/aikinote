import type { FC } from "react";
import { Skeleton } from "@/components/shared/Skeleton/Skeleton";
import styles from "./StatsCardSkeleton.module.css";

export const StatsCardSkeleton: FC = () => {
  return (
    <div className={styles.statsSection} aria-hidden="true">
      <div className={styles.stats}>
        {[0, 1, 2].map((i) => (
          <div key={i} className={styles.statItem}>
            <Skeleton variant="text" width="32px" height="20px" />
            <Skeleton variant="text" width="56px" height="12px" />
          </div>
        ))}
      </div>
    </div>
  );
};

import type { FC } from "react";
import { Skeleton } from "@/components/shared/Skeleton/Skeleton";
import styles from "./ProfileTabBarSkeleton.module.css";

export const ProfileTabBarSkeleton: FC = () => {
  return (
    <div className={styles.tabBar} aria-hidden="true">
      <div className={styles.tab}>
        <Skeleton variant="text" width="60px" height="14px" />
      </div>
      <div className={styles.tab}>
        <Skeleton variant="text" width="80px" height="14px" />
      </div>
    </div>
  );
};

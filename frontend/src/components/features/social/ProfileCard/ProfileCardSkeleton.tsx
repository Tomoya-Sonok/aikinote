import type { FC } from "react";
import { Skeleton } from "@/components/shared/Skeleton/Skeleton";
import styles from "./ProfileCardSkeleton.module.css";

export const ProfileCardSkeleton: FC = () => {
  return (
    <div className={styles.card} aria-hidden="true">
      <Skeleton variant="circle" width="120px" height="120px" />
      <div className={styles.fullName}>
        <Skeleton variant="text" width="160px" height="20px" />
      </div>
      <div className={styles.usernameSecondary}>
        <Skeleton variant="text" width="100px" height="14px" />
      </div>
      <div className={styles.dojoRankRow}>
        <Skeleton variant="text" width="80px" height="14px" />
        <Skeleton variant="text" width="40px" height="14px" />
      </div>
      <div className={styles.bio}>
        <Skeleton variant="text" width="100%" height="14px" />
        <Skeleton variant="text" width="80%" height="14px" />
      </div>
    </div>
  );
};

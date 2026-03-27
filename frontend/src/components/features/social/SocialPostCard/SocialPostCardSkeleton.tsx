"use client";

import type { FC } from "react";
import { Skeleton } from "@/components/shared/Skeleton/Skeleton";
import styles from "./SocialPostCardSkeleton.module.css";

export const SocialPostCardSkeleton: FC = () => {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <div key={i} className={styles.card} style={{ cursor: "default" }}>
          <div className={styles.authorHeader}>
            <Skeleton variant="circle" width="36px" height="36px" />
            <div className={styles.authorInfo}>
              <Skeleton variant="text" width="100px" height="14px" />
              <Skeleton variant="text" width="60px" height="12px" />
            </div>
          </div>
          <div className={styles.content}>
            <Skeleton variant="text" width="100%" height="14px" />
            <Skeleton variant="text" width="80%" height="14px" className="" />
          </div>
        </div>
      ))}
    </>
  );
};

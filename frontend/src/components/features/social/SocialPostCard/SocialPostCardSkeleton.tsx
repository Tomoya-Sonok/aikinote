"use client";

import type { FC } from "react";
import { Skeleton } from "@/components/shared/Skeleton/Skeleton";
import styles from "./SocialPostCardSkeleton.module.css";

interface SocialPostCardSkeletonProps {
  /** 表示するスケルトンカードの枚数。viewport を埋められる程度のデフォルト値にしている */
  count?: number;
}

// 実カード（SocialPostCard）と同じブロック構成にすることで、差し替え時の CLS を抑える
const SingleCard = () => (
  <div className={styles.card} style={{ cursor: "default" }}>
    <div className={styles.authorHeader}>
      <Skeleton variant="circle" width="36px" height="36px" />
      <div className={styles.authorInfo}>
        <Skeleton variant="text" width="100px" height="14px" />
        <Skeleton variant="text" width="60px" height="12px" />
      </div>
    </div>
    <div className={styles.content}>
      <Skeleton variant="text" width="100%" height="14px" />
      <Skeleton variant="text" width="80%" height="14px" />
    </div>
    <div className={styles.tags}>
      <Skeleton
        variant="rect"
        width="52px"
        height="21px"
        borderRadius="9999px"
      />
      <Skeleton
        variant="rect"
        width="40px"
        height="21px"
        borderRadius="9999px"
      />
    </div>
    <div className={styles.actions}>
      <Skeleton variant="rect" width="48px" height="20px" borderRadius="4px" />
      <Skeleton variant="rect" width="48px" height="20px" borderRadius="4px" />
      <Skeleton variant="rect" width="24px" height="20px" borderRadius="4px" />
    </div>
  </div>
);

export const SocialPostCardSkeleton: FC<SocialPostCardSkeletonProps> = ({
  count = 6,
}) => {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: スケルトンは静的プレースホルダーで並び替えなし
        <SingleCard key={i} />
      ))}
    </>
  );
};

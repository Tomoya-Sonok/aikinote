import type { FC } from "react";
import { Skeleton } from "@/components/shared/Skeleton";
import styles from "./TrainingCardSkeleton.module.css";

interface TrainingCardSkeletonProps {
  count?: number;
}

// 実カード（TrainingCard）と同じ header/tags/content/date の順序にすることで、差し替え時の CLS を抑える
const SingleCard = () => (
  <div className={styles.card}>
    <div className={styles.header}>
      <Skeleton variant="text" width="60%" height="16px" />
      <div className={styles.headerActions}>
        <Skeleton
          variant="rect"
          width="16px"
          height="16px"
          borderRadius="4px"
        />
        <Skeleton
          variant="rect"
          width="16px"
          height="16px"
          borderRadius="4px"
        />
      </div>
    </div>
    <div className={styles.tags}>
      <Skeleton
        variant="rect"
        width="48px"
        height="21px"
        borderRadius="9999px"
      />
      <Skeleton
        variant="rect"
        width="56px"
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
    <div className={styles.content}>
      <Skeleton variant="text" width="100%" height="12px" />
      <Skeleton variant="text" width="80%" height="12px" />
    </div>
    <div className={styles.date}>
      <Skeleton variant="text" width="80px" height="12px" />
    </div>
  </div>
);

export const TrainingCardSkeleton: FC<TrainingCardSkeletonProps> = ({
  count = 3,
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

import { SocialPostCardSkeleton } from "@/components/features/social/SocialPostCard/SocialPostCardSkeleton";
import { Skeleton } from "@/components/shared/Skeleton/Skeleton";
import styles from "./SocialPostsFeedSkeleton.module.css";

// Suspense fallback として PPR の static shell に含まれる前提のため、
// dynamic source を読まない sync 関数とする。
// SocialFeedHeader / SocialTabBar は Client Component なので、ここでは inline で
// 同寸法の DOM を再現して CLS を抑える。
export function SocialPostsFeedSkeleton() {
  return (
    <>
      <div className={styles.headerShell}>
        <Skeleton variant="circle" width="40px" height="40px" />
        <Skeleton variant="text" width="96px" height="16px" />
        <div className={styles.headerActions}>
          <Skeleton variant="circle" width="40px" height="40px" />
          <Skeleton variant="circle" width="40px" height="40px" />
        </div>
      </div>
      <div className={styles.desktopPageTitleWrapper} />
      <div className={styles.promoteBannerPlaceholder} />
      <div className={styles.tabBarShell}>
        {[0, 1, 2].map((i) => (
          <div key={i} className={styles.tabSlot}>
            <Skeleton variant="text" width="48px" height="14px" />
          </div>
        ))}
      </div>
      <div className={styles.feedContainer}>
        <SocialPostCardSkeleton count={6} />
      </div>
    </>
  );
}

import { SocialPostCardSkeleton } from "@/components/features/social/SocialPostCard/SocialPostCardSkeleton";
import { Skeleton } from "@/components/shared/Skeleton/Skeleton";
import styles from "./SocialPostsFeedSkeleton.module.css";

// SocialFeedHeader / SocialTabBar (Client) を fallback で直接呼ぶと createContext
// 連鎖が SSR module 評価で失敗するため、同寸法の DOM だけ inline で再現する
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

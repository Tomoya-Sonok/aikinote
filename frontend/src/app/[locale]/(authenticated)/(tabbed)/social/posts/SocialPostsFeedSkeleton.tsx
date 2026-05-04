import { SocialPostCardSkeleton } from "@/components/features/social/SocialPostCard/SocialPostCardSkeleton";
import { Skeleton } from "@/components/shared/Skeleton/Skeleton";
import styles from "./SocialPostsFeedSkeleton.module.css";

// SocialFeedHeader と TabNavigation は呼び出し側 page と (tabbed) layout が提供する。
// この fallback は main の中身（バナー + 3 タブ + 投稿カード）だけ再現する
export function SocialPostsFeedSkeleton() {
  return (
    <>
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

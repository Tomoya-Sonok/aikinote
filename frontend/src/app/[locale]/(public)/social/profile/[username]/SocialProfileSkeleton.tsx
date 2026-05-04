import { ProfileCardSkeleton } from "@/components/features/social/ProfileCard/ProfileCardSkeleton";
import { ProfileTabBarSkeleton } from "@/components/features/social/ProfileTabBar/ProfileTabBarSkeleton";
import { SocialPostCardSkeleton } from "@/components/features/social/SocialPostCard/SocialPostCardSkeleton";
import { Skeleton } from "@/components/shared/Skeleton/Skeleton";
import styles from "./SocialProfileSkeleton.module.css";
import { StatsCardSkeleton } from "./StatsCardSkeleton";

// SocialHeader (Button forwardRef 経由) を fallback で直接呼ぶと createContext 連鎖が
// SSR module 評価で失敗するため、同寸法の header DOM を inline で再現する
export function SocialProfileSkeleton() {
  return (
    <>
      <div className={styles.headerShell}>
        <span className={styles.headerSpacer} />
        <Skeleton variant="text" width="96px" height="16px" />
        <span className={styles.headerSpacer} />
      </div>
      <ProfileCardSkeleton />
      <StatsCardSkeleton />
      <ProfileTabBarSkeleton />
      <div className={styles.postsSection}>
        <SocialPostCardSkeleton count={3} />
      </div>
    </>
  );
}

import { ProfileCardSkeleton } from "@/components/features/social/ProfileCard/ProfileCardSkeleton";
import { ProfileTabBarSkeleton } from "@/components/features/social/ProfileTabBar/ProfileTabBarSkeleton";
import { SocialPostCardSkeleton } from "@/components/features/social/SocialPostCard/SocialPostCardSkeleton";
import { Skeleton } from "@/components/shared/Skeleton/Skeleton";
import styles from "./SocialProfileSkeleton.module.css";
import { StatsCardSkeleton } from "./StatsCardSkeleton";

// Suspense fallback として PPR の static shell に含まれる前提のため、
// dynamic source を読まない sync 関数とする。
// SocialHeader は Button (forwardRef) を内包しており Next.js 16 + Turbopack の
// SSR module 評価で createContext エラーを起こすため、ここでは inline で再現する。
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

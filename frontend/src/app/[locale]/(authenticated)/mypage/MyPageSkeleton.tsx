import { Skeleton } from "@/components/shared/Skeleton/Skeleton";
import styles from "./MyPageSkeleton.module.css";

// DefaultHeader / TabNavigation を fallback で直接呼ぶと createContext 連鎖が
// SSR module 評価で失敗するため、DOM 構造だけ inline で再現する
export function MyPageSkeleton() {
  return (
    <div className={styles.layout}>
      <div className={styles.headerShell}>
        <Skeleton variant="rect" width="56px" height="56px" />
        <div className={styles.headerActions}>
          <Skeleton variant="circle" width="40px" height="40px" />
          <Skeleton
            variant="rect"
            width="24px"
            height="24px"
            borderRadius="4px"
          />
        </div>
      </div>
      <div className={styles.contentWrapper}>
        <main className={styles.main}>
          <div className={styles.profileSection}>
            <Skeleton variant="circle" width="40px" height="40px" />
            <div className={styles.userInfo}>
              <Skeleton variant="text" width="120px" height="20px" />
              <Skeleton
                variant="rect"
                width="72px"
                height="32px"
                borderRadius="6px"
              />
            </div>
          </div>
          <div className={styles.detailsSection}>
            <div className={styles.detail}>
              <Skeleton variant="text" width="80px" height="14px" />
              <Skeleton variant="text" width="160px" height="16px" />
            </div>
            <div className={styles.detail}>
              <Skeleton variant="text" width="80px" height="14px" />
              <Skeleton variant="text" width="120px" height="16px" />
            </div>
          </div>
        </main>
      </div>
      <div className={styles.tabNavigationShell} />
    </div>
  );
}

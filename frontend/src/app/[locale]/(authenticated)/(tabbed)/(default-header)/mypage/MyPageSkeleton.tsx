import { Skeleton } from "@/components/shared/Skeleton/Skeleton";
import styles from "./MyPageSkeleton.module.css";

// Header / TabNavigation は (tabbed)/(default-header)/layout が常時提供しているため、
// この fallback は MyPageContent の中身だけを Skeleton 化する
export function MyPageSkeleton() {
  return (
    <>
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
    </>
  );
}

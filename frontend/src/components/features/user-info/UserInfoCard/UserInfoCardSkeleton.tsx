import { useTranslations } from "next-intl";
import type { FC } from "react";
import { Skeleton } from "@/components/shared/Skeleton";
import styles from "./UserInfoCardSkeleton.module.css";

export const UserInfoCardSkeleton: FC = () => {
  const t = useTranslations();

  return (
    <div>
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
          <span className={styles.label}>{t("userInfo.currentDojo")}</span>
          <Skeleton variant="text" width="160px" height="16px" />
        </div>
        <div className={styles.detail}>
          <span className={styles.label}>{t("userInfo.aikidoStartDate")}</span>
          <Skeleton variant="text" width="120px" height="16px" />
        </div>
      </div>
    </div>
  );
};

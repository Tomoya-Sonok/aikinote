import { useTranslations } from "next-intl";
import type { FC } from "react";
import { Button } from "@/components/shared/Button/Button";
import { ProfileImage } from "@/components/shared/ProfileImage/ProfileImage";
import styles from "./BasicInfoCard.module.css";

interface BasicInfoCardProps {
  username: string;
  dojoStyleName?: string;
  trainingStartDate?: string;
  profileImageUrl?: string | null;
  onEditClick: () => void;
}

export const BasicInfoCard: FC<BasicInfoCardProps> = ({
  username,
  dojoStyleName,
  trainingStartDate,
  profileImageUrl,
  onEditClick,
}) => {
  const t = useTranslations();
  const defaultNotEntered = t("basicInfo.notEntered");
  return (
    <div>
      <div className={styles.profileSection}>
        <ProfileImage
          src={profileImageUrl}
          size="small"
          alt={`${username}${t("basicInfo.profileImage")}`}
        />
        <div
          className={
            username.length > 18 ? styles.userInfo : styles.userInfoShort
          }
        >
          <h1 className={styles.username}>{username}</h1>
          <Button variant="primary" size="small" onClick={onEditClick}>
            {t("basicInfo.edit")}
          </Button>
        </div>
      </div>

      <div className={styles.detailsSection}>
        <div className={styles.detail}>
          <span className={styles.label}>{t("basicInfo.currentDojo")}</span>
          <span className={styles.value}>
            {dojoStyleName || defaultNotEntered}
          </span>
        </div>

        <div className={styles.detail}>
          <span className={styles.label}>{t("basicInfo.aikidoStartDate")}</span>
          <span className={styles.value}>
            {trainingStartDate || defaultNotEntered}
          </span>
        </div>
      </div>
    </div>
  );
};

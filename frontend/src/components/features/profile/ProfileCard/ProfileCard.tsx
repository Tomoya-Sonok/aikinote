import { useTranslations } from "next-intl";
import type { FC } from "react";
import { Button } from "@/components/shared/Button/Button";
import { ProfileImage } from "@/components/shared/ProfileImage/ProfileImage";
import styles from "./ProfileCard.module.css";

interface ProfileCardProps {
  username: string;
  dojoStyleName?: string;
  trainingStartDate?: string;
  profileImageUrl?: string | null;
  onEditClick: () => void;
}

export const ProfileCard: FC<ProfileCardProps> = ({
  username,
  dojoStyleName,
  trainingStartDate,
  profileImageUrl,
  onEditClick,
}) => {
  const t = useTranslations();
  const defaultNotEntered = t("profile.notEntered");
  return (
    <div>
      <div className={styles.profileSection}>
        <ProfileImage
          src={profileImageUrl}
          size="small"
          alt={`${username}${t("profile.profileImage")}`}
        />
        <div
          className={
            username.length > 10 ? styles.userInfo : styles.userInfoShort
          }
        >
          <h1 className={styles.username}>{username}</h1>
          <Button variant="primary" size="small" onClick={onEditClick}>
            {t("profile.edit")}
          </Button>
        </div>
      </div>

      <div className={styles.detailsSection}>
        <div className={styles.detail}>
          <span className={styles.label}>{t("profile.currentDojo")}</span>
          <span className={styles.value}>
            {dojoStyleName || defaultNotEntered}
          </span>
        </div>

        <div className={styles.detail}>
          <span className={styles.label}>{t("profile.aikidoStartDate")}</span>
          <span className={styles.value}>
            {trainingStartDate || defaultNotEntered}
          </span>
        </div>
      </div>
    </div>
  );
};

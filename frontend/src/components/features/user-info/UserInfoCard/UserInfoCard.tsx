import { useTranslations } from "next-intl";
import type { FC } from "react";
import { Button } from "@/components/shared/Button/Button";
import { ProfileImage } from "@/components/shared/ProfileImage/ProfileImage";
import styles from "./UserInfoCard.module.css";

interface UserInfoCardProps {
  username: string;
  dojoStyleName?: string;
  aikidoRank?: string;
  profileImageUrl?: string | null;
  onEditClick: () => void;
}

export const UserInfoCard: FC<UserInfoCardProps> = ({
  username,
  dojoStyleName,
  aikidoRank,
  profileImageUrl,
  onEditClick,
}) => {
  const t = useTranslations();
  const defaultNotEntered = t("userInfo.notEntered");
  return (
    <div>
      <div className={styles.profileSection}>
        <ProfileImage
          src={profileImageUrl}
          size="small"
          alt={`${username}${t("userInfo.profileImage")}`}
        />
        <div
          className={
            username.length > 18 ? styles.userInfo : styles.userInfoShort
          }
        >
          <h1 className={styles.username}>{username}</h1>
          <Button variant="primary" size="small" onClick={onEditClick}>
            {t("userInfo.edit")}
          </Button>
        </div>
      </div>

      <div className={styles.detailsSection}>
        <div className={styles.detail}>
          <span className={styles.label}>{t("userInfo.currentDojo")}</span>
          <span className={styles.value}>
            {dojoStyleName || defaultNotEntered}
          </span>
        </div>

        <div className={styles.detail}>
          <span className={styles.label}>{t("userInfo.rank")}</span>
          <span className={styles.value}>
            {aikidoRank || defaultNotEntered}
          </span>
        </div>
      </div>
    </div>
  );
};

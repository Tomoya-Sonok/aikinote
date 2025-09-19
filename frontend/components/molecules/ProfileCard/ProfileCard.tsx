import type { FC } from "react";
import { Button } from "@/components/atoms/Button/Button";
import { ProfileImage } from "@/components/atoms/ProfileImage/ProfileImage";
import styles from "./ProfileCard.module.css";

interface ProfileCardProps {
  username: string;
  trainingDescription?: string;
  mood?: string;
  profileImageUrl?: string | null;
  onEditClick: () => void;
  className?: string;
}

export const ProfileCard: FC<ProfileCardProps> = ({
  username,
  trainingDescription = "未設定",
  mood = "未設定",
  profileImageUrl,
  onEditClick,
  className = "",
}) => {
  return (
    <div className={`${styles.card} ${className}`}>
      <div className={styles.profileSection}>
        <ProfileImage
          src={profileImageUrl}
          size="small"
          alt={`${username}のプロフィール画像`}
        />
        <div className={styles.userInfo}>
          <h1 className={styles.username}>{username}</h1>
          <Button variant="secondary" size="small" onClick={onEditClick}>
            編集する
          </Button>
        </div>
      </div>

      <div className={styles.detailsSection}>
        <div className={styles.detail}>
          <span className={styles.label}>現在所属している道場（流派）</span>
          <span className={styles.value}>{trainingDescription}</span>
        </div>

        <div className={styles.detail}>
          <span className={styles.label}>合気道を始めたのはいつ？</span>
          <span className={styles.value}>{mood}</span>
        </div>
      </div>
    </div>
  );
};

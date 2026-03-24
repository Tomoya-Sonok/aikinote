import type { FC } from "react";
import { ProfileImage } from "@/components/shared/ProfileImage/ProfileImage";
import styles from "./ProfileCard.module.css";

interface ProfileCardProps {
  profileImageUrl: string | null;
  fullName: string | null;
  username: string;
  dojoStyleName: string | null;
  aikidoRank: string | null;
  bio: string | null;
}

export const ProfileCard: FC<ProfileCardProps> = ({
  profileImageUrl,
  fullName,
  username,
  dojoStyleName,
  aikidoRank,
  bio,
}) => {
  const hasFullName = !!fullName;

  return (
    <div className={styles.card}>
      <ProfileImage src={profileImageUrl} size="large" />

      {hasFullName && <h2 className={styles.fullName}>{fullName}</h2>}

      <span
        className={hasFullName ? styles.usernameSecondary : styles.username}
      >
        {username}
      </span>

      {(dojoStyleName || aikidoRank) && (
        <div className={styles.dojoRankRow}>
          {dojoStyleName && (
            <span className={styles.dojo}>{dojoStyleName}</span>
          )}
          {aikidoRank && <span className={styles.rank}>{aikidoRank}</span>}
        </div>
      )}

      {bio && (
        <p className={styles.bio} style={{ whiteSpace: "pre-line" }}>
          {bio}
        </p>
      )}
    </div>
  );
};

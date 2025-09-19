import Image from "next/image";
import Link from "next/link";
import type { FC } from "react";
import type { UserSession } from "@/lib/auth";
import styles from "./DefaultHeader.module.css";

interface DefaultHeaderProps {
  user: UserSession | null;
  showUserSection?: boolean;
  showSettings?: boolean;
  settingsHref?: string;
}

const FALLBACK_AVATAR_LABEL = "?";

export const DefaultHeader: FC<DefaultHeaderProps> = ({
  user,
  showUserSection = true,
  showSettings = true,
  settingsHref = "/settings",
}) => {
  const avatarLabel = user?.username?.[0]?.toUpperCase() ?? FALLBACK_AVATAR_LABEL;

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.logoLink} aria-label="ホームに移動">
        <Image
          src="/images/aikinote-logo.png"
          alt="AikiNote"
          width={56}
          height={56}
          priority
          className={styles.logo}
        />
      </Link>

      <div className={styles.headerRight}>
        {showUserSection && (
          <div className={styles.userSection}>
            {user?.profile_image_url ? (
              <Image
                src={user.profile_image_url}
                alt={`${user.username}のアイコン`}
                width={40}
                height={40}
                className={styles.avatarImage}
                unoptimized
              />
            ) : (
              <div className={styles.avatarFallback} aria-hidden="true">
                {avatarLabel}
              </div>
            )}
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.username ?? "ゲスト"}</span>
              {user?.email && <span className={styles.userEmail}>{user.email}</span>}
            </div>
          </div>
        )}

        {showSettings && (
          <Link
            href={settingsHref}
            className={styles.settingsButton}
            aria-label="設定を開く"
          >
            <Image
              src="/icons/settings-icon.svg"
              alt="設定"
              width={20}
              height={20}
              className={styles.settingsIcon}
            />
          </Link>
        )}
      </div>
    </header>
  );
};

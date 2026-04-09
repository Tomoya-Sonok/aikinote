"use client";

import { BellIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import type { FC } from "react";
import { SocialHeader } from "@/components/shared/layouts/SocialLayout";
import { ProfileImage } from "@/components/shared/ProfileImage/ProfileImage";
import { useAuth } from "@/lib/hooks/useAuth";
import { useUnreadNotificationCount } from "@/lib/hooks/useUnreadNotificationCount";
import { Link } from "@/lib/i18n/routing";
import styles from "./SocialFeedHeader.module.css";

interface SocialFeedHeaderProps {
  profileImageUrl?: string | null;
}

export const SocialFeedHeader: FC<SocialFeedHeaderProps> = ({
  profileImageUrl,
}) => {
  const t = useTranslations("socialPosts");
  const { user } = useAuth();
  const unreadCount = useUnreadNotificationCount(user?.id);

  return (
    <SocialHeader>
      <Link
        href={`/social/profile/${user?.id ?? ""}`}
        className={styles.profileLink}
        aria-label={t("profile")}
      >
        <ProfileImage src={profileImageUrl} size="small" />
      </Link>
      <h1 className={styles.title}>{t("title")}</h1>
      <div className={styles.rightActions}>
        <Link
          href="/social/notifications"
          className={styles.iconLink}
          aria-label={t("notifications")}
        >
          <BellIcon size={24} weight="regular" />
          {unreadCount > 0 && <span className={styles.badge} />}
        </Link>
        <Link
          href="/social/posts/search"
          className={styles.iconLink}
          aria-label={t("search")}
        >
          <MagnifyingGlassIcon size={24} weight="regular" />
        </Link>
      </div>
    </SocialHeader>
  );
};

"use client";

import {
  BellIcon,
  ChatsIcon,
  IdentificationCardIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
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
  const tNav = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const { user } = useAuth();
  const unreadCount = useUnreadNotificationCount(user?.id);

  const getActiveTab = () => {
    const localePrefix = `/${locale}`;
    const normalizedPath = pathname.startsWith(localePrefix)
      ? pathname.slice(localePrefix.length) || "/"
      : pathname;

    if (normalizedPath.startsWith("/personal")) return "personal";
    if (normalizedPath.startsWith("/social")) return "social";
    if (normalizedPath.startsWith("/mypage")) return "mypage";
    return "social";
  };

  const activeTab = getActiveTab();

  return (
    <SocialHeader>
      <Link
        href={`/social/profile/${user?.username ?? ""}`}
        className={styles.profileLink}
        aria-label={t("profile")}
      >
        <ProfileImage src={profileImageUrl} size="small" />
      </Link>
      <h1 className={styles.title}>{t("title")}</h1>
      <div className={styles.rightActions}>
        <nav className={styles.desktopNav}>
          <Link
            href={`/${locale}/personal/pages`}
            className={`${styles.desktopNavLink} ${activeTab === "personal" ? styles.desktopNavLinkActive : ""}`}
          >
            <PencilSimpleIcon size={18} weight="light" />
            {tNav("components.personal")}
          </Link>
          <Link
            href={`/${locale}/social/posts`}
            className={`${styles.desktopNavLink} ${activeTab === "social" ? styles.desktopNavLinkActive : ""}`}
          >
            <ChatsIcon size={18} weight="light" />
            {tNav("components.group")}
          </Link>
          <Link
            href={`/${locale}/mypage`}
            className={`${styles.desktopNavLink} ${activeTab === "mypage" ? styles.desktopNavLinkActive : ""}`}
          >
            <IdentificationCardIcon size={18} weight="light" />
            {tNav("components.mypage")}
          </Link>
        </nav>
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

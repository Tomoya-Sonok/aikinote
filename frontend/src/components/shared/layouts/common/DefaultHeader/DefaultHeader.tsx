"use client";

import {
  ChatsIcon,
  IdentificationCardIcon,
  ListIcon,
  PencilSimpleIcon,
  UserIcon,
} from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { FC } from "react";
import { useEffect, useRef, useState } from "react";
import { NavigationDrawer } from "@/components/shared/NavigationDrawer";
import type { UserSession } from "@/lib/auth";
import { useTooltipVisibility } from "@/lib/hooks/useTooltipVisibility";
import { useUmamiTrack } from "@/lib/hooks/useUmamiTrack";
import { useUnreadNotificationCount } from "@/lib/hooks/useUnreadNotificationCount";
import styles from "./DefaultHeader.module.css";

interface DefaultHeaderProps {
  user: UserSession | null;
  showUserSection?: boolean;
  showSettings?: boolean;
  settingsHref?: string;
  showTooltip?: boolean;
}

export const DefaultHeader: FC<DefaultHeaderProps> = ({
  user,
  showUserSection = true,
  showSettings = true,
  settingsHref: _settingsHref = "/settings",
  showTooltip = false,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProfileCardOpen, setIsProfileCardOpen] = useState(false);
  const profileCardRef = useRef<HTMLDivElement>(null);
  const { shouldShowTooltip, hideTooltip } = useTooltipVisibility();
  const tooltipId = "font-size-tooltip";
  const isTooltipVisible = showTooltip && shouldShowTooltip;
  const locale = useLocale();
  const t = useTranslations();
  const { track } = useUmamiTrack();

  const pathname = usePathname();
  const unreadCount = useUnreadNotificationCount(user?.id);

  const getActiveTab = () => {
    const localePrefix = `/${locale}`;
    const normalizedPath = pathname.startsWith(localePrefix)
      ? pathname.slice(localePrefix.length) || "/"
      : pathname;

    if (normalizedPath.startsWith("/personal")) return "personal";
    if (normalizedPath.startsWith("/social")) return "social";
    if (normalizedPath.startsWith("/mypage")) return "mypage";
    return "personal";
  };

  const activeTab = getActiveTab();

  const handleSettingsClick = () => {
    hideTooltip();
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  const handleDrawerItemClick = (trackEvent: string) => {
    track(trackEvent);
  };

  useEffect(() => {
    if (!isTooltipVisible || typeof window === "undefined") {
      return;
    }

    const handleHideTooltip = () => {
      hideTooltip();
    };

    const handleDocumentClick = () => {
      hideTooltip();
    };

    const scrollOptions: AddEventListenerOptions = { passive: true };

    window.addEventListener("scroll", handleHideTooltip, scrollOptions);
    window.addEventListener("resize", handleHideTooltip);
    document.addEventListener("click", handleDocumentClick);

    return () => {
      window.removeEventListener("scroll", handleHideTooltip, scrollOptions);
      window.removeEventListener("resize", handleHideTooltip);
      document.removeEventListener("click", handleDocumentClick);
    };
  }, [hideTooltip, isTooltipVisible]);

  useEffect(() => {
    if (!isProfileCardOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        profileCardRef.current &&
        !profileCardRef.current.contains(event.target as Node)
      ) {
        setIsProfileCardOpen(false);
      }
    }

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isProfileCardOpen]);

  const homeHref = `/${locale}`;

  return (
    <header className={styles.header} data-testid="default-header">
      <Link
        href={homeHref}
        className={styles.logoLink}
        aria-label="ホームに移動"
      >
        <Image
          src="/images/shared/aikinote_logo.png"
          alt="AikiNote"
          width={56}
          height={56}
          priority
          className={styles.logo}
        />
      </Link>

      <div className={styles.headerRight}>
        <nav className={styles.desktopNav}>
          <Link
            href={`/${locale}/personal/pages`}
            className={`${styles.desktopNavLink} ${activeTab === "personal" ? styles.desktopNavLinkActive : ""}`}
          >
            <PencilSimpleIcon size={18} weight="light" />
            {t("components.personal")}
          </Link>
          <Link
            href={`/${locale}/social/posts`}
            className={`${styles.desktopNavLink} ${activeTab === "social" ? styles.desktopNavLinkActive : ""}`}
          >
            <ChatsIcon size={18} weight="light" />
            {t("components.group")}
            {unreadCount > 0 && <span className={styles.desktopNavBadge} />}
          </Link>
          <Link
            href={`/${locale}/mypage`}
            className={`${styles.desktopNavLink} ${activeTab === "mypage" ? styles.desktopNavLinkActive : ""}`}
          >
            <IdentificationCardIcon size={18} weight="light" />
            {t("components.mypage")}
          </Link>
        </nav>

        {showUserSection && user && (
          <div ref={profileCardRef} className={styles.profileCardWrapper}>
            <button
              type="button"
              className={styles.avatarButton}
              onClick={() => setIsProfileCardOpen((prev) => !prev)}
              aria-label="プロフィールを表示"
              aria-expanded={isProfileCardOpen}
            >
              {user.profile_image_url ? (
                <Image
                  src={user.profile_image_url}
                  alt={`${user.username}のアイコン`}
                  width={40}
                  height={40}
                  className={styles.avatarImage}
                  sizes="40px"
                />
              ) : (
                <UserIcon
                  size={40}
                  weight="light"
                  color="var(--black)"
                  className={styles.avatarFallback}
                />
              )}
            </button>
            {isProfileCardOpen && (
              <div
                className={styles.profileCard}
                role="dialog"
                aria-label="プロフィール情報"
              >
                <Link
                  href={`/${locale}/mypage`}
                  className={styles.profileCardLink}
                  onClick={() => setIsProfileCardOpen(false)}
                >
                  {user.profile_image_url ? (
                    <Image
                      src={user.profile_image_url}
                      alt={`${user.username}のアイコン`}
                      width={48}
                      height={48}
                      className={styles.profileCardAvatar}
                      sizes="48px"
                    />
                  ) : (
                    <UserIcon
                      size={48}
                      weight="light"
                      color="var(--black)"
                      className={styles.profileCardAvatarFallback}
                    />
                  )}
                  <div className={styles.profileCardInfo}>
                    <span className={styles.profileCardName}>
                      {user.username}
                    </span>
                    {(user.dojo_style_name || user.aikido_rank) && (
                      <span className={styles.profileCardDojoRank}>
                        {user.dojo_style_name}
                        {user.dojo_style_name && user.aikido_rank && " "}
                        {user.aikido_rank}
                      </span>
                    )}
                    {user.full_name && (
                      <span className={styles.profileCardFullName}>
                        {user.full_name}
                      </span>
                    )}
                  </div>
                </Link>
                <div className={styles.profileCardFooter}>
                  <Link
                    href={`/${locale}/profile/edit`}
                    className={styles.profileCardEditLink}
                    onClick={() => {
                      track("default_header_start_edit_profile");
                      setIsProfileCardOpen(false);
                    }}
                  >
                    <PencilSimpleIcon size={14} weight="bold" />
                    {t("navigation.editProfile")}
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {showSettings && (
          <div className={styles.settingsWrapper}>
            <button
              type="button"
              onClick={handleSettingsClick}
              className={styles.settingsButton}
              aria-label="メニューを開く"
              aria-describedby={isTooltipVisible ? tooltipId : undefined}
            >
              <ListIcon size={24} weight="light" color="var(--black)" />
            </button>
            {isTooltipVisible && (
              <button
                type="button"
                id={tooltipId}
                className={styles.fontSizeTooltip}
                onClick={(event) => {
                  event.stopPropagation();
                  hideTooltip();
                }}
                aria-label={t("navigation.fontSizeTooltip")}
              >
                {t("navigation.fontSizeTooltip")}
              </button>
            )}
          </div>
        )}
      </div>

      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        onItemClick={handleDrawerItemClick}
      />
    </header>
  );
};

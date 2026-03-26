"use client";

import { ListIcon, PencilSimpleIcon, UserIcon } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { FC } from "react";
import { useEffect, useRef, useState } from "react";
import { NavigationDrawer } from "@/components/shared/NavigationDrawer";
import type { UserSession } from "@/lib/auth";
import { useTooltipVisibility } from "@/lib/hooks/useTooltipVisibility";
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

  const handleSettingsClick = () => {
    hideTooltip();
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  const handleTextSizeClick = () => {
    setIsDrawerOpen(false);
    window.location.href = `/${locale}/settings/font-size`;
  };

  const handleEmailClick = () => {
    setIsDrawerOpen(false);
    window.location.href = `/${locale}/settings/email`;
  };

  const handleLanguageClick = () => {
    setIsDrawerOpen(false);
    window.location.href = `/${locale}/settings/language`;
  };

  const handleTagManagementClick = () => {
    setIsDrawerOpen(false);
    window.location.href = `/${locale}/settings/tags`;
  };

  const handlePublicityClick = () => {
    setIsDrawerOpen(false);
    window.location.href = `/${locale}/settings/publicity`;
  };

  const handleSubscriptionClick = () => {
    setIsDrawerOpen(false);
    window.location.href = `/${locale}/settings/subscription`;
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
                  unoptimized
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
                      unoptimized
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
                    onClick={() => setIsProfileCardOpen(false)}
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
        onEmailClick={handleEmailClick}
        onTextSizeClick={handleTextSizeClick}
        onLanguageClick={handleLanguageClick}
        onTagManagementClick={handleTagManagementClick}
        onPublicityClick={handlePublicityClick}
        onSubscriptionClick={handleSubscriptionClick}
      />
    </header>
  );
};

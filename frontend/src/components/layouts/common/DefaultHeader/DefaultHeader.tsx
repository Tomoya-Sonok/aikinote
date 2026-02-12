"use client";

import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { FC } from "react";
import { useEffect, useState } from "react";
import { DefaultProfileIcon } from "@/components/atoms/icons/DefaultProfileIcon";
import { NavigationDrawer } from "@/components/molecules/NavigationDrawer";
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

  const handleProfileEditClick = () => {
    setIsDrawerOpen(false);
    window.location.href = `/${locale}/profile/edit`;
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

  const homeHref = `/${locale}`;

  return (
    <header className={styles.header}>
      <Link
        href={homeHref}
        className={styles.logoLink}
        aria-label="ホームに移動"
      >
        <Image
          src="/images/aikinote_logo.png"
          alt="AikiNote"
          width={56}
          height={56}
          priority
          className={styles.logo}
        />
      </Link>

      <div className={styles.headerRight}>
        {showUserSection && user && (
          <div className={styles.userSection}>
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
              <DefaultProfileIcon size={40} className={styles.avatarFallback} />
            )}
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user.username}</span>
              {user.dojo_style_name && (
                <span className={styles.userDojoStyleName}>
                  {user.dojo_style_name}
                </span>
              )}
            </div>
          </div>
        )}

        {showSettings && (
          <div className={styles.settingsWrapper}>
            <button
              type="button"
              onClick={handleSettingsClick}
              className={styles.settingsButton}
              aria-label="設定を開く"
              aria-describedby={isTooltipVisible ? tooltipId : undefined}
            >
              <Image
                src="/icons/settings-icon.svg"
                alt="設定"
                width={20}
                height={20}
                className={styles.settingsIcon}
              />
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
        onProfileEditClick={handleProfileEditClick}
        onEmailClick={handleEmailClick}
        onTextSizeClick={handleTextSizeClick}
        onLanguageClick={handleLanguageClick}
        onTagManagementClick={handleTagManagementClick}
      />
    </header>
  );
};

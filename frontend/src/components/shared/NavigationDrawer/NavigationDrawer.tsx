"use client";

import { XIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import type { FC } from "react";
import { useEffect } from "react";
import { PlanBadge } from "@/components/features/setting/SettingsMenu/PlanBadge";
import { SettingItem } from "@/components/shared/SettingItem/SettingItem";
import { useSubscription } from "@/lib/hooks/useSubscription";
import styles from "./NavigationDrawer.module.css";

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onItemClick?: (trackEvent: string) => void;
}

export const NavigationDrawer: FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  onItemClick,
}) => {
  const t = useTranslations();
  const { isPremium, loading } = useSubscription();

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleClick = (trackEvent: string) => {
    onClose();
    onItemClick?.(trackEvent);
  };

  return (
    <>
      <button
        type="button"
        className={styles.overlay}
        aria-label={t("navigation.close")}
        onClick={onClose}
      />

      <div className={`${styles.drawer} ${isOpen ? styles.open : ""}`}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t("navigation.settings")}</h2>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeButton}
            aria-label={t("navigation.close")}
          >
            <XIcon size={20} weight="light" />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.menu}>
            <SettingItem
              href="/settings/subscription"
              onClick={() =>
                handleClick("default_header_navigation_settings_subscription")
              }
            >
              {t("navigation.subscription")}
              {!loading && <PlanBadge isPremium={isPremium} />}
            </SettingItem>
            <SettingItem
              href="/settings/publicity"
              onClick={() =>
                handleClick("default_header_navigation_settings_publicity")
              }
            >
              {t("navigation.publicity")}
            </SettingItem>
            <SettingItem
              href="/settings/tags"
              onClick={() =>
                handleClick("default_header_navigation_settings_tags")
              }
            >
              {t("navigation.tagManagement")}
            </SettingItem>
            <SettingItem
              href="/settings/email"
              onClick={() =>
                handleClick("default_header_navigation_settings_email")
              }
            >
              {t("navigation.email")}
            </SettingItem>
            <SettingItem
              href="/settings/font-size"
              onClick={() =>
                handleClick("default_header_navigation_settings_font_size")
              }
            >
              {t("navigation.fontSize")}
            </SettingItem>
            <SettingItem
              href="/settings/language"
              onClick={() =>
                handleClick("default_header_navigation_settings_language")
              }
            >
              {t("navigation.language")}
            </SettingItem>
            <SettingItem
              href="/settings/push-notification"
              onClick={() =>
                handleClick(
                  "default_header_navigation_settings_push_notification",
                )
              }
            >
              {t("navigation.pushNotification")}
            </SettingItem>
          </div>
        </div>
      </div>
    </>
  );
};

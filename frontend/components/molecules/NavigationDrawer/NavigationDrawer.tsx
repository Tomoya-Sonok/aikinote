"use client";

import { useTranslations } from "next-intl";
import type { FC } from "react";
import { useEffect } from "react";
import { SettingItem } from "@/components/atoms/SettingItem/SettingItem";
import styles from "./NavigationDrawer.module.css";

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileEditClick: () => void;
  onEmailClick: () => void;
  onTextSizeClick: () => void;
  onLanguageClick: () => void;
}

export const NavigationDrawer: FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  onProfileEditClick,
  onEmailClick,
  onTextSizeClick,
  onLanguageClick,
}) => {
  const t = useTranslations();
  // ESCキーでドロワーを閉じる
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // スクロールを無効化
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* オーバーレイ */}
      <button
        type="button"
        className={styles.overlay}
        aria-label={t("navigation.close")}
        onClick={onClose}
      />

      {/* ドロワー本体 */}
      <div className={`${styles.drawer} ${isOpen ? styles.open : ""}`}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t("navigation.settings")}</h2>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeButton}
            aria-label={t("navigation.close")}
          >
            ×
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.menu}>
            <SettingItem onClick={onProfileEditClick}>
              {t("navigation.profileEdit")}
            </SettingItem>
            <SettingItem onClick={onEmailClick}>
              {t("navigation.email")}
            </SettingItem>
            <SettingItem onClick={onTextSizeClick}>
              {t("navigation.fontSize")}
            </SettingItem>
            <SettingItem onClick={onLanguageClick}>
              {t("navigation.language")}
            </SettingItem>
          </div>
        </div>
      </div>
    </>
  );
};

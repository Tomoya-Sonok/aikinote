"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { FC } from "react";
import { SettingItem } from "@/components/shared/SettingItem/SettingItem";
import styles from "./OtherMenu.module.css";

interface OtherMenuProps {
  onHelpClick: () => void;
  onLogoutClick: () => void;
  className?: string;
}

export const OtherMenu: FC<OtherMenuProps> = ({
  onHelpClick,
  onLogoutClick,
  className = "",
}) => {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();

  return (
    <div className={`${styles.menu} ${className}`}>
      <SettingItem onClick={() => router.push(`/${locale}/terms`)}>
        {t("legal.termsOfService")}
      </SettingItem>
      <SettingItem onClick={() => router.push(`/${locale}/privacy`)}>
        {t("legal.privacyPolicy")}
      </SettingItem>
      <SettingItem onClick={() => router.push(`/${locale}/tokushoho`)}>
        {t("legal.tokushoho")}
      </SettingItem>
      <SettingItem onClick={onHelpClick}>
        {t("components.helpContact")}
      </SettingItem>
      <SettingItem onClick={() => router.push(`/${locale}/account-deletion`)}>
        {t("legal.accountDeletion")}
      </SettingItem>
      <SettingItem onClick={onLogoutClick} variant="danger">
        {t("components.logout")}
      </SettingItem>
    </div>
  );
};

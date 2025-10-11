"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { FC } from "react";
import { SettingItem } from "@/components/atoms/SettingItem/SettingItem";
import styles from "./SettingsMenu.module.css";

interface SettingsMenuProps {
  onPublicityClick: () => void;
  onEmailClick: () => void;
  className?: string;
}

export const SettingsMenu: FC<SettingsMenuProps> = ({
  // onPublicityClick, 初期リリース時は「公開範囲」をスコープアウト
  onEmailClick,
  className = "",
}) => {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();

  return (
    <div className={`${styles.menu} ${className}`}>
      {/* 初期リリース時は「公開範囲」をスコープアウト */}
      {/* <SettingItem onClick={onPublicityClick}>公開範囲</SettingItem> */}
      <SettingItem onClick={() => router.push(`/${locale}/settings/tags`)}>
        {t("tagManagement.title")}
      </SettingItem>
      <SettingItem onClick={onEmailClick}>{t("settings.email")}</SettingItem>
      <SettingItem onClick={() => router.push(`/${locale}/settings/font-size`)}>
        {t("fontSize.title")}
      </SettingItem>
      <SettingItem onClick={() => router.push(`/${locale}/settings/language`)}>
        {t("language.label")}
      </SettingItem>
    </div>
  );
};

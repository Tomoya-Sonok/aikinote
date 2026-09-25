"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { type FC, useEffect } from "react";
import { SettingItem } from "@/components/shared/SettingItem/SettingItem";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { PlanBadge } from "./PlanBadge";
import styles from "./SettingsMenu.module.css";

const SETTINGS_PATHS = [
  "subscription",
  "publicity",
  "tags",
  "email",
  "font-size",
  "language",
  "push-notification",
  "blocked-users",
] as const;

interface SettingsMenuProps {
  className?: string;
}

export const SettingsMenu: FC<SettingsMenuProps> = ({ className = "" }) => {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const { isPremium, loading } = useSubscription();

  // 各設定画面をタップした瞬間に表示できるよう、メニュー表示時に先読みしておく
  useEffect(() => {
    for (const path of SETTINGS_PATHS) {
      router.prefetch(`/${locale}/settings/${path}`);
    }
  }, [router, locale]);

  return (
    <div className={`${styles.menu} ${className}`}>
      <SettingItem
        onClick={() => router.push(`/${locale}/settings/subscription`)}
      >
        {t("navigation.subscription")}
        {!loading && <PlanBadge isPremium={isPremium} />}
      </SettingItem>
      <SettingItem onClick={() => router.push(`/${locale}/settings/publicity`)}>
        {t("publicitySetting.title")}
      </SettingItem>
      <SettingItem onClick={() => router.push(`/${locale}/settings/tags`)}>
        {t("tagManagement.title")}
      </SettingItem>
      <SettingItem onClick={() => router.push(`/${locale}/settings/email`)}>
        {t("settings.email")}
      </SettingItem>
      <SettingItem onClick={() => router.push(`/${locale}/settings/font-size`)}>
        {t("fontSize.title")}
      </SettingItem>
      <SettingItem onClick={() => router.push(`/${locale}/settings/language`)}>
        {t("language.label")}
      </SettingItem>
      <SettingItem
        onClick={() => router.push(`/${locale}/settings/push-notification`)}
      >
        {t("navigation.pushNotification")}
      </SettingItem>
      <SettingItem
        onClick={() => router.push(`/${locale}/settings/blocked-users`)}
      >
        {t("settings.blockedUsers")}
      </SettingItem>
    </div>
  );
};

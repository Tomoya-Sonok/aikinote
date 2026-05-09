"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { FC } from "react";
import { SettingItem } from "@/components/shared/SettingItem/SettingItem";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { PlanBadge } from "./PlanBadge";
import styles from "./SettingsMenu.module.css";

interface SettingsMenuProps {
  className?: string;
}

export const SettingsMenu: FC<SettingsMenuProps> = ({ className = "" }) => {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const { isPremium, loading } = useSubscription();

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

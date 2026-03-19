"use client";

import type { Icon } from "@phosphor-icons/react";
import {
  ChatsIcon,
  IdentificationCardIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { FC } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useUnreadNotificationCount } from "@/lib/hooks/useUnreadNotificationCount";
import styles from "./TabNavigation.module.css";

interface TabItem {
  id: string;
  label: string;
  icon: Icon;
  href: string;
  badge?: number;
}

// tabsは動的に生成されるようにする

export const TabNavigation: FC = () => {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const unreadCount = useUnreadNotificationCount(user?.id);

  const tabs: TabItem[] = [
    {
      id: "personal",
      label: t("components.personal"),
      icon: PencilSimpleIcon,
      href: `/${locale}/personal/pages`,
    },
    {
      id: "social",
      label: t("components.group"),
      icon: ChatsIcon,
      href: `/${locale}/social/posts`,
      badge: unreadCount,
    },
    {
      id: "mypage",
      label: t("components.mypage"),
      icon: IdentificationCardIcon,
      href: `/${locale}/mypage`,
    },
  ];

  // 現在のパスからアクティブなタブを判定
  const getActiveTab = () => {
    const localePrefix = `/${locale}`;
    const normalizedPath = pathname.startsWith(localePrefix)
      ? pathname.slice(localePrefix.length) || "/"
      : pathname;

    if (normalizedPath.startsWith("/personal")) return "personal";
    if (normalizedPath.startsWith("/social")) return "social";
    if (normalizedPath.startsWith("/mypage")) return "mypage";
    return "personal"; // デフォルト
  };

  const activeTab = getActiveTab();

  const handleTabChange = (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (tab) {
      router.push(tab.href);
    }
  };

  return (
    <div className={styles.tabContainer}>
      {tabs.map((tab) => {
        const IconComponent = tab.icon;
        return (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ""}`}
            onClick={() => handleTabChange(tab.id)}
            type="button"
          >
            <div className={styles.tabContent}>
              <div className={styles.iconWrapper}>
                <IconComponent
                  size={24}
                  weight="light"
                  color="var(--black)"
                  className={styles.icon}
                />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={styles.badge} />
                )}
              </div>
              <span className={styles.label}>{tab.label}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

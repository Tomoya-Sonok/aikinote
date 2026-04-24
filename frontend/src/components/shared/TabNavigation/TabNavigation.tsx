"use client";

import type { Icon } from "@phosphor-icons/react";
import {
  ChatsIcon,
  IdentificationCardIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { FC } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useUnreadNotificationCount } from "@/lib/hooks/useUnreadNotificationCount";
import { Link } from "@/lib/i18n/routing";
import styles from "./TabNavigation.module.css";

interface TabItem {
  id: string;
  label: string;
  icon: Icon;
  href: "/personal/pages" | "/social/posts" | "/mypage";
  badge?: number;
}

export const TabNavigation: FC = () => {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const { user } = useAuth();
  const unreadCount = useUnreadNotificationCount(user?.id);

  // next-intl の Link は locale プレフィックスを自動付与するので、href はプレフィックスなしで渡す
  const tabs: TabItem[] = [
    {
      id: "personal",
      label: t("components.personal"),
      icon: PencilSimpleIcon,
      href: "/personal/pages",
    },
    {
      id: "social",
      label: t("components.group"),
      icon: ChatsIcon,
      href: "/social/posts",
      badge: unreadCount,
    },
    {
      id: "mypage",
      label: t("components.mypage"),
      icon: IdentificationCardIcon,
      href: "/mypage",
    },
  ];

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

  return (
    <div className={styles.tabContainer} data-testid="tab-navigation">
      {tabs.map((tab) => {
        const IconComponent = tab.icon;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            // next-intl の Link は next/link を内部利用しており、viewport 内の Link は自動で prefetch される。
            // 常時画面下部に固定されているのでマウント直後から RSC payload が warm になり、タブ切替が即時化される
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ""}`}
          >
            <div className={styles.tabContent}>
              <div className={styles.iconWrapper}>
                <IconComponent
                  size={24}
                  weight="light"
                  className={styles.icon}
                />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={styles.badge} />
                )}
              </div>
              <span className={styles.label}>{tab.label}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
};

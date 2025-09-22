"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { FC } from "react";
import styles from "./TabNavigation.module.css";

interface TabItem {
  id: string;
  label: string;
  icon: string;
  href: string;
}

// tabsは動的に生成されるようにする

export const TabNavigation: FC = () => {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const tabs: TabItem[] = [
    {
      id: "personal",
      label: t("components.personal"),
      icon: "/icons/edit-icon.svg",
      href: `/${locale}/personal/pages`,
    },
    {
      id: "social",
      label: t("components.group"),
      icon: "/icons/message-chat-icon.svg",
      href: `/${locale}/social/posts`,
    },
    {
      id: "mypage",
      label: t("components.mypage"),
      icon: "/icons/user-profile-icon.svg",
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
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`${styles.tab} ${activeTab === tab.id ? styles.active : ""}`}
          onClick={() => handleTabChange(tab.id)}
          type="button"
        >
          <div className={styles.tabContent}>
            <Image
              src={tab.icon}
              alt={tab.label}
              width={32}
              height={32}
              className={styles.icon}
            />
            <span className={styles.label}>{tab.label}</span>
          </div>
        </button>
      ))}
    </div>
  );
};

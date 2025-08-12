"use client";

import type { FC } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import styles from "./TabNavigation.module.css";

interface TabItem {
  id: string;
  label: string;
  icon: string;
  href: string;
}

const tabs: TabItem[] = [
  {
    id: "personal",
    label: "ひとりで",
    icon: "/icons/edit-icon.svg",
    href: "/personal/pages",
  },
  {
    id: "social",
    label: "みんなで",
    icon: "/icons/message-chat-icon.svg",
    href: "/social/posts",
  },
  {
    id: "mypage",
    label: "マイページ",
    icon: "/icons/user-profile-icon.svg",
    href: "/mypage",
  },
];

export const TabNavigation: FC = () => {
  const router = useRouter();
  const pathname = usePathname();

  // 現在のパスからアクティブなタブを判定
  const getActiveTab = () => {
    if (pathname.startsWith("/personal")) return "personal";
    if (pathname.startsWith("/social")) return "social";
    if (pathname.startsWith("/mypage")) return "mypage";
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

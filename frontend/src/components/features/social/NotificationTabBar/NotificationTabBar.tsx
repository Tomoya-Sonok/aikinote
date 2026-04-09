"use client";

import { useTranslations } from "next-intl";
import type { FC } from "react";
import type { NotificationTab } from "@/lib/hooks/useNotifications";
import styles from "./NotificationTabBar.module.css";

interface NotificationTabBarProps {
  activeTab: NotificationTab;
  onTabChange: (tab: NotificationTab) => void;
  swipeProgress?: number;
}

const TABS: NotificationTab[] = ["all", "reply", "favorite"];

const TAB_KEYS: Record<NotificationTab, string> = {
  all: "notificationTabAll",
  reply: "notificationTabReply",
  favorite: "notificationTabFavorite",
};

export const NotificationTabBar: FC<NotificationTabBarProps> = ({
  activeTab,
  onTabChange,
  swipeProgress = 0,
}) => {
  const t = useTranslations("socialPosts");
  const activeIndex = TABS.indexOf(activeTab);

  const TAB_WIDTH_RATIO = 100 / 0.6;
  const indicatorX = (activeIndex - swipeProgress) * TAB_WIDTH_RATIO;
  const isDragging = swipeProgress !== 0;

  return (
    <div className={styles.tabBar} role="tablist">
      {TABS.map((tab) => (
        <button
          key={tab}
          role="tab"
          type="button"
          aria-selected={activeTab === tab}
          className={`${styles.tab} ${activeTab === tab ? styles.active : ""}`}
          onClick={() => onTabChange(tab)}
        >
          {t(TAB_KEYS[tab])}
        </button>
      ))}
      <div
        className={`${styles.indicator} ${!isDragging ? styles.indicatorAnimated : ""}`}
        style={{ transform: `translateX(${indicatorX}%)` }}
        aria-hidden="true"
      />
    </div>
  );
};

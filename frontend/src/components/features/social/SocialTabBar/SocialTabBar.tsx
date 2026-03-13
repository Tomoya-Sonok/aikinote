"use client";

import { useTranslations } from "next-intl";
import type { FC } from "react";
import styles from "./SocialTabBar.module.css";

export type SocialTab = "all" | "training" | "favorites";

interface SocialTabBarProps {
  activeTab: SocialTab;
  onTabChange: (tab: SocialTab) => void;
}

const TABS: SocialTab[] = ["all", "training", "favorites"];

const TAB_KEYS: Record<SocialTab, string> = {
  all: "tabAll",
  training: "tabTraining",
  favorites: "tabFavorites",
};

export const SocialTabBar: FC<SocialTabBarProps> = ({
  activeTab,
  onTabChange,
}) => {
  const t = useTranslations("socialPosts");

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
    </div>
  );
};

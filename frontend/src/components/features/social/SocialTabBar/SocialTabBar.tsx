"use client";

import { useTranslations } from "next-intl";
import type { FC } from "react";
import styles from "./SocialTabBar.module.css";

export type SocialTab = "all" | "training" | "favorites";

interface SocialTabBarProps {
  activeTab: SocialTab;
  onTabChange: (tab: SocialTab) => void;
  /** スワイプ進捗: 0=現在タブ中央, 負=次タブ方向, 正=前タブ方向 */
  swipeProgress?: number;
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
  swipeProgress = 0,
}) => {
  const t = useTranslations("socialPosts");
  const activeIndex = TABS.indexOf(activeTab);

  // translateX(%)はインジケーター自身の幅基準。タブ幅(33.33%)分移動するには
  // タブ幅/インジケーター幅 = (1/3) / (1/3 * 0.6) = 1/0.6 ≈ 166.67% の倍率が必要
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

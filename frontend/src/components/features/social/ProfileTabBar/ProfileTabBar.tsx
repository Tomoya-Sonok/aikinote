"use client";

import { useTranslations } from "next-intl";
import type { FC } from "react";
import styles from "./ProfileTabBar.module.css";

export type ProfileTab = "posts" | "training";

interface ProfileTabBarProps {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
  /** スワイプ進捗: 0=現在タブ中央, 負=次タブ方向, 正=前タブ方向 */
  swipeProgress?: number;
}

const TABS: ProfileTab[] = ["posts", "training"];

const TAB_KEYS: Record<ProfileTab, string> = {
  posts: "profileTabPosts",
  training: "profileTabTraining",
};

export const ProfileTabBar: FC<ProfileTabBarProps> = ({
  activeTab,
  onTabChange,
  swipeProgress = 0,
}) => {
  const t = useTranslations("socialPosts");
  const activeIndex = TABS.indexOf(activeTab);

  // translateX(%) はインジケーター自身の幅基準。タブ幅(50%)分移動するには
  // タブ幅/インジケーター幅 = (1/2) / (1/2 * 0.6) = 1/0.6 ≈ 166.67% の倍率が必要
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

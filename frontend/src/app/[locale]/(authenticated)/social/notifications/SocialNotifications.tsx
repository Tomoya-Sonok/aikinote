"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { NotificationList } from "@/components/features/social/NotificationList/NotificationList";
import { NotificationTabBar } from "@/components/features/social/NotificationTabBar/NotificationTabBar";
import { RefetchErrorBanner } from "@/components/shared/RefetchErrorBanner/RefetchErrorBanner";
import { markNotificationsRead } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  type NotificationTab,
  useNotifications,
} from "@/lib/hooks/useNotifications";
import { useSwipeNavigation } from "@/lib/hooks/useSwipeNavigation";
import styles from "./SocialNotifications.module.css";

const TABS: NotificationTab[] = ["all", "reply", "favorite"];

export function SocialNotifications() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as NotificationTab) || "all";
  const [activeTab, setActiveTab] = useState<NotificationTab>(
    TABS.includes(initialTab) ? initialTab : "all",
  );
  const markedReadRef = useRef(false);

  const {
    notifications,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    isRefetchError,
  } = useNotifications(activeTab, user?.id);

  const handleTabChange = useCallback((newTab: string) => {
    const tab = newTab as NotificationTab;
    setActiveTab(tab);
    const url = new URL(window.location.href);
    if (tab === "all") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", tab);
    }
    window.history.replaceState(null, "", url.toString());
    return true;
  }, []);

  const { containerRef, handlers, swipeProgress } = useSwipeNavigation({
    tabs: TABS,
    activeTab,
    onTabChange: handleTabChange,
  });

  useEffect(() => {
    if (!user?.id || markedReadRef.current) return;
    markedReadRef.current = true;
    void markNotificationsRead({ markAll: true });
  }, [user?.id]);

  // ヘッダー（MinimalLayout）は page.tsx 側で描画する（静的シェルに残すため）
  return (
    <>
      <NotificationTabBar
        activeTab={activeTab}
        onTabChange={(tab) => handleTabChange(tab)}
        swipeProgress={swipeProgress}
      />
      <div ref={containerRef} {...handlers} className={styles.feedContainer}>
        {isRefetchError && notifications.length > 0 && <RefetchErrorBanner />}
        <NotificationList
          notifications={notifications}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          loadMore={loadMore}
        />
      </div>
    </>
  );
}

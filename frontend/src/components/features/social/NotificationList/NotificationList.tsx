"use client";

import { useTranslations } from "next-intl";
import { type FC, useCallback, useEffect, useRef } from "react";
import type { NotificationItemData } from "@/lib/hooks/useNotifications";
import { isWithinDeleteDisplayWindow } from "@/lib/utils/notificationUtils";
import { NotificationItem } from "../NotificationItem/NotificationItem";
import styles from "./NotificationList.module.css";

interface NotificationListProps {
  notifications: NotificationItemData[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
}

function shouldShowNotification(n: NotificationItemData): boolean {
  if (!n.reply_is_deleted) return true;
  if (!n.reply_deleted_at) return false;
  return isWithinDeleteDisplayWindow(n.reply_deleted_at);
}

export const NotificationList: FC<NotificationListProps> = ({
  notifications,
  isLoading,
  isLoadingMore,
  hasMore,
  loadMore,
}) => {
  const t = useTranslations("socialPosts");
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting && hasMore && !isLoadingMore) {
        loadMore();
      }
    },
    [hasMore, isLoadingMore, loadMore],
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: "200px",
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleIntersect]);

  const visibleNotifications = notifications.filter(shouldShowNotification);

  if (isLoading) {
    return (
      <div className={styles.container}>
        {["s1", "s2", "s3", "s4", "s5"].map((id) => (
          <div key={id} className={styles.skeleton}>
            <div className={styles.skeletonAvatar} />
            <div className={styles.skeletonContent}>
              <div className={styles.skeletonLine} />
              <div className={styles.skeletonLineShort} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (visibleNotifications.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyText}>{t("notificationsEmpty")}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {visibleNotifications.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} />
      ))}
      {hasMore && <div ref={sentinelRef} className={styles.sentinel} />}
      {isLoadingMore && (
        <div className={styles.loadingMore}>
          <div className={styles.spinner} />
        </div>
      )}
    </div>
  );
};

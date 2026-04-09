"use client";

import { CaretRightIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import type { FC } from "react";
import { ProfileImage } from "@/components/shared/ProfileImage/ProfileImage";
import type { NotificationItemData } from "@/lib/hooks/useNotifications";
import { Link } from "@/lib/i18n/routing";
import { formatToRelativeTime } from "@/lib/utils/dateUtils";
import { isWithinDeleteDisplayWindow } from "@/lib/utils/notificationUtils";
import styles from "./NotificationItem.module.css";

interface NotificationItemProps {
  notification: NotificationItemData;
}

function getNotificationKey(
  type: string,
  replyIsDeleted: boolean | null,
  replyDeletedAt: string | null,
): string {
  if (
    replyIsDeleted &&
    replyDeletedAt &&
    isWithinDeleteDisplayWindow(replyDeletedAt)
  ) {
    return "notificationReplyDeleted";
  }

  switch (type) {
    case "favorite":
      return "notificationFavorite";
    case "favorite_reply":
      return "notificationFavoriteReply";
    case "reply":
      return "notificationReply";
    case "reply_to_thread":
      return "notificationReplyToThread";
    default:
      return "notificationReply";
  }
}

export const NotificationItem: FC<NotificationItemProps> = ({
  notification,
}) => {
  const t = useTranslations("socialPosts");
  const actorName = notification.actor?.username ?? "???";
  const translationKey = getNotificationKey(
    notification.type,
    notification.reply_is_deleted,
    notification.reply_deleted_at,
  );
  const message = t(translationKey, { name: actorName });
  const isDeleted =
    notification.reply_is_deleted &&
    notification.reply_deleted_at &&
    isWithinDeleteDisplayWindow(notification.reply_deleted_at);

  if (!notification.post_id) return null;

  return (
    <Link
      href={`/social/posts/${notification.post_id}`}
      className={`${styles.item} ${notification.is_read ? styles.read : ""} ${isDeleted ? styles.deleted : ""}`}
    >
      <div className={styles.avatar}>
        <ProfileImage
          src={notification.actor?.profile_image_url}
          size="small"
          className={isDeleted ? styles.avatarFaded : ""}
        />
      </div>
      <div className={styles.content}>
        <p className={styles.message}>{message}</p>
        <span className={styles.timestamp}>
          {formatToRelativeTime(notification.created_at)}
        </span>
      </div>
      <CaretRightIcon
        size={16}
        weight="bold"
        className={styles.caret}
        aria-hidden="true"
      />
    </Link>
  );
};

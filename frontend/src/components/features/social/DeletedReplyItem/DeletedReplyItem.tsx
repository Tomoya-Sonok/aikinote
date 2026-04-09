"use client";

import { useTranslations } from "next-intl";
import type { FC } from "react";
import { ProfileImage } from "@/components/shared/ProfileImage/ProfileImage";
import { formatToRelativeTime } from "@/lib/utils/dateUtils";
import styles from "./DeletedReplyItem.module.css";

interface DeletedReplyData {
  id: string;
  updated_at: string;
  user: {
    id: string;
    username: string;
    profile_image_url: string | null;
  };
}

interface DeletedReplyItemProps {
  reply: DeletedReplyData;
}

export const DeletedReplyItem: FC<DeletedReplyItemProps> = ({ reply }) => {
  const t = useTranslations("socialPosts");

  return (
    <div className={styles.container}>
      <div className={styles.avatar}>
        <ProfileImage
          src={reply.user.profile_image_url}
          size="small"
          className={styles.avatarFaded}
        />
      </div>
      <div className={styles.content}>
        <p className={styles.message}>
          {t("notificationReplyDeleted", { name: reply.user.username })}
        </p>
        <span className={styles.timestamp}>
          {formatToRelativeTime(reply.updated_at)}
        </span>
      </div>
    </div>
  );
};

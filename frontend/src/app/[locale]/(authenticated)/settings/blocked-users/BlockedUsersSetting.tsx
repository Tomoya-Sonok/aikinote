"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/shared/Button/Button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog/ConfirmDialog";
import { Loader } from "@/components/shared/Loader/Loader";
import { MinimalLayout } from "@/components/shared/layouts/MinimalLayout";
import { ProfileImage } from "@/components/shared/ProfileImage/ProfileImage";
import { useToast } from "@/contexts/ToastContext";
import {
  type BlockedUserListItem,
  getBlockedUsers,
  unblockUser,
} from "@/lib/api/client";
import styles from "./BlockedUsersSetting.module.css";

interface BlockedUsersSettingProps {
  locale: string;
}

export function BlockedUsersSetting({ locale }: BlockedUsersSettingProps) {
  const t = useTranslations();
  const { showToast } = useToast();
  const [items, setItems] = useState<BlockedUserListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingUnblock, setPendingUnblock] =
    useState<BlockedUserListItem | null>(null);
  const [isUnblocking, setIsUnblocking] = useState(false);

  const fetchList = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getBlockedUsers();
      setItems(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleUnblockConfirm = useCallback(async () => {
    if (!pendingUnblock) return;
    setIsUnblocking(true);
    try {
      await unblockUser(pendingUnblock.blocked_user_id);
      showToast(t("socialPosts.unblockSuccess"), "success");
      setPendingUnblock(null);
      await fetchList();
    } catch {
      showToast(t("socialPosts.unblockFailed"), "error");
    } finally {
      setIsUnblocking(false);
    }
  }, [pendingUnblock, fetchList, showToast, t]);

  return (
    <MinimalLayout
      headerTitle={t("settings.blockedUsers")}
      backHref={`/${locale}/mypage`}
    >
      <div className={styles.container}>
        <p className={styles.description}>
          {t("settings.blockedUsersDescription")}
        </p>
        {isLoading ? (
          <Loader centered size="medium" />
        ) : items.length === 0 ? (
          <p className={styles.empty}>{t("settings.blockedUsersEmpty")}</p>
        ) : (
          <ul className={styles.list}>
            {items.map((item) => (
              <li key={item.id} className={styles.item}>
                <a
                  href={`/${locale}/social/profile/${item.blocked_user.username}`}
                  className={styles.userLink}
                >
                  <ProfileImage
                    src={item.blocked_user.profile_image_url}
                    size="small"
                  />
                  <span className={styles.username}>
                    {item.blocked_user.username || t("settings.blockedUsers")}
                  </span>
                </a>
                <Button
                  size="small"
                  onClick={() => setPendingUnblock(item)}
                  aria-label={t("settings.unblockButton")}
                >
                  {t("settings.unblockButton")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        isOpen={pendingUnblock !== null}
        title={t("socialPosts.unblockConfirmTitle")}
        message={t("socialPosts.unblockConfirmMessage")}
        confirmLabel={t("socialPosts.menuUnblock")}
        cancelLabel={t("socialPosts.editCancel")}
        onConfirm={handleUnblockConfirm}
        onCancel={() => setPendingUnblock(null)}
        isProcessing={isUnblocking}
      />
    </MinimalLayout>
  );
}

"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
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
import { useAuth } from "@/lib/hooks/useAuth";
import styles from "./BlockedUsersSetting.module.css";

export const blockedUsersQueryKey = (userId: string | undefined) =>
  ["blocked-users", userId] as const;

interface BlockedUsersSettingProps {
  locale: string;
}

export function BlockedUsersSetting({ locale }: BlockedUsersSettingProps) {
  const t = useTranslations();
  const { showToast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const listKey = blockedUsersQueryKey(user?.id);
  // キャッシュがあれば即表示し、他の画面でのブロックも反映できるよう開くたびに裏で取り直す
  const listQuery = useQuery({
    queryKey: listKey,
    enabled: !!user?.id,
    refetchOnMount: "always",
    queryFn: getBlockedUsers,
  });
  const items: BlockedUserListItem[] = listQuery.data ?? [];
  const isLoading = !listQuery.data && !listQuery.error;
  const [pendingUnblock, setPendingUnblock] =
    useState<BlockedUserListItem | null>(null);
  const [isUnblocking, setIsUnblocking] = useState(false);

  const handleUnblockConfirm = useCallback(async () => {
    if (!pendingUnblock) return;
    setIsUnblocking(true);
    const previous = queryClient.getQueryData<BlockedUserListItem[]>(listKey);
    // API の完了を待たずに一覧から外す（失敗したら元に戻す）
    queryClient.setQueryData<BlockedUserListItem[]>(listKey, (prev) =>
      (prev ?? []).filter((item) => item.id !== pendingUnblock.id),
    );
    try {
      await unblockUser(pendingUnblock.blocked_user_id);
      // 解除したユーザーの投稿がフィード・プロフィールに再び出るよう、キャッシュを無効化する
      void queryClient.invalidateQueries({ queryKey: ["social-feed"] });
      void queryClient.invalidateQueries({ queryKey: ["social-profile"] });
      showToast(t("socialPosts.unblockSuccess"), "success");
      setPendingUnblock(null);
    } catch {
      if (previous) queryClient.setQueryData(listKey, previous);
      showToast(t("socialPosts.unblockFailed"), "error");
    } finally {
      setIsUnblocking(false);
    }
  }, [pendingUnblock, queryClient, listKey, showToast, t]);

  return (
    <MinimalLayout
      headerTitle={t("settings.blockedUsers")}
      backHref={`/${locale}/mypage`}
      forceBackHref
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
                <div className={styles.userInfo}>
                  <ProfileImage
                    src={item.blocked_user.profile_image_url}
                    size="small"
                  />
                  <span className={styles.username}>
                    {item.blocked_user.username || t("settings.blockedUsers")}
                  </span>
                </div>
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

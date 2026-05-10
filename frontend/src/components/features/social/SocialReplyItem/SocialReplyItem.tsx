"use client";

import { DotsThreeVerticalIcon, HeartIcon } from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { type FC, memo, useCallback, useEffect, useRef, useState } from "react";

const ReportModal = dynamic(
  () =>
    import("@/components/features/social/ReportModal/ReportModal").then(
      (m) => m.ReportModal,
    ),
  { ssr: false },
);

import { Button } from "@/components/shared/Button/Button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog/ConfirmDialog";
import { ProfileImage } from "@/components/shared/ProfileImage/ProfileImage";
import { formatToRelativeTime } from "@/lib/utils/dateUtils";
import { linkifyText } from "@/lib/utils/linkifyText";
import styles from "./SocialReplyItem.module.css";

interface ReplyUser {
  id: string;
  username: string;
  profile_image_url: string | null;
}

interface ReplyData {
  id: string;
  user_id: string;
  content: string;
  favorite_count: number;
  created_at: string;
  updated_at?: string;
  user: ReplyUser;
  is_favorited: boolean;
}

interface SocialReplyItemProps {
  reply: ReplyData;
  currentUserId: string;
  isAuthenticated?: boolean;
  onReport: (
    replyId: string,
    reason: "spam" | "harassment" | "inappropriate" | "impersonation" | "other",
    detail?: string,
  ) => void;
  onEdit: (replyId: string, newContent: string) => Promise<void>;
  onDelete: (replyId: string) => Promise<void>;
  onFavoriteToggle: (replyId: string) => void;
  onUnauthenticatedAction?: () => void;
  /**
   * 返信投稿者をブロックするハンドラ。指定された場合のみメニューに「ブロックする」項目を追加。
   * Apple App Review Guideline 1.2 (UGC) 対応。
   */
  onBlock?: (blockedUserId: string, username: string) => void;
}

export const SocialReplyItem: FC<SocialReplyItemProps> = memo(
  function SocialReplyItem({
    reply,
    currentUserId,
    isAuthenticated = true,
    onReport,
    onEdit,
    onDelete,
    onFavoriteToggle,
    onUnauthenticatedAction,
    onBlock,
  }) {
    const t = useTranslations("socialPosts");
    const locale = useLocale();
    const profileHref = `/${locale}/social/profile/${reply.user.username}`;
    const handleUnauthenticatedProfileClick = useCallback(() => {
      onUnauthenticatedAction?.();
    }, [onUnauthenticatedAction]);
    const isOwner = reply.user_id === currentUserId;
    const [showMenu, setShowMenu] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState("");
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const isEdited =
      reply.updated_at &&
      reply.created_at &&
      reply.updated_at !== reply.created_at;

    useEffect(() => {
      if (!showMenu) return;
      const handleClickOutside = (e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          setShowMenu(false);
        }
      };
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }, [showMenu]);

    const handleReportSubmit = useCallback(
      (
        reason:
          | "spam"
          | "harassment"
          | "inappropriate"
          | "impersonation"
          | "other",
        detail?: string,
      ) => {
        onReport(reply.id, reason, detail);
        setShowReportModal(false);
      },
      [onReport, reply.id],
    );

    const handleStartEdit = useCallback(() => {
      setEditContent(reply.content);
      setIsEditing(true);
      setShowMenu(false);
    }, [reply.content]);

    const handleCancelEdit = useCallback(() => {
      setIsEditing(false);
      setEditContent("");
    }, []);

    const handleSaveEdit = useCallback(async () => {
      if (!editContent.trim() || isSavingEdit) return;
      setIsSavingEdit(true);
      try {
        await onEdit(reply.id, editContent.trim());
        setIsEditing(false);
      } finally {
        setIsSavingEdit(false);
      }
    }, [editContent, isSavingEdit, onEdit, reply.id]);

    const handleDeleteClick = useCallback(() => {
      setShowMenu(false);
      setShowDeleteConfirm(true);
    }, []);

    const handleDeleteConfirm = useCallback(async () => {
      setIsDeleting(true);
      try {
        await onDelete(reply.id);
      } finally {
        setIsDeleting(false);
        setShowDeleteConfirm(false);
      }
    }, [onDelete, reply.id]);

    return (
      <div className={styles.reply}>
        {isAuthenticated ? (
          <a href={profileHref} className={styles.authorLink}>
            <ProfileImage src={reply.user.profile_image_url} size="small" />
          </a>
        ) : (
          <button
            type="button"
            className={styles.authorButton}
            onClick={handleUnauthenticatedProfileClick}
          >
            <ProfileImage src={reply.user.profile_image_url} size="small" />
          </button>
        )}
        <div className={styles.replyContent}>
          <div className={styles.replyHeader}>
            {isAuthenticated ? (
              <a href={profileHref} className={styles.authorNameLink}>
                {reply.user.username}
              </a>
            ) : (
              <button
                type="button"
                className={styles.authorNameButton}
                onClick={handleUnauthenticatedProfileClick}
              >
                {reply.user.username}
              </button>
            )}
            <span className={styles.timestamp}>
              {formatToRelativeTime(reply.created_at)}
            </span>
            {isEdited && (
              <span className={styles.editedLabel}>{t("edited")}</span>
            )}
            {isAuthenticated && (
              <div className={styles.menuWrapper} ref={menuRef}>
                <Button
                  className={styles.menuButton}
                  onClick={() => setShowMenu((prev) => !prev)}
                  aria-label="メニュー"
                >
                  <DotsThreeVerticalIcon size={16} weight="bold" />
                </Button>
                {showMenu && (
                  <div className={styles.menuDropdown}>
                    {isOwner ? (
                      <>
                        <button
                          type="button"
                          className={styles.menuItem}
                          onClick={handleStartEdit}
                        >
                          {t("menuEdit")}
                        </button>
                        <button
                          type="button"
                          className={`${styles.menuItem} ${styles.menuItemDanger}`}
                          onClick={handleDeleteClick}
                        >
                          {t("menuDelete")}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className={styles.menuItem}
                          onClick={() => {
                            setShowMenu(false);
                            setShowReportModal(true);
                          }}
                        >
                          {t("menuReport")}
                        </button>
                        {onBlock && (
                          <button
                            type="button"
                            className={styles.menuItem}
                            onClick={() => {
                              setShowMenu(false);
                              onBlock(reply.user_id, reply.user.username);
                            }}
                          >
                            {t("menuBlock")}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {isEditing ? (
            <div className={styles.editSection}>
              <textarea
                className={styles.editTextarea}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value.slice(0, 1000))}
                rows={3}
                maxLength={1000}
              />
              <div className={styles.editActions}>
                <Button size="small" onClick={handleCancelEdit}>
                  {t("editCancel")}
                </Button>
                <Button
                  variant="primary"
                  size="small"
                  onClick={handleSaveEdit}
                  disabled={!editContent.trim() || isSavingEdit}
                >
                  {isSavingEdit ? "..." : t("editSave")}
                </Button>
              </div>
            </div>
          ) : (
            <p className={styles.text}>{linkifyText(reply.content)}</p>
          )}

          <div className={styles.replyActions}>
            <Button
              className={`${styles.favoriteButton} ${reply.is_favorited ? styles.favorited : ""}`}
              onClick={() =>
                isAuthenticated
                  ? onFavoriteToggle(reply.id)
                  : onUnauthenticatedAction?.()
              }
              aria-label={t("favorite")}
            >
              <HeartIcon
                size={16}
                weight={reply.is_favorited ? "fill" : "regular"}
              />
              {isOwner && reply.favorite_count > 0 && (
                <span>{reply.favorite_count}</span>
              )}
            </Button>
          </div>
        </div>

        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          onSubmit={handleReportSubmit}
          title={t("reportReplyTitle")}
        />

        <ConfirmDialog
          isOpen={showDeleteConfirm}
          title={t("deleteReplyConfirm")}
          message=""
          confirmLabel="削除"
          cancelLabel="キャンセル"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(false)}
          isProcessing={isDeleting}
        />
      </div>
    );
  },
);

"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AttachmentCard } from "@/components/features/personal/AttachmentCard/AttachmentCard";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog/ConfirmDialog";
import { PremiumUpgradeModal } from "@/components/shared/PremiumUpgradeModal/PremiumUpgradeModal";
import { Skeleton } from "@/components/shared/Skeleton";
import { Tag } from "@/components/shared/Tag/Tag";
import { useToast } from "@/contexts/ToastContext";
import { deletePage, togglePageVisibility } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { usePageDetailData } from "@/lib/hooks/usePageDetailData";
import { useRequireOnline } from "@/lib/hooks/useRequireOnline";
import { useSubscription } from "@/lib/hooks/useSubscription";

import { useRouter } from "@/lib/i18n/routing";
import { linkifyText } from "@/lib/utils/linkifyText";
import { getNetworkAwareErrorMessage } from "@/lib/utils/offlineError";
import styles from "./page.module.css";

export function PageDetail() {
  const t = useTranslations();
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const pageId = params.page_id as string;
  const queryClient = useQueryClient();

  const {
    loading,
    pageData,
    setPageData,
    attachments,
    isErrorWithoutCache,
    refetch,
  } = usePageDetailData(pageId);

  const { showToast } = useToast();
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeletingPage, setDeletingPage] = useState(false);
  const [isTogglingPublic, setTogglingPublic] = useState(false);
  const { isPremium } = useSubscription();
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const isOnline = useOnlineStatus();
  const requireOnline = useRequireOnline();

  const handleBackToList = () => {
    router.push("/personal/pages");
  };

  const handleTogglePublic = async () => {
    if (!pageData || !user?.id || isTogglingPublic) return;

    // 公開切替は Supabase 必須操作。オフライン時は Toast で案内して中断
    if (!requireOnline()) return;

    // Free ユーザーが ON にしようとした場合は PremiumUpgradeModal を表示
    if (!pageData.is_public && !isPremium) {
      setShowPremiumModal(true);
      return;
    }

    const newValue = !pageData.is_public;
    const previousPageData = pageData;

    // 楽観的更新: 即座にUI反映
    setPageData({ ...pageData, is_public: newValue });
    showToast(
      newValue ? t("pageDetail.publicEnabled") : t("pageDetail.publicDisabled"),
      "success",
    );

    setTogglingPublic(true);
    try {
      await togglePageVisibility(pageData.id, user.id, newValue);
      // 一覧の is_public 表示を最新化（楽観的更新は page-detail のみ反映済み）
      queryClient.invalidateQueries({ queryKey: ["training-pages"] });
    } catch (error) {
      // ロールバック
      setPageData(previousPageData);
      showToast(
        getNetworkAwareErrorMessage(error, t("pageDetail.publicToggleFailed")),
        "error",
      );
    } finally {
      setTogglingPublic(false);
    }
  };

  const handleEdit = () => {
    if (!pageData) return;
    router.push(`/personal/pages/${pageId}/edit`);
  };

  const handleDelete = () => {
    if (!pageData) {
      return;
    }
    setDeleteDialogOpen(true);
  };

  const handleCancelDelete = () => {
    if (isDeletingPage) {
      return;
    }
    setDeleteDialogOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!pageData) {
      setDeleteDialogOpen(false);
      return;
    }

    if (!user?.id) {
      showToast(t("personalPages.loginRequired"), "error");
      return;
    }

    setDeletingPage(true);

    try {
      const response = await deletePage(pageData.id, user.id);

      if (response.success) {
        // 削除した行が一覧で staleTime=2 分間残らないよう無効化
        queryClient.invalidateQueries({ queryKey: ["training-pages"] });
        setDeleteDialogOpen(false);
        router.push("/personal/pages");
      } else {
        throw new Error(response.error || t("pageDetail.deleteFailed"));
      }
    } catch (error) {
      console.error("Failed to delete page:", error);
      showToast(
        getNetworkAwareErrorMessage(error, t("pageDetail.deleteFailed")),
        "error",
      );
    } finally {
      setDeletingPage(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.contentArea}>
          {/* ヘッダー部分 */}
          <div className={styles.header}>
            <Skeleton variant="text" width="80%" height="24px" />
            <Skeleton variant="text" width="50%" height="24px" />
            <div className={styles.tagsContainer}>
              <Skeleton
                variant="rect"
                width="48px"
                height="24px"
                borderRadius="9999px"
              />
              <Skeleton
                variant="rect"
                width="56px"
                height="24px"
                borderRadius="9999px"
              />
              <Skeleton
                variant="rect"
                width="52px"
                height="24px"
                borderRadius="9999px"
              />
              <Skeleton
                variant="rect"
                width="60px"
                height="24px"
                borderRadius="9999px"
              />
            </div>
          </div>

          {/* 内容セクション */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>{t("pageDetail.content")}</h2>
            <div className={styles.divider} />
            <div className={styles.skeletonContent}>
              <Skeleton variant="text" width="100%" height="14px" />
              <Skeleton variant="text" width="100%" height="14px" />
              <Skeleton variant="text" width="90%" height="14px" />
              <Skeleton variant="text" width="95%" height="14px" />
              <Skeleton variant="text" width="60%" height="14px" />
            </div>
          </div>

          {/* アクションボタン */}
          <div className={styles.buttonsContainer}>
            <button
              type="button"
              className={styles.backButton}
              onClick={handleBackToList}
            >
              {t("pageDetail.backToList")}
            </button>
            <button type="button" className={styles.editButton} disabled>
              {t("pageDetail.edit")}
            </button>
            <button type="button" className={styles.deleteButton} disabled>
              {t("pageDetail.delete")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!pageData) {
    // キャッシュもなくフェッチに失敗した場合はオフライン想定のメッセージを出す
    const message = isErrorWithoutCache
      ? "オフラインのため読み込めませんでした。ネットワーク接続後に再試行してください。"
      : t("pageDetail.notFound");
    return (
      <div className={styles.container}>
        <div className={styles.contentArea}>
          <div className={styles.notFound}>{message}</div>
          <div className={styles.buttonsContainer}>
            {isErrorWithoutCache && (
              <button
                type="button"
                className={styles.backButton}
                onClick={() => refetch()}
              >
                再試行
              </button>
            )}
            <button
              type="button"
              className={styles.backButton}
              onClick={handleBackToList}
            >
              {t("pageDetail.backToList")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const trainingContent = pageData.content;

  return (
    <div className={styles.container}>
      <div className={styles.contentArea}>
        {/* ヘッダー部分 */}
        <div className={styles.header}>
          <h1 className={styles.title}>{pageData.title}</h1>

          {/* タグ表示 */}
          <div className={styles.tagsContainer}>
            {pageData.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        </div>

        {/* 内容セクション */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>{t("pageDetail.content")}</h2>
          <div className={styles.divider} />
          <div className={styles.content}>{linkifyText(trainingContent)}</div>
        </div>

        {/* 添付ファイルセクション */}
        {attachments.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              {t("pageModal.attachments.title")}
            </h2>
            <div className={styles.divider} />
            <div className={styles.attachmentsList}>
              {attachments.map((attachment) => (
                <AttachmentCard
                  key={attachment.id}
                  attachment={attachment}
                  showDeleteButton={false}
                />
              ))}
            </div>
          </div>
        )}

        {/* 公開範囲設定 (Supabase 必須操作なのでオフライン時は disabled) */}
        <div className={styles.publicToggle}>
          <label className={styles.toggleLabel}>
            <span>{t("pageDetail.publicToggle")}</span>
            <button
              type="button"
              role="switch"
              aria-checked={pageData.is_public}
              aria-disabled={!isOnline}
              className={`${styles.toggle} ${pageData.is_public ? styles.toggleOn : ""}`}
              onClick={handleTogglePublic}
              disabled={!isOnline || isTogglingPublic}
              title={
                !isOnline ? t("offlineGuard.actionRequiresNetwork") : undefined
              }
            >
              <span className={styles.toggleKnob} />
            </button>
          </label>
        </div>
      </div>

      {/* アクションボタン */}
      <div className={styles.buttonsContainer}>
        <button
          type="button"
          className={styles.backButton}
          onClick={handleBackToList}
        >
          {t("pageDetail.backToList")}
        </button>
        <button
          type="button"
          className={styles.editButton}
          onClick={handleEdit}
        >
          {t("pageDetail.edit")}
        </button>
        <button
          type="button"
          className={styles.deleteButton}
          onClick={handleDelete}
        >
          {t("pageDetail.delete")}
        </button>
      </div>

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title={t("pageDetail.delete")}
        message={t("pageDetail.deleteConfirm")}
        confirmLabel={t("pageDetail.delete")}
        cancelLabel={t("tagFilterModal.cancel")}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isProcessing={isDeletingPage}
      />

      <PremiumUpgradeModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        translationKey="premiumModalPublishPage"
      />
    </div>
  );
}

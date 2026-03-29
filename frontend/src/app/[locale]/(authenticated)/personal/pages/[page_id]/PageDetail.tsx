"use client";

import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { AttachmentCard } from "@/components/features/personal/AttachmentCard/AttachmentCard";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog/ConfirmDialog";
import { PremiumUpgradeModal } from "@/components/shared/PremiumUpgradeModal/PremiumUpgradeModal";
import { Skeleton } from "@/components/shared/Skeleton";
import { Tag } from "@/components/shared/Tag/Tag";
import { useToast } from "@/contexts/ToastContext";
import { deletePage, updatePage } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { usePageDetailData } from "@/lib/hooks/usePageDetailData";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { useTrainingTags } from "@/lib/hooks/useTrainingTags";
import { linkifyText } from "@/lib/utils/linkifyText";
import styles from "./page.module.css";

export function PageDetail() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const pageId = params.page_id as string;

  const { loading, pageData, setPageData, attachments } =
    usePageDetailData(pageId);

  const { availableTags } = useTrainingTags();

  const { showToast } = useToast();
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeletingPage, setDeletingPage] = useState(false);
  const [isTogglingPublic, setTogglingPublic] = useState(false);
  const { isPremium } = useSubscription();
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  const handleBackToList = () => {
    router.push(`/${locale}/personal/pages`);
  };

  const handleTogglePublic = async () => {
    if (!pageData || !user?.id || isTogglingPublic) return;

    // Free ユーザーが ON にしようとした場合は PremiumUpgradeModal を表示
    if (!pageData.is_public && !isPremium) {
      setShowPremiumModal(true);
      return;
    }

    setTogglingPublic(true);
    try {
      const newValue = !pageData.is_public;
      const response = await updatePage({
        id: pageData.id,
        title: pageData.title,
        tori: pageData.tags.filter((tag) =>
          availableTags.find((t) => t.name === tag && t.category === "取り"),
        ),
        uke: pageData.tags.filter((tag) =>
          availableTags.find((t) => t.name === tag && t.category === "受け"),
        ),
        waza: pageData.tags.filter((tag) =>
          availableTags.find((t) => t.name === tag && t.category === "技"),
        ),
        content: pageData.content,
        user_id: user.id,
        is_public: newValue,
      });
      if (response.success) {
        setPageData({ ...pageData, is_public: newValue });
        showToast(
          newValue
            ? t("pageDetail.publicEnabled")
            : t("pageDetail.publicDisabled"),
          "success",
        );
      }
    } catch (error) {
      console.error("公開設定変更エラー:", error);
      showToast(t("pageDetail.publicToggleFailed"), "error");
    } finally {
      setTogglingPublic(false);
    }
  };

  const handleEdit = () => {
    if (!pageData) return;
    window.location.href = `/${locale}/personal/pages/${pageId}/edit`;
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
        setDeleteDialogOpen(false);
        router.push(`/${locale}/personal/pages`);
      } else {
        throw new Error(response.error || t("pageDetail.deleteFailed"));
      }
    } catch (error) {
      console.error("Failed to delete page:", error);
      showToast(
        error instanceof Error ? error.message : t("pageDetail.deleteFailed"),
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
    return (
      <div className={styles.container}>
        <div className={styles.contentArea}>
          <div className={styles.notFound}>{t("pageDetail.notFound")}</div>
          <div className={styles.buttonsContainer}>
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

        {/* 公開設定 */}
        <div className={styles.publicToggle}>
          <label className={styles.toggleLabel}>
            <span>{t("pageDetail.publicToggle")}</span>
            <button
              type="button"
              role="switch"
              aria-checked={pageData.is_public}
              className={`${styles.toggle} ${pageData.is_public ? styles.toggleOn : ""}`}
              onClick={handleTogglePublic}
              disabled={isTogglingPublic}
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
      />
    </div>
  );
}

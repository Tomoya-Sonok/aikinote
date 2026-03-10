"use client";

import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { AttachmentCard } from "@/components/features/personal/AttachmentCard/AttachmentCard";
import {
  type PageEditData,
  PageEditModal,
} from "@/components/features/personal/PageEditModal/PageEditModal";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog/ConfirmDialog";
import { Skeleton } from "@/components/shared/Skeleton";
import { Tag } from "@/components/shared/Tag/Tag";
import {
  deletePage,
  type UpdatePagePayload,
  updatePage,
} from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { usePageDetailData } from "@/lib/hooks/usePageDetailData";
import { useTrainingTags } from "@/lib/hooks/useTrainingTags";
import type { TrainingPageData } from "@/types/training";
import styles from "./page.module.css";

export function PageDetail() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const pageId = params.page_id as string;

  const { loading, pageData, setPageData, attachments, fetchAttachments } =
    usePageDetailData(pageId);

  const { availableTags } = useTrainingTags();

  const [isPageEditModalOpen, setPageEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeletingPage, setDeletingPage] = useState(false);

  const handleBackToList = () => {
    router.push(`/${locale}/personal/pages`);
  };

  const handleEdit = () => {
    if (!pageData) return;
    setPageEditModalOpen(true);
  };

  const handleUpdatePage = async (pageUpdateData: UpdatePagePayload) => {
    try {
      const response = await updatePage(pageUpdateData);

      if (response.success && response.data) {
        const convertedData: TrainingPageData = {
          id: response.data.page.id,
          title: response.data.page.title,
          content: response.data.page.content,
          comment: response.data.page.comment,
          date: response.data.page.created_at,
          tags: response.data.tags.map((tag) => tag.name),
        };
        setPageData(convertedData);

        // 添付一覧を再取得（PageEditModalでの追加/削除を反映）
        await fetchAttachments();

        setPageEditModalOpen(false);
      } else {
        console.error(
          "Failed to update page:",
          "error" in response ? response.error : undefined,
        );
        alert(t("pageDetail.updateFailed"));
      }
    } catch (error) {
      console.error("Failed to update page:", error);
      alert(
        error instanceof Error ? error.message : t("pageDetail.updateFailed"),
      );
    }
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
      alert(t("personalPages.loginRequired"));
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
      alert(
        error instanceof Error ? error.message : t("pageDetail.deleteFailed"),
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
  const comments = pageData.comment || "";

  const editData: PageEditData | null = pageData
    ? {
        id: pageData.id,
        title: pageData.title,
        content: pageData.content,
        comment: pageData.comment || "",
        tori: pageData.tags.filter((tag) =>
          availableTags.find((t) => t.name === tag && t.category === "取り"),
        ),
        uke: pageData.tags.filter((tag) =>
          availableTags.find((t) => t.name === tag && t.category === "受け"),
        ),
        waza: pageData.tags.filter((tag) =>
          availableTags.find((t) => t.name === tag && t.category === "技"),
        ),
        attachments,
      }
    : null;

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
          <div className={styles.content}>{trainingContent}</div>
        </div>

        {/* その他・コメントセクション */}
        {comments && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>{t("pageDetail.comment")}</h2>
            <div className={styles.divider} />
            <div className={styles.content}>{comments}</div>
          </div>
        )}

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
      </div>

      {editData && (
        <PageEditModal
          isOpen={isPageEditModalOpen}
          onClose={() => setPageEditModalOpen(false)}
          onUpdate={handleUpdatePage}
          initialData={editData}
        />
      )}

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
    </div>
  );
}

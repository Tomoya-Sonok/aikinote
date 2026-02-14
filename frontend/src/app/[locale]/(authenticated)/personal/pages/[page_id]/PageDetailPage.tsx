"use client";

import { useParams, useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Loader } from "@/components/atoms/Loader";
import { Tag } from "@/components/atoms/Tag/Tag";
import { ConfirmDialog } from "@/components/molecules/ConfirmDialog/ConfirmDialog";
import {
  type PageEditData,
  PageEditModal,
} from "@/components/organisms/PageEditModal/PageEditModal";
import {
  deletePage,
  getPage,
  getTags,
  type UpdatePagePayload,
  updatePage,
} from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import type { TrainingPageData } from "@/types/training";
import styles from "./page.module.css";

// APIから取得するタグの型
interface ApiTag {
  id: string;
  name: string;
  category: string;
}

export function PageDetailPage() {
  const t = useTranslations();
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [pageData, setPageData] = useState<TrainingPageData | null>(null);
  const [isPageEditModalOpen, setPageEditModalOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState<ApiTag[]>([]);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeletingPage, setDeletingPage] = useState(false);
  const router = useRouter();
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const pageId = params.page_id as string;

  useEffect(() => {
    if (authLoading) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        if (pageId && user?.id) {
          const response = await getPage(pageId, user.id);

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
          } else {
            setPageData(null);
          }
        }
      } catch (err) {
        console.error("Failed to fetch page data:", err);
        setPageData(null);
      } finally {
        setLoading(false);
      }
    };

    const fetchTags = async () => {
      if (!user?.id) return;
      try {
        const response = await getTags(user.id);
        if (!response.success) {
          console.error(
            "Failed to fetch tags:",
            "error" in response ? response.error : undefined,
          );
          return;
        }

        if (response.data) {
          setAvailableTags(response.data as ApiTag[]);
        }
      } catch (err) {
        console.error("Failed to fetch tags:", err);
      }
    };

    fetchData();
    fetchTags();
  }, [pageId, user?.id, authLoading]);

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
          <Loader size="large" centered text={t("pageDetail.loading")} />
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

        {/* 稽古内容セクション */}
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

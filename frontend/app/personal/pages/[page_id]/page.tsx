"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader } from "@/components/atoms/Loader";
import { Tag } from "@/components/atoms/Tag/Tag";
import { AppLayout } from "@/components/layout/AppLayout";
import { TabNavigation } from "@/components/molecules/TabNavigation/TabNavigation";
import {
  type PageEditData,
  PageEditModal,
} from "@/components/organisms/PageEditModal/PageEditModal";
import {
  getPage,
  getTags,
  type UpdatePagePayload,
  updatePage,
} from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import type { TrainingPageData } from "@/lib/types/training";
import styles from "./page.module.css";

// APIから取得するタグの型
interface ApiTag {
  id: string;
  name: string;
  category: string;
}

export default function PageDetailPage() {
  const [loading, setLoading] = useState(true);
  const [pageData, setPageData] = useState<TrainingPageData | null>(null);
  const [isPageEditModalOpen, setPageEditModalOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState<ApiTag[]>([]);
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const pageId = params.page_id as string;

  useEffect(() => {
    const fetchData = async () => {
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
        if (response.success && response.data) {
          setAvailableTags(response.data);
        } else {
          console.error("Failed to fetch tags:", response.error);
        }
      } catch (err) {
        console.error("Failed to fetch tags:", err);
      }
    };

    fetchData();
    fetchTags();
  }, [pageId, user?.id]);

  const handleBackToList = () => {
    router.push("/personal/pages");
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
        console.error("Failed to update page:", response.error);
        alert("ページの更新に失敗しました");
      }
    } catch (error) {
      console.error("Failed to update page:", error);
      alert(
        error instanceof Error ? error.message : "ページの更新に失敗しました",
      );
    }
  };

  const handleDelete = () => {
    // TODO: 削除機能の実装（API実装後）
    console.log("Delete page:", pageId);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className={styles.container}>
          <div className={styles.contentArea}>
            <Loader size="large" centered text="読み込み中..." />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!pageData) {
    return (
      <AppLayout>
        <div className={styles.container}>
          <div className={styles.contentArea}>
            <div className={styles.notFound}>ページが見つかりませんでした</div>
            <div className={styles.buttonsContainer}>
              <button
                type="button"
                className={styles.backButton}
                onClick={handleBackToList}
              >
                ページ一覧へ
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
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
    <AppLayout>
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
            <h2 className={styles.sectionTitle}>稽古内容</h2>
            <div className={styles.divider} />
            <div className={styles.content}>{trainingContent}</div>
          </div>

          {/* その他・コメントセクション */}
          {comments && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>その他・コメント</h2>
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
              ページ一覧へ
            </button>
            <button
              type="button"
              className={styles.editButton}
              onClick={handleEdit}
            >
              編集
            </button>
            <button
              type="button"
              className={styles.deleteButton}
              onClick={handleDelete}
            >
              削除
            </button>
          </div>
        </div>

        <TabNavigation />

        {editData && (
          <PageEditModal
            isOpen={isPageEditModalOpen}
            onClose={() => setPageEditModalOpen(false)}
            onUpdate={handleUpdatePage}
            initialData={editData}
          />
        )}
      </div>
    </AppLayout>
  );
}

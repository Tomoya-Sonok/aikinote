"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Tag } from "@/components/atoms/Tag/Tag";
import { AppLayout } from "@/components/layout/AppLayout";
import { TabNavigation } from "@/components/molecules/TabNavigation/TabNavigation";
import { getPage } from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import type { TrainingPageData } from "@/lib/server/msw/training";
import styles from "./page.module.css";

export default function PageDetailPage() {
  const [loading, setLoading] = useState(true);
  const [pageData, setPageData] = useState<TrainingPageData | null>(null);
  const router = useRouter();
  const params = useParams();
  const { session } = useAuth();
  const pageId = params.page_id as string;

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (pageId && session?.user?.id) {
          const response = await getPage(pageId, session.user.id);

          if (response.success && response.data) {
            // APIレスポンスを既存コンポーネントの期待する形式に変換
            const convertedData: TrainingPageData = {
              id: response.data.page.id,
              title: response.data.page.title,
              content: response.data.page.content,
              comment: response.data.page.comment,
              date: response.data.page.created_at,
              tags: response.data.tags.map(tag => tag.name), // タグ名の配列に変換
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

    fetchData();
  }, [pageId, session?.user?.id]);

  const handleBackToList = () => {
    router.push("/personal/pages");
  };

  const handleEdit = () => {
    // TODO: 編集機能の実装（API実装後）
    console.log("Edit page:", pageId);
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
            <div className={styles.notFound}>読み込み中...</div>
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
                ページ一覧に戻る
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // 稽古内容とコメントを適切に表示
  const trainingContent = pageData.content;
  const comments = pageData.comment || "";

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
              ページ一覧に戻る
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
      </div>
    </AppLayout>
  );
}

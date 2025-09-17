"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { FloatingActionButton } from "@/components/atoms/FloatingActionButton/FloatingActionButton";
import { AppLayout } from "@/components/layout/AppLayout";
import { FilterSection } from "@/components/molecules/FilterSection/FilterSection";
import { TabNavigation } from "@/components/molecules/TabNavigation/TabNavigation";
import { TrainingCard } from "@/components/molecules/TrainingCard/TrainingCard";
import {
  type PageCreateData,
  PageCreateModal,
} from "@/components/organisms/PageCreateModal/PageCreateModal";
import { type CreatePagePayload, createPage, getPages } from "@/lib/api/client";
import { type TrainingPageData } from "@/lib/server/msw/training";
import styles from "./page.module.css";

export default function PersonalPagesPage() {
  const [loading, setLoading] = useState(true);
  const [trainingPageData, setTrainingPageData] = useState<TrainingPageData[]>(
    [],
  );
  const [filteredData, setFilteredData] = useState<TrainingPageData[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // セッションからユーザーIDを取得
        if (!session?.user?.id) {
          setLoading(false);
          return;
        }

        // Hono RPC API でページ一覧を取得
        const response = await getPages(session.user.id, 20);

        if (response.success && response.data) {
          // APIレスポンスをTrainingPageData形式に変換
          const trainingPageDataResult: TrainingPageData[] =
            response.data.training_pages.map((item) => ({
              id: item.page.id,
              title: item.page.title,
              content: item.page.content,
              date: item.page.created_at.split("T")[0], // created_atから日付を抽出
              tags: item.tags.map((tag) => tag.name), // タグ名の配列に変換
            }));

          setTrainingPageData(trainingPageDataResult);
          setFilteredData(trainingPageDataResult);
        } else {
          throw new Error(response.error || "データの取得に失敗しました");
        }
      } catch (err) {
        console.error("Failed to fetch training page data:", err);
        // エラー時は空配列を設定
        setTrainingPageData([]);
        setFilteredData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session]);

  const handleSearchChange = (search: string) => {
    const filtered = trainingPageData.filter(
      (item: TrainingPageData) =>
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.content.toLowerCase().includes(search.toLowerCase()) ||
        item.tags.some((tag: string) =>
          tag.toLowerCase().includes(search.toLowerCase()),
        ),
    );
    setFilteredData(filtered);
  };

  const handleDateFilterChange = (date: string | null) => {
    // 日付フィルタリングロジック
    console.log("Date filter:", date);
  };

  const handleTagFilterChange = (tags: string[]) => {
    // タグフィルタリングロジック
    console.log("Tag filter:", tags);
  };

  const handleCreatePage = () => {
    setIsModalOpen(true);
  };

  const handleSavePage = async (pageData: PageCreateData) => {
    try {
      // セッションからユーザーIDを取得
      if (!session?.user?.id) {
        throw new Error("ログインが必要です");
      }

      const userId = session.user.id;

      const payload: CreatePagePayload = {
        title: pageData.title.trim(),
        tori: pageData.tori,
        uke: pageData.uke,
        waza: pageData.waza,
        content: pageData.content,
        comment: pageData.comment,
        user_id: userId,
      };

      // Hono RPC APIを呼び出してページを作成
      const response = await createPage(payload);

      if (response.success && response.data) {
        // サーバーから返されたデータでローカル状態を更新
        const newPage: TrainingPageData = {
          id: response.data.page.id,
          title: response.data.page.title,
          content: response.data.page.content,
          date: response.data.page.created_at.split("T")[0], // created_atから日付を抽出
          tags: response.data.tags.map((tag) => tag.name), // タグ名の配列に変換
        };

        setTrainingPageData((prev) => [newPage, ...prev]);
        setFilteredData((prev) => [newPage, ...prev]);
      }

      // モーダルを閉じる
      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to create page:", error);
      // TODO: エラーハンドリング（トーストやアラートで表示）
      alert(
        error instanceof Error ? error.message : "ページの作成に失敗しました",
      );
    }
  };

  const handleEditTraining = (id: string) => {
    router.push(`/edit/${id}`);
  };

  const handleDeleteTraining = (id: string) => {
    setFilteredData((prev) => prev.filter((item) => item.id !== id));
  };

  const handleViewTraining = (id: string) => {
    router.push(`/personal/pages/${id}`);
  };

  // 認証状態のチェック
  if (status === "loading" || loading) {
    return (
      <AppLayout>
        <div className={styles.container}>読み込み中...</div>
      </AppLayout>
    );
  }

  // 未認証の場合はリダイレクト
  if (status === "unauthenticated") {
    return (
      <AppLayout>
        <div className={styles.container}>
          <p>ログインが必要です。</p>
          <button type="button" onClick={() => router.push("/login")}>
            ログインページへ
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className={styles.container}>
        {/* 統計エリア */}
        <div className={styles.statsSection}>
          <p className={styles.statsText}>
            これまでに作成したページ数は
            <span className={styles.statsNumber}>
              {trainingPageData.length}
            </span>
            ページです
          </p>
        </div>

        <FilterSection
          onSearchChange={handleSearchChange}
          onDateFilterChange={handleDateFilterChange}
          onTagFilterChange={handleTagFilterChange}
        />

        <div className={styles.pageListWrapper}>
          <div className={styles.pageListDescription}>
            <h2 className={styles.pageTitle}>最近作成したページ</h2>
            <p className={styles.pageCount}>全{filteredData.length}件表示中</p>
          </div>
          <div className={styles.trainingList}>
            {filteredData.map((training) => (
              <TrainingCard
                key={training.id}
                {...training}
                onClick={() => handleViewTraining(training.id)}
                onEdit={() => handleEditTraining(training.id)}
                onDelete={() => handleDeleteTraining(training.id)}
              />
            ))}
          </div>
        </div>

        <FloatingActionButton onClick={handleCreatePage} />

        <TabNavigation />

        {/* ページ作成モーダル */}
        <PageCreateModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSavePage}
        />
      </div>
    </AppLayout>
  );
}

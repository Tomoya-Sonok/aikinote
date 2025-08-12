"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TrainingCard } from "@/components/molecules/TrainingCard/TrainingCard";
import { TabNavigation } from "@/components/molecules/TabNavigation/TabNavigation";
import { FilterSection } from "@/components/molecules/FilterSection/FilterSection";
import { FloatingActionButton } from "@/components/atoms/FloatingActionButton/FloatingActionButton";
import {
  mockGetTrainingPageData,
  type TrainingPageData,
} from "@/lib/server/msw/training";
import { AppLayout } from "@/components/layout/AppLayout";
import styles from "./personal-pages.module.css";

export default function PersonalPagesPage() {
  const [loading, setLoading] = useState(true);
  const [trainingPageData, setTrainingPageData] = useState<TrainingPageData[]>(
    [],
  );
  const [filteredData, setFilteredData] = useState<TrainingPageData[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 稽古ページデータを取得
        const trainingPageDataResult = await mockGetTrainingPageData();
        setTrainingPageData(trainingPageDataResult);
        setFilteredData(trainingPageDataResult);
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
  }, []);

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
    router.push("/create");
  };

  const handleEditTraining = (id: string) => {
    router.push(`/edit/${id}`);
  };

  const handleDeleteTraining = (id: string) => {
    setFilteredData((prev) => prev.filter((item) => item.id !== id));
  };

  if (loading) {
    return (
      <AppLayout>
        <div className={styles.container}>読み込み中...</div>
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
                onEdit={() => handleEditTraining(training.id)}
                onDelete={() => handleDeleteTraining(training.id)}
              />
            ))}
          </div>
        </div>

        <FloatingActionButton onClick={handleCreatePage} />

        <TabNavigation />
      </div>
    </AppLayout>
  );
}

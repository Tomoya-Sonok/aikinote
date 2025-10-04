"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { FloatingActionButton } from "@/components/atoms/FloatingActionButton/FloatingActionButton";
import { Loader } from "@/components/atoms/Loader";
import { FilterArea } from "@/components/molecules/FilterArea/FilterArea";
import { TrainingCard } from "@/components/molecules/TrainingCard/TrainingCard";
import {
  type PageCreateData,
  PageCreateModal,
} from "@/components/organisms/PageCreateModal/PageCreateModal";
import {
  type PageEditData,
  PageEditModal,
} from "@/components/organisms/PageEditModal/PageEditModal";
import { TagFilterModal } from "@/components/organisms/TagFilterModal/TagFilterModal";
import {
  type CreatePagePayload,
  createPage,
  getPages,
  getTags,
  type UpdatePagePayload,
  updatePage,
} from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { type TrainingPageData } from "@/lib/types/training";
import { formatToLocalDateString } from "@/lib/utils/dateUtils";
import styles from "./page.module.css";

const PAGE_LIMIT = 25;

// タグの型定義
interface Tag {
  id: string;
  name: string;
}

export function PersonalPagesPageClient() {
  const t = useTranslations();
  const [loading, setLoading] = useState(true);
  const [allTrainingPageData, setAllTrainingPageData] = useState<
    TrainingPageData[]
  >([]);
  const [isPageCreateModalOpen, setPageCreateModalOpen] = useState(false);
  const [isPageEditModalOpen, setPageEditModalOpen] = useState(false);
  const [editingPageData, setEditingPageData] = useState<PageEditData | null>(
    null,
  );
  const router = useRouter();
  const locale = useLocale();
  const { user, loading: authLoading } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]); // 選択されたタグ名
  const [displayedItemsCount, setDisplayedItemsCount] = useState(PAGE_LIMIT);

  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]); // 利用可能なタグ一覧

  useEffect(() => {
    const fetchAllData = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        let allPages: TrainingPageData[] = [];
        let offset = 0;
        const limit = 100;
        let hasMoreData = true;

        // 全ページを取得するまでループ
        while (hasMoreData) {
          const response = await getPages({
            userId: user.id,
            limit,
            offset,
            query: "",
            tags: [],
            date: undefined,
          });

          if (response.success && response.data) {
            const pagesBatch = response.data.training_pages.map((item) => ({
              id: item.page.id,
              title: item.page.title,
              content: item.page.content,
              comment: item.page.comment,
              date: formatToLocalDateString(item.page.created_at),
              tags: item.tags.map((tag) => tag.name),
            }));

            allPages = [...allPages, ...pagesBatch];

            // 取得したページ数がlimitより少ない場合、これ以上データがない
            hasMoreData = pagesBatch.length === limit;
            offset += limit;
          } else {
            throw new Error(
              response.error || t("personalPages.dataFetchFailed"),
            );
          }
        }

        setAllTrainingPageData(allPages);
      } catch (err) {
        console.error("Failed to fetch training page data:", err);
        setAllTrainingPageData([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchAllData();
  }, [user, t]);

  useEffect(() => {
    if (
      debouncedSearchQuery !== undefined ||
      selectedTags !== undefined ||
      selectedDate !== undefined
    ) {
      setDisplayedItemsCount(PAGE_LIMIT);
    }
  }, [debouncedSearchQuery, selectedTags, selectedDate]);

  const filteredTrainingPageData = useMemo(() => {
    let filtered = allTrainingPageData;

    if (debouncedSearchQuery.trim()) {
      filtered = filtered.filter(
        (page) =>
          page.title
            .toLowerCase()
            .includes(debouncedSearchQuery.toLowerCase()) ||
          page.content
            .toLowerCase()
            .includes(debouncedSearchQuery.toLowerCase()) ||
          page.comment
            ?.toLowerCase()
            .includes(debouncedSearchQuery.toLowerCase()),
      );
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter((page) =>
        selectedTags.every((selectedTag) =>
          page.tags.some((pageTag) => pageTag === selectedTag),
        ),
      );
    }

    if (selectedDate) {
      filtered = filtered.filter((page) => page.date === selectedDate);
    }

    return filtered;
  }, [allTrainingPageData, debouncedSearchQuery, selectedTags, selectedDate]);

  const displayedTrainingPageData = useMemo(() => {
    return filteredTrainingPageData.slice(0, displayedItemsCount);
  }, [filteredTrainingPageData, displayedItemsCount]);

  const hasMore = filteredTrainingPageData.length > displayedItemsCount;

  useEffect(() => {
    const fetchTags = async () => {
      if (!user?.id) return;
      try {
        const response = await getTags(user.id);
        if (response.success && response.data) {
          setAvailableTags(response.data); // オブジェクトの配列をそのままセット
        } else {
          console.error("Failed to fetch tags:", response.error);
        }
      } catch (err) {
        console.error("Failed to fetch tags:", err);
      }
    };
    fetchTags();
  }, [user]);

  const handleLoadMore = () => {
    setDisplayedItemsCount((prev) => prev + PAGE_LIMIT);
  };

  const handleSearchChange = (search: string) => {
    setSearchQuery(search);
  };

  const handleDateFilterChange = (date: string | null) => {
    setSelectedDate(date);
  };

  const handleTagsConfirm = (tags: string[]) => {
    setSelectedTags(tags);
  };

  const handleCreatePage = () => {
    setPageCreateModalOpen(true);
  };

  const handleSavePage = async (pageData: PageCreateData) => {
    try {
      if (!user?.id) {
        throw new Error(t("personalPages.loginRequired"));
      }

      const userId = user.id;

      const payload: CreatePagePayload = {
        title: pageData.title.trim(),
        tori: pageData.tori,
        uke: pageData.uke,
        waza: pageData.waza,
        content: pageData.content,
        comment: pageData.comment,
        user_id: userId,
      };

      const response = await createPage(payload);

      if (response.success && response.data) {
        const newPage: TrainingPageData = {
          id: response.data.page.id,
          title: response.data.page.title,
          content: response.data.page.content,
          comment: response.data.page.comment,
          date: formatToLocalDateString(response.data.page.created_at),
          tags: response.data.tags.map((tag) => tag.name),
        };

        setAllTrainingPageData((prev) => [newPage, ...prev]);
      }

      setPageCreateModalOpen(false);
    } catch (error) {
      console.error("Failed to create page:", error);
      alert(
        error instanceof Error
          ? error.message
          : t("personalPages.pageCreationFailed"),
      );
    }
  };

  const handleEditTraining = (id: string) => {
    const pageToEdit = allTrainingPageData.find((page) => page.id === id);
    if (pageToEdit) {
      const editData: PageEditData = {
        id: pageToEdit.id,
        title: pageToEdit.title,
        content: pageToEdit.content,
        comment: pageToEdit.comment || "",
        tori: pageToEdit.tags.filter((tag) =>
          availableTags.find((t) => t.name === tag && t.category === "取り"),
        ),
        uke: pageToEdit.tags.filter((tag) =>
          availableTags.find((t) => t.name === tag && t.category === "受け"),
        ),
        waza: pageToEdit.tags.filter((tag) =>
          availableTags.find((t) => t.name === tag && t.category === "技"),
        ),
      };
      setEditingPageData(editData);
      setPageEditModalOpen(true);
    }
  };

  const handleUpdatePage = async (pageData: UpdatePagePayload) => {
    try {
      const response = await updatePage(pageData);

      if (response.success && response.data) {
        const updatedPage: TrainingPageData = {
          id: response.data.page.id,
          title: response.data.page.title,
          content: response.data.page.content,
          comment: response.data.page.comment,
          date: formatToLocalDateString(response.data.page.created_at),
          tags: response.data.tags.map((tag) => tag.name),
        };

        setAllTrainingPageData((prev) =>
          prev.map((page) => (page.id === updatedPage.id ? updatedPage : page)),
        );
      }

      setPageEditModalOpen(false);
      setEditingPageData(null);
    } catch (error) {
      console.error("Failed to update page:", error);
      alert(
        error instanceof Error
          ? error.message
          : t("personalPages.pageUpdateFailed"),
      );
    }
  };

  const handleDeleteTraining = (id: string) => {
    setAllTrainingPageData((prev) => prev.filter((item) => item.id !== id));
  };

  const handleViewTraining = (id: string) => {
    router.push(`/${locale}/personal/pages/${id}`);
  };

  if (authLoading || loading) {
    return (
      <div className={styles.container}>
        <Loader size="large" centered text={t("personalPages.loading")} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <p>{t("personalPages.loginRequired")}</p>
        <button type="button" onClick={() => router.push(`/${locale}/login`)}>
          {t("personalPages.goToLogin")}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.statsSection}>
        <p className={styles.statsText} data-testid="page-stats">
          {t("personalPages.pageCount")}
          <span className={styles.statsNumber}>
            {allTrainingPageData.length}
          </span>
          {t("personalPages.pageCountSuffix")}
        </p>
      </div>

      <FilterArea
        onSearchChange={handleSearchChange}
        onDateFilterChange={handleDateFilterChange}
        currentSearchQuery={searchQuery}
        currentSelectedDate={selectedDate}
        currentSelectedTags={selectedTags}
        onOpenTagSelection={() => setIsTagModalOpen(true)}
        onOpenDateSelection={() => {
          // TODO: 日付選択モーダルの実装
          console.log("Date filter button clicked");
        }}
      />

      <div className={styles.pageListWrapper}>
        <div className={styles.pageListDescription}>
          <h2 className={styles.pageTitle}>{t("personalPages.recentPages")}</h2>
          <p className={styles.pageCount} data-testid="page-count">
            {allTrainingPageData.length === displayedTrainingPageData.length
              ? t("personalPages.showingAll", {
                  total: allTrainingPageData.length,
                })
              : t("personalPages.showingPartial", {
                  total: allTrainingPageData.length,
                  displayed: displayedTrainingPageData.length,
                })}
          </p>
        </div>
        <div className={styles.trainingList}>
          {displayedTrainingPageData.map((training) => (
            <TrainingCard
              key={training.id}
              {...training}
              onClick={() => handleViewTraining(training.id)}
              onEdit={() => handleEditTraining(training.id)}
              onDelete={() => handleDeleteTraining(training.id)}
            />
          ))}
        </div>
        {hasMore && (
          <div className={styles.loadMoreContainer}>
            <button
              type="button"
              onClick={handleLoadMore}
              className={styles.loadMoreButton}
            >
              {t("personalPages.loadMore")}
            </button>
          </div>
        )}
      </div>

      <FloatingActionButton onClick={handleCreatePage} />

      <PageCreateModal
        isOpen={isPageCreateModalOpen}
        onClose={() => setPageCreateModalOpen(false)}
        onSave={handleSavePage}
      />

      {editingPageData && (
        <PageEditModal
          isOpen={isPageEditModalOpen}
          onClose={() => {
            setPageEditModalOpen(false);
            setEditingPageData(null);
          }}
          onUpdate={handleUpdatePage}
          initialData={editingPageData}
        />
      )}

      <TagFilterModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        tags={availableTags}
        selectedTags={selectedTags}
        onTagsConfirm={handleTagsConfirm}
      />
    </div>
  );
}

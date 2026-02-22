"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { FilterArea } from "@/components/features/personal/FilterArea/FilterArea";
import {
  type PageCreateData,
  PageCreateModal,
} from "@/components/features/personal/PageCreateModal/PageCreateModal";
import {
  type PageEditData,
  PageEditModal,
} from "@/components/features/personal/PageEditModal/PageEditModal";
import { TagFilterModal } from "@/components/features/personal/TagFilterModal/TagFilterModal";
import { TrainingCard } from "@/components/features/personal/TrainingCard/TrainingCard";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog/ConfirmDialog";
import { FloatingActionButton } from "@/components/shared/FloatingActionButton/FloatingActionButton";
import { Loader } from "@/components/shared/Loader";
import { type UpdatePagePayload } from "@/lib/api/client";
import { useTrainingPageFilters } from "@/lib/hooks/useTrainingPageFilters";
import { useTrainingPageModals } from "@/lib/hooks/useTrainingPageModals";
import { useTrainingPagesData } from "@/lib/hooks/useTrainingPagesData";
import { useTrainingTags } from "@/lib/hooks/useTrainingTags";
import styles from "./page.module.css";

export function PersonalPagesPage() {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const [isProcessing, setIsProcessing] = useState(false);

  // Custom Hooks
  const { availableTags } = useTrainingTags();
  const { loading, allTrainingPageData, addPage, updatePageData, removePage } =
    useTrainingPagesData();
  const {
    searchQuery,
    setSearchQuery,
    selectedDate,
    setSelectedDate,
    selectedTags,
    setSelectedTags,
    displayedTrainingPageData,
    hasMore,
    loadMore,
  } = useTrainingPageFilters(allTrainingPageData);
  const {
    isPageCreateModalOpen,
    setPageCreateModalOpen,
    isPageEditModalOpen,
    editingPageData,
    openEditModal,
    closeEditModal,
    isDeleteDialogOpen,
    deleteTargetPageId,
    openDeleteDialog,
    closeDeleteDialog,
    isTagModalOpen,
    setIsTagModalOpen,
  } = useTrainingPageModals();

  const handleCreatePage = () => {
    setPageCreateModalOpen(true);
  };

  const handleSavePage = async (pageData: PageCreateData) => {
    setIsProcessing(true);
    const success = await addPage(pageData);
    setIsProcessing(false);
    if (success) {
      setPageCreateModalOpen(false);
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
      openEditModal(editData);
    }
  };

  const handleUpdatePage = async (pageData: UpdatePagePayload) => {
    setIsProcessing(true);
    const success = await updatePageData(pageData);
    setIsProcessing(false);
    if (success) {
      closeEditModal();
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetPageId) {
      closeDeleteDialog();
      return;
    }
    setIsProcessing(true);
    await removePage(deleteTargetPageId);
    setIsProcessing(false);
    closeDeleteDialog();
  };

  const handleViewTraining = (id: string) => {
    router.push(`/${locale}/personal/pages/${id}`);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Loader size="large" centered text={t("personalPages.loading")} />
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
        onSearchChange={setSearchQuery}
        onDateFilterChange={setSelectedDate}
        onTagFilterChange={setSelectedTags}
        currentSearchQuery={searchQuery}
        currentSelectedDate={selectedDate}
        currentSelectedTags={selectedTags}
        onOpenTagSelection={() => setIsTagModalOpen(true)}
        onOpenDateSelection={() => {
          // TODO: 日付選択モーダルの実装
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
              onDelete={() => openDeleteDialog(training.id)}
            />
          ))}
        </div>
        {hasMore && (
          <div className={styles.loadMoreContainer}>
            <button
              type="button"
              onClick={loadMore}
              className={styles.loadMoreButton}
            >
              {t("personalPages.loadMore")}
            </button>
          </div>
        )}
      </div>

      <FloatingActionButton onClick={handleCreatePage} />

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title={t("pageDetail.delete")}
        message={t("pageDetail.deleteConfirm")}
        confirmLabel={t("pageDetail.delete")}
        cancelLabel={t("tagFilterModal.cancel")}
        onConfirm={handleConfirmDelete}
        onCancel={closeDeleteDialog}
        isProcessing={isProcessing}
      />

      <PageCreateModal
        isOpen={isPageCreateModalOpen}
        onClose={() => setPageCreateModalOpen(false)}
        onSave={handleSavePage}
      />

      {editingPageData && (
        <PageEditModal
          isOpen={isPageEditModalOpen}
          onClose={closeEditModal}
          onUpdate={handleUpdatePage}
          initialData={editingPageData}
        />
      )}

      <TagFilterModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        tags={availableTags}
        selectedTags={selectedTags}
        onTagsConfirm={setSelectedTags}
      />
    </div>
  );
}

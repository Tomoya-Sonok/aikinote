"use client";

import {
  CaretDownIcon,
  CaretUpIcon,
  CheckIcon,
  SortAscendingIcon,
  SortDescendingIcon,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { useToast } from "@/contexts/ToastContext";
import { type UpdatePagePayload } from "@/lib/api/client";
import { useTrainingPageFilters } from "@/lib/hooks/useTrainingPageFilters";
import { useTrainingPageModals } from "@/lib/hooks/useTrainingPageModals";
import { useTrainingPagesData } from "@/lib/hooks/useTrainingPagesData";
import { useTrainingTags } from "@/lib/hooks/useTrainingTags";
import { type SortOrder } from "@/types/sortOrder";
import styles from "./page.module.css";

export function PersonalPagesPage() {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const { showToast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

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
    sortOrder,
    setSortOrder,
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

  // ソートドロップダウン外クリックで閉じる
  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (
      sortDropdownRef.current &&
      !sortDropdownRef.current.contains(event.target as Node)
    ) {
      setIsSortDropdownOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isSortDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSortDropdownOpen, handleClickOutside]);

  const handleSortSelect = (order: SortOrder) => {
    setSortOrder(order);
    setIsSortDropdownOpen(false);
  };

  const handleCreatePage = () => {
    setPageCreateModalOpen(true);
  };

  const handleSavePage = async (pageData: PageCreateData) => {
    setIsProcessing(true);
    const success = await addPage(pageData);
    setIsProcessing(false);
    if (success) {
      setPageCreateModalOpen(false);
      showToast(t("pageCreate.success"), "success");
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

  const SortIcon =
    sortOrder === "newest" ? SortDescendingIcon : SortAscendingIcon;
  const CaretIcon = isSortDropdownOpen ? CaretUpIcon : CaretDownIcon;

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
        onOpenDateSelection={() => {}}
      />

      <div className={styles.pageListWrapper}>
        <div className={styles.pageListDescription}>
          <div className={styles.pageListHeader}>
            <h2 className={styles.pageTitle}>{t("personalPages.pagesList")}</h2>
            <div className={styles.sortDropdownContainer} ref={sortDropdownRef}>
              <button
                type="button"
                className={styles.sortButton}
                onClick={() => setIsSortDropdownOpen((prev) => !prev)}
                data-testid="sort-button"
              >
                <SortIcon
                  size={16}
                  weight="light"
                  className={styles.sortIcon}
                />
                <span className={styles.sortLabel}>
                  {sortOrder === "newest"
                    ? t("personalPages.sortNewest")
                    : t("personalPages.sortOldest")}
                </span>
                <CaretIcon
                  size={12}
                  weight="bold"
                  className={styles.sortCaret}
                />
              </button>
              {isSortDropdownOpen && (
                <div
                  className={styles.sortDropdown}
                  data-testid="sort-dropdown"
                >
                  <button
                    type="button"
                    className={`${styles.sortOption} ${sortOrder === "newest" ? styles.sortOptionActive : ""}`}
                    onClick={() => handleSortSelect("newest")}
                    data-testid="sort-option-newest"
                  >
                    <span className={styles.sortOptionCheck}>
                      {sortOrder === "newest" && (
                        <CheckIcon size={14} weight="bold" />
                      )}
                    </span>
                    {t("personalPages.sortNewest")}
                  </button>
                  <button
                    type="button"
                    className={`${styles.sortOption} ${sortOrder === "oldest" ? styles.sortOptionActive : ""}`}
                    onClick={() => handleSortSelect("oldest")}
                    data-testid="sort-option-oldest"
                  >
                    <span className={styles.sortOptionCheck}>
                      {sortOrder === "oldest" && (
                        <CheckIcon size={14} weight="bold" />
                      )}
                    </span>
                    {t("personalPages.sortOldest")}
                  </button>
                </div>
              )}
            </div>
          </div>
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

"use client";

import {
  CalendarDotsIcon,
  CaretDownIcon,
  CaretUpIcon,
  ChartBar,
  CheckIcon,
  InfoIcon,
  SortAscendingIcon,
  SortDescendingIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { FilterArea } from "@/components/features/personal/FilterArea/FilterArea";
import { TagFilterModal } from "@/components/features/personal/TagFilterModal/TagFilterModal";
import { TrainingCard } from "@/components/features/personal/TrainingCard/TrainingCard";
import { TrainingCardSkeleton } from "@/components/features/personal/TrainingCard/TrainingCardSkeleton";
import { Tutorial } from "@/components/features/tutorial/Tutorial";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog/ConfirmDialog";
import { FloatingActionButton } from "@/components/shared/FloatingActionButton/FloatingActionButton";
import { Skeleton } from "@/components/shared/Skeleton";
import { Tooltip } from "@/components/shared/Tooltip/Tooltip";
import { useAuth } from "@/lib/hooks/useAuth";
import { useTrainingPageFilters } from "@/lib/hooks/useTrainingPageFilters";
import { useTrainingPageModals } from "@/lib/hooks/useTrainingPageModals";
import { useTrainingPagesData } from "@/lib/hooks/useTrainingPagesData";
import { useTrainingTags } from "@/lib/hooks/useTrainingTags";
import { useUmamiTrack } from "@/lib/hooks/useUmamiTrack";
import { useRouter } from "@/lib/i18n/routing";
import { useTutorialStore } from "@/stores/tutorialStore";
import { type SortOrder } from "@/types/sortOrder";
import styles from "./page.module.css";

export function PersonalPages() {
  const t = useTranslations();
  const router = useRouter();
  const locale = useLocale();
  const { user } = useAuth();
  const { track } = useUmamiTrack();
  const hasSeenTutorial = useTutorialStore((s) => s.hasSeenTutorial);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Custom Hooks
  const { availableTags } = useTrainingTags();
  const {
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    selectedDateRange,
    setSelectedDateRange,
    selectedTags,
    setSelectedTags,
    sortOrder,
    setSortOrder,
  } = useTrainingPageFilters();

  const {
    loading,
    allTrainingPageData,
    totalCount,
    unfilteredTotalCount,
    hasMore,
    loadMore,
    removePage,
  } = useTrainingPagesData({
    query: debouncedSearchQuery,
    tags: selectedTags,
    startDate: selectedDateRange.startDate || undefined,
    endDate: selectedDateRange.endDate || undefined,
    sortOrder,
  });

  const displayedTrainingPageData = allTrainingPageData;
  const hasFiltersApplied = !!(
    debouncedSearchQuery ||
    selectedTags.length > 0 ||
    selectedDateRange.startDate ||
    selectedDateRange.endDate
  );
  const {
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

  const handleSortSelect = useCallback(
    (order: SortOrder) => {
      setSortOrder(order);
      setIsSortDropdownOpen(false);
    },
    [setSortOrder],
  );

  const handleEditTraining = useCallback(
    (id: string) => {
      router.push(`/personal/pages/${id}/edit`);
    },
    [router],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTargetPageId) {
      closeDeleteDialog();
      return;
    }
    setIsProcessing(true);
    await removePage(deleteTargetPageId);
    setIsProcessing(false);
    closeDeleteDialog();
  }, [deleteTargetPageId, closeDeleteDialog, removePage]);

  const handleViewTraining = useCallback(
    (id: string) => {
      router.push(`/personal/pages/${id}`);
    },
    [router],
  );

  const SortIcon =
    sortOrder === "newest" ? SortDescendingIcon : SortAscendingIcon;
  const CaretIcon = isSortDropdownOpen ? CaretUpIcon : CaretDownIcon;

  return (
    <div className={styles.container}>
      <div className={styles.pageListHeader}>
        <div className={styles.pageTitleGroup}>
          <h2 className={styles.pageTitle}>{t("personalPages.pagesList")}</h2>
          <Tooltip
            text={t("personalPages.pagesListTooltip")}
            position="bottom"
            align="left"
            ariaLabel={t("personalPages.pagesListTooltip")}
          >
            <InfoIcon
              size={16}
              weight="regular"
              className={styles.pageTitleInfoIcon}
            />
          </Tooltip>
        </div>
        <div className={styles.otherPageLinks}>
          <Link
            href={`/${locale}/personal/stats`}
            className={styles.statsLink}
            aria-label={t("personalPages.openStats")}
          >
            <ChartBar
              size={24}
              weight="light"
              className={styles.statsLinkIcon}
            />
            <span className={styles.statsLinkLabel}>
              {t("personalPages.stats")}
            </span>
          </Link>
          <Link
            href={`/${locale}/personal/calendar`}
            className={styles.calendarLink}
            aria-label={t("personalPages.openCalendar")}
          >
            <CalendarDotsIcon
              size={24}
              weight="light"
              className={styles.calendarIcon}
            />
            <span className={styles.calendarText}>
              {t("personalPages.calendar")}
            </span>
          </Link>
        </div>
      </div>

      <FilterArea
        onSearchChange={setSearchQuery}
        onDateFilterChange={setSelectedDateRange}
        onTagFilterChange={setSelectedTags}
        currentSearchQuery={searchQuery}
        currentSelectedDateRange={selectedDateRange}
        currentSelectedTags={selectedTags}
        onOpenTagSelection={() => setIsTagModalOpen(true)}
        onOpenDateSelection={() => {}}
        userId={user?.id}
      />

      <div className={styles.pageListWrapper}>
        <div className={styles.pageListDescription}>
          <div className={styles.pageListHeader}>
            <p className={styles.pageCount} data-testid="page-count">
              {loading ? (
                <Skeleton variant="text" width="100px" height="14px" />
              ) : hasFiltersApplied &&
                displayedTrainingPageData.length === 0 &&
                unfilteredTotalCount ? (
                t("personalPages.showingPartial", {
                  total: unfilteredTotalCount,
                  displayed: 0,
                })
              ) : totalCount === displayedTrainingPageData.length ? (
                t("personalPages.showingAll", {
                  total: totalCount,
                })
              ) : (
                t("personalPages.showingPartial", {
                  total: totalCount,
                  displayed: displayedTrainingPageData.length,
                })
              )}
            </p>
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
        </div>
        <div className={styles.trainingList}>
          {loading ? (
            <TrainingCardSkeleton count={3} />
          ) : displayedTrainingPageData.length === 0 ? (
            hasFiltersApplied ? (
              <p className={styles.emptyMessage}>
                {t("personalPages.filteredEmptyMessage")}
              </p>
            ) : (
              <p className={styles.emptyMessage}>
                {t("personalPages.emptyLine1")}
                <br />
                {t("personalPages.emptyLine2")}
              </p>
            )
          ) : (
            displayedTrainingPageData.map((training) => (
              <TrainingCard
                key={training.id}
                {...training}
                onClick={() => handleViewTraining(training.id)}
                onEdit={() => handleEditTraining(training.id)}
                onDelete={() => openDeleteDialog(training.id)}
              />
            ))
          )}
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

      <FloatingActionButton
        href={`/${locale}/personal/pages/new`}
        onClick={() => track("start_create_page_from_top")}
      />

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

      <TagFilterModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        tags={availableTags}
        selectedTags={selectedTags}
        onTagsConfirm={setSelectedTags}
      />

      {!hasSeenTutorial && <Tutorial />}
    </div>
  );
}

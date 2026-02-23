import { useEffect, useMemo, useState } from "react";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { type SortOrder } from "@/types/sortOrder";
import { type TrainingPageData } from "@/types/training";

const PAGE_LIMIT = 25;

export function useTrainingPageFilters(
  allTrainingPageData: TrainingPageData[],
) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [displayedItemsCount, setDisplayedItemsCount] = useState(PAGE_LIMIT);

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

    // ソート: date フィールドで並び替え
    const sorted = [...filtered].sort((a, b) => {
      const comparison = a.date.localeCompare(b.date);
      return sortOrder === "newest" ? -comparison : comparison;
    });

    return sorted;
  }, [
    allTrainingPageData,
    debouncedSearchQuery,
    selectedTags,
    selectedDate,
    sortOrder,
  ]);

  const displayedTrainingPageData = useMemo(() => {
    return filteredTrainingPageData.slice(0, displayedItemsCount);
  }, [filteredTrainingPageData, displayedItemsCount]);

  const hasMore = filteredTrainingPageData.length > displayedItemsCount;

  const loadMore = () => {
    setDisplayedItemsCount((prev) => prev + PAGE_LIMIT);
  };

  return {
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
  };
}

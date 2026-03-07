import { useState } from "react";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { type SortOrder } from "@/types/sortOrder";

export interface DateRange {
  startDate: string | null;
  endDate: string | null;
}

export function useTrainingPageFilters() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>({
    startDate: null,
    endDate: null,
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  return {
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    selectedDateRange,
    setSelectedDateRange,
    selectedTags,
    setSelectedTags,
    sortOrder,
    setSortOrder,
  };
}

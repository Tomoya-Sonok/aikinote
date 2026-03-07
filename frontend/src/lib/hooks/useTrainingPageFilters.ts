import { useState } from "react";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { type SortOrder } from "@/types/sortOrder";

export function useTrainingPageFilters() {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  return {
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    selectedDate,
    setSelectedDate,
    selectedTags,
    setSelectedTags,
    sortOrder,
    setSortOrder,
  };
}

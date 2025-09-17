import type { ChangeEvent, FC } from "react";
import { FilterItem } from "../../atoms/FilterItem/FilterItem";
import { SearchInput } from "../../atoms/SearchInput/SearchInput";
import styles from "./FilterArea.module.css";

interface FilterAreaProps {
  onSearchChange: (search: string) => void;
  onDateFilterChange: (date: string | null) => void;
  onTagFilterChange: (tags: string[]) => void;
  // 親から現在の選択状態を受け取る
  currentSearchQuery: string;
  currentSelectedDate: string | null;
  currentSelectedTags: string[];
  // タグ選択モーダルなどを開くためのハンドラ
  onOpenTagSelection: () => void;
  onOpenDateSelection: () => void;
}

export const FilterArea: FC<FilterAreaProps> = ({
  onSearchChange,
  currentSearchQuery,
  currentSelectedDate,
  currentSelectedTags,
  onOpenTagSelection,
  onOpenDateSelection,
}) => {
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onSearchChange(value);
  };

  return (
    <div className={styles.filterContainer}>
      <SearchInput
        value={currentSearchQuery}
        onChange={handleSearchChange}
        placeholder="フリーワードで絞り込む"
      />

      <div className={styles.filterRow}>
        <FilterItem
          icon="/icons/tag-icon.svg"
          label="タグ"
          value={
            currentSelectedTags.length > 0
              ? currentSelectedTags.join(", ")
              : "指定なし"
          }
          onClick={onOpenTagSelection} // タグ選択UIを開く
        />

        <FilterItem
          icon="/icons/calendar-icon.svg"
          label="日付"
          value={currentSelectedDate || "指定なし"}
          onClick={onOpenDateSelection} // 日付選択UIを開く
        />
      </div>
    </div>
  );
};

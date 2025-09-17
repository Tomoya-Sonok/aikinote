import type { ChangeEvent, FC } from "react";
import Image from "next/image";
import { SearchInput } from "../../atoms/SearchInput/SearchInput";
import styles from "./FilterArea.module.css";

interface FilterAreaProps {
  onSearchChange: (search: string) => void;
  onDateFilterChange: (date: string | null) => void;
  currentSearchQuery: string;
  currentSelectedDate: string | null;
  currentSelectedTags: string[]; // 表示用にタグ名（またはID）の配列を受け取る
  onOpenTagSelection: () => void;
}

export const FilterArea: FC<FilterAreaProps> = ({
  onSearchChange,
  onDateFilterChange,
  currentSearchQuery,
  currentSelectedDate,
  currentSelectedTags,
  onOpenTagSelection,
}) => {
  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };

  const handleDateChange = (e: ChangeEvent<HTMLInputElement>) => {
    onDateFilterChange(e.target.value || null);
  };

  // NOTE: タグの表示名は、IDから名前に変換するロジックが親にあることを想定しています。
  // ここでは受け取った配列をそのまま表示します。
  const tagDisplayValue =
    currentSelectedTags.length > 0
      ? currentSelectedTags.join(", ")
      : "指定なし";

  return (
    <div className={styles.filterContainer}>
      <SearchInput
        value={currentSearchQuery}
        onChange={handleSearchChange}
        placeholder="フリーワードで絞り込む"
      />

      <div className={styles.filterRow}>
        {/* Tag Filter Button */}
        <button
          type="button"
          className={styles.filterItemButton}
          onClick={onOpenTagSelection}
        >
          <Image
            src="/icons/tag-icon.svg"
            alt="タグ"
            width={24}
            height={24}
            className={styles.filterIcon}
          />
          <span className={styles.filterLabel}>タグ</span>
          <span className={styles.filterValue}>{tagDisplayValue}</span>
          <span className={styles.arrow}>＞</span>
        </button>

        {/* Date Filter Input */}
        <div className={styles.dateFilterContainer}>
          <Image
            src="/icons/calendar-icon.svg"
            alt="日付"
            width={24}
            height={24}
            className={styles.filterIcon}
          />
          <label htmlFor="date-filter" className={styles.filterLabel}>
            日付
          </label>
          <input
            id="date-filter"
            type="date"
            className={styles.dateInput}
            value={currentSelectedDate || ""}
            onChange={handleDateChange}
          />
        </div>
      </div>
    </div>
  );
};
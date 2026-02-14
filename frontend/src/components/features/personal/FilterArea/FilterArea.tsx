import Image from "next/image";
import { useTranslations } from "next-intl";
import type { ChangeEvent, FC } from "react";
import { useState } from "react";
import { SearchInput } from "@/components/shared/SearchInput/SearchInput";
import { DatePickerModal } from "../DatePickerModal";
import styles from "./FilterArea.module.css";

interface FilterAreaProps {
  onSearchChange: (search: string) => void;
  onDateFilterChange: (date: string | null) => void;
  onTagFilterChange: (tags: string[]) => void;
  currentSearchQuery: string;
  currentSelectedDate: string | null;
  currentSelectedTags: string[]; // 表示用にタグ名（またはID）の配列を受け取る
  onOpenTagSelection: () => void;
  onOpenDateSelection?: () => void;
}

export const FilterArea: FC<FilterAreaProps> = ({
  onSearchChange,
  onDateFilterChange,
  onTagFilterChange: _onTagFilterChange,
  currentSearchQuery,
  currentSelectedDate,
  currentSelectedTags,
  onOpenTagSelection,
  onOpenDateSelection,
}) => {
  const t = useTranslations();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };

  const handleDateSelect = (date: Date | null) => {
    if (date === null) {
      onDateFilterChange(null);
    } else {
      // タイムゾーンを考慮してローカル日付文字列を生成
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const formattedDate = `${year}-${month}-${day}`;
      onDateFilterChange(formattedDate);
    }
  };

  const handleOpenDatePicker = () => {
    onOpenDateSelection?.();
    setIsDatePickerOpen(true);
  };

  const handleCloseDatePicker = () => {
    setIsDatePickerOpen(false);
  };

  // NOTE: タグの表示名は、IDから名前に変換するロジックが親にあることを想定しています。
  // ここでは受け取った配列をそのまま表示します。
  const tagDisplayValue =
    currentSelectedTags.length > 0
      ? currentSelectedTags.join(", ")
      : t("filter.notSpecified");

  const dateDisplayValue = currentSelectedDate || t("filter.notSpecified");

  return (
    <div className={styles.filterContainer}>
      <SearchInput
        value={currentSearchQuery}
        onChange={handleSearchChange}
        placeholder={t("filter.searchPlaceholder")}
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
            alt={t("filter.tagAlt")}
            width={24}
            height={24}
            className={styles.filterIcon}
          />
          <span className={styles.filterLabel}>{t("filter.tagLabel")}</span>
          <span className={styles.filterValue}>{tagDisplayValue}</span>
          <span className={styles.arrow}>＞</span>
        </button>

        {/* Date Filter Button */}
        <button
          type="button"
          className={styles.filterItemButton}
          onClick={handleOpenDatePicker}
        >
          <Image
            src="/icons/calendar-icon.svg"
            alt={t("filter.dateAlt")}
            width={24}
            height={24}
            className={styles.filterIcon}
          />
          <span className={styles.filterLabel}>{t("filter.dateLabel")}</span>
          <span className={styles.filterValue}>{dateDisplayValue}</span>
          <span className={styles.arrow}>＞</span>
        </button>
      </div>

      {/* Date Picker Modal */}
      <DatePickerModal
        isOpen={isDatePickerOpen}
        onClose={handleCloseDatePicker}
        selectedDate={
          currentSelectedDate ? new Date(currentSelectedDate) : undefined
        }
        onDateSelect={handleDateSelect}
        title={t("filter.selectDate")}
      />
    </div>
  );
};

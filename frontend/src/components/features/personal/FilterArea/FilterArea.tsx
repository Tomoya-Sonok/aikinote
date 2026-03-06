import {
  CalendarDotsIcon,
  CaretRightIcon,
  FunnelXIcon,
  TagIcon,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import type { ChangeEvent, FC } from "react";
import { useRef, useState } from "react";
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
  const [showTooltip, setShowTooltip] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActiveRef = useRef(false);

  const tooltipId = "clear-filters-tooltip";

  const hasFilters =
    currentSearchQuery !== "" ||
    currentSelectedDate !== null ||
    currentSelectedTags.length > 0;

  const clearTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePointerDown = () => {
    isLongPressActiveRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressActiveRef.current = true;
      setShowTooltip(true);
    }, 500); // 500ms長押しでツールチップ表示
  };

  const handlePointerUp = () => {
    clearTimer();
    // 長押しが発動していなければ通常のクリック処理（すべてクリア）
    if (!isLongPressActiveRef.current) {
      if (currentSearchQuery !== "") onSearchChange("");
      if (currentSelectedDate !== null) onDateFilterChange(null);
      if (currentSelectedTags.length > 0) _onTagFilterChange([]);
    }
    // 指を離したらツールチップを隠す
    setShowTooltip(false);
  };

  const handlePointerLeave = () => {
    clearTimer();
    setShowTooltip(false);
  };

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
      <div className={styles.filterHeader}>
        <div className={styles.searchWrapper}>
          <SearchInput
            value={currentSearchQuery}
            onChange={handleSearchChange}
            placeholder={t("filter.searchPlaceholder")}
          />
        </div>
        {hasFilters && (
          <div className={styles.clearButtonContainer}>
            <button
              type="button"
              className={styles.clearButton}
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerLeave}
              aria-label={t("filter.clearFilters")}
              aria-describedby={showTooltip ? tooltipId : undefined}
            >
              <FunnelXIcon
                size={24}
                weight="light"
                color="var(--aikinote-black)"
              />
            </button>
            <div
              id={tooltipId}
              role="tooltip"
              className={`${styles.tooltip} ${showTooltip ? styles.visible : ""}`}
            >
              {t("filter.clearFilters")}
            </div>
          </div>
        )}
      </div>

      <div className={styles.filterRow}>
        {/* Tag Filter Button */}
        <button
          type="button"
          className={styles.filterItemButton}
          onClick={onOpenTagSelection}
        >
          <TagIcon
            size={20}
            weight="light"
            color="var(--aikinote-black)"
            className={styles.filterIcon}
          />
          <span className={styles.filterLabel}>{t("filter.tagLabel")}</span>
          <span className={styles.filterValue}>{tagDisplayValue}</span>
          <CaretRightIcon
            size={16}
            weight="light"
            color="var(--aikinote-black)"
            className={styles.arrow}
          />
        </button>

        {/* Date Filter Button */}
        <button
          type="button"
          className={styles.filterItemButton}
          onClick={handleOpenDatePicker}
        >
          <CalendarDotsIcon
            size={20}
            weight="light"
            color="var(--aikinote-black)"
            className={styles.filterIcon}
          />
          <span className={styles.filterLabel}>{t("filter.dateLabel")}</span>
          <span className={styles.filterValue}>{dateDisplayValue}</span>
          <CaretRightIcon
            size={16}
            weight="light"
            color="var(--aikinote-black)"
            className={styles.arrow}
          />
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

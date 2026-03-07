import {
  CalendarDotsIcon,
  CaretRightIcon,
  FunnelXIcon,
  TagIcon,
} from "@phosphor-icons/react";
import { format, isValid, parse } from "date-fns";
import { useTranslations } from "next-intl";
import type { ChangeEvent, FC } from "react";
import { useRef, useState } from "react";
import { SearchInput } from "@/components/shared/SearchInput/SearchInput";
import { type DateRange } from "@/lib/hooks/useTrainingPageFilters";
import { DatePickerModal } from "../DatePickerModal";
import styles from "./FilterArea.module.css";

interface DateRangeSelection {
  startDate: Date | null;
  endDate: Date | null;
}

interface FilterAreaProps {
  onSearchChange: (search: string) => void;
  onDateFilterChange: (range: DateRange) => void;
  onTagFilterChange: (tags: string[]) => void;
  currentSearchQuery: string;
  currentSelectedDateRange: DateRange;
  currentSelectedTags: string[]; // 表示用にタグ名（またはID）の配列を受け取る
  onOpenTagSelection: () => void;
  onOpenDateSelection?: () => void;
  userId?: string;
}

export const FilterArea: FC<FilterAreaProps> = ({
  onSearchChange,
  onDateFilterChange,
  onTagFilterChange: _onTagFilterChange,
  currentSearchQuery,
  currentSelectedDateRange,
  currentSelectedTags,
  onOpenTagSelection,
  onOpenDateSelection,
  userId,
}) => {
  const t = useTranslations();
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActiveRef = useRef(false);

  const tooltipId = "clear-filters-tooltip";

  const hasFilters =
    currentSearchQuery !== "" ||
    currentSelectedDateRange.startDate !== null ||
    currentSelectedDateRange.endDate !== null ||
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
      if (
        currentSelectedDateRange.startDate !== null ||
        currentSelectedDateRange.endDate !== null
      ) {
        onDateFilterChange({ startDate: null, endDate: null });
      }
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

  const formatDate = (date: Date) => format(date, "yyyy-MM-dd");

  const parseDateInput = (value: string | null): Date | null => {
    if (!value) return null;
    const parsed = parse(value, "yyyy-MM-dd", new Date());
    return isValid(parsed) ? parsed : null;
  };

  const handleDateSelect = (range: DateRangeSelection) => {
    onDateFilterChange({
      startDate: range.startDate ? formatDate(range.startDate) : null,
      endDate: range.endDate ? formatDate(range.endDate) : null,
    });
  };

  const handleOpenDatePicker = () => {
    onOpenDateSelection?.();
    setIsDatePickerOpen(true);
  };

  const handleCloseDatePicker = () => {
    setIsDatePickerOpen(false);
  };

  const tagDisplayValue =
    currentSelectedTags.length > 0
      ? currentSelectedTags.join(", ")
      : t("filter.notSpecified");

  const { startDate, endDate } = currentSelectedDateRange;
  let dateDisplayValue = t("filter.notSpecified");
  if (startDate && endDate) {
    dateDisplayValue = `${startDate} ～ ${endDate}`;
  } else if (startDate) {
    dateDisplayValue = startDate;
  } else if (endDate) {
    dateDisplayValue = endDate;
  }

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
              <FunnelXIcon size={24} weight="light" color="var(--black)" />
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
            color="var(--black)"
            className={styles.filterIcon}
          />
          <span className={styles.filterLabel}>{t("filter.tagLabel")}</span>
          <span className={styles.filterValue}>{tagDisplayValue}</span>
          <CaretRightIcon
            size={16}
            weight="light"
            color="var(--black)"
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
            color="var(--black)"
            className={styles.filterIcon}
          />
          <span className={styles.filterLabel}>{t("filter.dateLabel")}</span>
          <span className={styles.filterValue}>{dateDisplayValue}</span>
          <CaretRightIcon
            size={16}
            weight="light"
            color="var(--black)"
            className={styles.arrow}
          />
        </button>
      </div>

      {/* Date Picker Modal */}
      <DatePickerModal
        isOpen={isDatePickerOpen}
        onClose={handleCloseDatePicker}
        selectedRange={{
          startDate: parseDateInput(startDate),
          endDate: parseDateInput(endDate),
        }}
        onDateSelect={handleDateSelect}
        title={t("filter.selectDate")}
        userId={userId}
      />
    </div>
  );
};

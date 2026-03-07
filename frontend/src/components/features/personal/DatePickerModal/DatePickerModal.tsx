import { useTranslations } from "next-intl";
import type { FC } from "react";
import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarGrid } from "@/components/features/personal/CalendarGrid/CalendarGrid";
import { Button } from "@/components/shared/Button/Button";
import { getTrainingDatesMonth } from "@/lib/api/client";
import styles from "./DatePickerModal.module.css";

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
  onDateSelect: (date: Date | null) => void;
  title?: string;
  userId?: string;
}

export const DatePickerModal: FC<DatePickerModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onDateSelect,
  title,
  userId,
}) => {
  const t = useTranslations();
  const [currentMonth, setCurrentMonth] = useState(
    () => selectedDate || new Date(),
  );
  const [tempSelectedDate, setTempSelectedDate] = useState<Date | null>(
    selectedDate || null,
  );
  const [pageCountByDate, setPageCountByDate] = useState<
    Record<string, number>
  >({});

  const formatDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // モーダルが開いたときに現在の選択日付を一時選択に設定
  React.useEffect(() => {
    if (isOpen) {
      setTempSelectedDate(selectedDate || null);
    }
  }, [isOpen, selectedDate]);

  React.useEffect(() => {
    if (!isOpen || !userId) {
      setPageCountByDate({});
      return;
    }

    let isMounted = true;

    const fetchPageCounts = async () => {
      try {
        const response = await getTrainingDatesMonth({
          userId,
          year: currentMonth.getFullYear(),
          month: currentMonth.getMonth() + 1,
        });

        if (!response.success || !response.data || !isMounted) {
          return;
        }

        const nextMap: Record<string, number> = {};
        for (const item of response.data.page_counts) {
          if (item.page_count > 0) {
            nextMap[item.training_date] = item.page_count;
          }
        }
        setPageCountByDate(nextMap);
      } catch (error) {
        console.warn("Failed to fetch page counts for date picker:", error);
        if (isMounted) {
          setPageCountByDate({});
        }
      }
    };

    void fetchPageCounts();

    return () => {
      isMounted = false;
    };
  }, [isOpen, userId, currentMonth]);

  const { year, month } = useMemo(() => {
    return {
      year: currentMonth.getFullYear(),
      month: currentMonth.getMonth(),
    };
  }, [currentMonth]);

  const monthNames = [
    t("datePickerModal.months.january"),
    t("datePickerModal.months.february"),
    t("datePickerModal.months.march"),
    t("datePickerModal.months.april"),
    t("datePickerModal.months.may"),
    t("datePickerModal.months.june"),
    t("datePickerModal.months.july"),
    t("datePickerModal.months.august"),
    t("datePickerModal.months.september"),
    t("datePickerModal.months.october"),
    t("datePickerModal.months.november"),
    t("datePickerModal.months.december"),
  ];

  const dayNames = [
    t("datePickerModal.days.sunday"),
    t("datePickerModal.days.monday"),
    t("datePickerModal.days.tuesday"),
    t("datePickerModal.days.wednesday"),
    t("datePickerModal.days.thursday"),
    t("datePickerModal.days.friday"),
    t("datePickerModal.days.saturday"),
  ];

  if (!isOpen) {
    return null;
  }

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      handleCancel();
    }
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const newMonth = new Date(prev);
      if (direction === "prev") {
        newMonth.setMonth(newMonth.getMonth() - 1);
      } else {
        newMonth.setMonth(newMonth.getMonth() + 1);
      }
      return newMonth;
    });
  };

  const handleDateClick = (date: Date, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) {
      setTempSelectedDate(date);
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
      return;
    }

    if (
      tempSelectedDate &&
      tempSelectedDate.getFullYear() === date.getFullYear() &&
      tempSelectedDate.getMonth() === date.getMonth() &&
      tempSelectedDate.getDate() === date.getDate()
    ) {
      setTempSelectedDate(null);
      return;
    }

    setTempSelectedDate(date);
  };

  const handleConfirm = () => {
    onDateSelect(tempSelectedDate);
    onClose();
  };

  const handleCancel = () => {
    setTempSelectedDate(selectedDate || null);
    onClose();
  };

  return createPortal(
    <div
      className={styles.overlay}
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
    >
      <div className={styles.modal}>
        <button
          type="button"
          onClick={handleCancel}
          className={styles.closeButton}
          aria-label={t("datePickerModal.close")}
        >
          ×
        </button>
        <div className={styles.header}>
          <h3 className={styles.title}>{title || t("filter.selectDate")}</h3>
        </div>
        <div className={styles.content}>
          <div className={styles.navigation}>
            <button
              type="button"
              className={styles.navButton}
              onClick={() => navigateMonth("prev")}
              aria-label={t("datePickerModal.prevMonth")}
            >
              ←
            </button>
            <div className={styles.monthYear}>
              {year}
              {t("datePickerModal.year")} {monthNames[month]}
            </div>
            <button
              type="button"
              className={styles.navButton}
              onClick={() => navigateMonth("next")}
              aria-label={t("datePickerModal.nextMonth")}
            >
              →
            </button>
          </div>

          <div className={styles.calendar}>
            <CalendarGrid
              currentMonth={currentMonth}
              dayNames={dayNames}
              selectedDate={tempSelectedDate}
              onDateClick={handleDateClick}
              getDateStatus={(date) => {
                const pageCount = pageCountByDate[formatDateKey(date)];
                if (!pageCount) {
                  return undefined;
                }
                return { pageCount };
              }}
              classNames={{
                dayButton: styles.dayButton,
                otherMonth: styles.otherMonth,
                today: styles.today,
                selected: styles.selected,
              }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className={styles.actionButtons}>
          <Button
            variant="cancel"
            onClick={handleCancel}
            className={styles.button}
          >
            {t("datePickerModal.cancel")}
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            className={styles.button}
          >
            {t("datePickerModal.filter")}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

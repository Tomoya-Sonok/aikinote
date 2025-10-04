import { useTranslations } from "next-intl";
import type { FC } from "react";
import React, { useMemo, useState } from "react";
import styles from "./DatePickerModal.module.css";

interface DatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
  onDateSelect: (date: Date | null) => void;
  title?: string;
}

export const DatePickerModal: FC<DatePickerModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onDateSelect,
  title,
}) => {
  const t = useTranslations();
  const [currentMonth, setCurrentMonth] = useState(
    () => selectedDate || new Date(),
  );
  const [tempSelectedDate, setTempSelectedDate] = useState<Date | null>(
    selectedDate || null,
  );

  // モーダルが開いたときに現在の選択日付を一時選択に設定
  React.useEffect(() => {
    if (isOpen) {
      setTempSelectedDate(selectedDate || null);
    }
  }, [isOpen, selectedDate]);
  const today = new Date();

  const { year, month, daysInMonth, firstDayOfWeek, prevMonthDays } =
    useMemo(() => {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDayOfWeek = new Date(year, month, 1).getDay();
      const prevMonth = new Date(year, month - 1, 0);
      const prevMonthDays = prevMonth.getDate();

      return {
        year,
        month,
        daysInMonth,
        firstDayOfWeek,
        prevMonthDays,
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

  const handleDateClick = (day: number, isCurrentMonth: boolean = true) => {
    if (!isCurrentMonth) {
      const newDate = isCurrentMonth
        ? new Date(year, month, day)
        : new Date(year, month + (day > 15 ? -1 : 1), day);
      setTempSelectedDate(newDate);
      return;
    }

    const newDate = new Date(year, month, day);

    // 既に選択されている日付をタップした場合は未選択にする
    if (
      tempSelectedDate &&
      tempSelectedDate.getFullYear() === newDate.getFullYear() &&
      tempSelectedDate.getMonth() === newDate.getMonth() &&
      tempSelectedDate.getDate() === newDate.getDate()
    ) {
      setTempSelectedDate(null);
    } else {
      setTempSelectedDate(newDate);
    }
  };

  const isToday = (day: number) => {
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    );
  };

  const isSelected = (day: number) => {
    if (!tempSelectedDate) return false;
    return (
      tempSelectedDate.getFullYear() === year &&
      tempSelectedDate.getMonth() === month &&
      tempSelectedDate.getDate() === day
    );
  };

  const handleConfirm = () => {
    onDateSelect(tempSelectedDate);
    onClose();
  };

  const handleCancel = () => {
    setTempSelectedDate(selectedDate || null);
    onClose();
  };

  const renderCalendarDays = () => {
    const days = [];

    // Previous month's trailing days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      days.push(
        <button
          key={`prev-${day}`}
          type="button"
          className={`${styles.dayButton} ${styles.otherMonth}`}
          onClick={() => {
            const prevMonth = new Date(year, month - 1, day);
            setTempSelectedDate(prevMonth);
            setCurrentMonth(prevMonth);
          }}
        >
          {day}
        </button>,
      );
    }

    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const todayClass = isToday(day) ? styles.today : "";
      const selectedClass = isSelected(day) ? styles.selected : "";

      days.push(
        <button
          key={`current-${day}`}
          type="button"
          className={`${styles.dayButton} ${todayClass} ${selectedClass}`}
          onClick={() => handleDateClick(day)}
        >
          {day}
        </button>,
      );
    }

    // Next month's leading days
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push(
        <button
          key={`next-${day}`}
          type="button"
          className={`${styles.dayButton} ${styles.otherMonth}`}
          onClick={() => {
            const nextMonth = new Date(year, month + 1, day);
            setTempSelectedDate(nextMonth);
            setCurrentMonth(nextMonth);
          }}
        >
          {day}
        </button>,
      );
    }

    return days;
  };

  return (
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
            <div className={styles.weekHeader}>
              {dayNames.map((day) => (
                <div key={day} className={styles.weekDay}>
                  {day}
                </div>
              ))}
            </div>
            <div className={styles.daysGrid}>{renderCalendarDays()}</div>
          </div>

          {/* Action Buttons */}
          <div className={styles.actionButtons}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={handleCancel}
            >
              {t("datePickerModal.cancel")}
            </button>
            <button
              type="button"
              className={styles.confirmButton}
              onClick={handleConfirm}
            >
              {t("datePickerModal.filter")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

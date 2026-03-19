"use client";

import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarGrid } from "@/components/features/personal/CalendarGrid/CalendarGrid";
import { Button } from "@/components/shared/Button/Button";
import { Loader } from "@/components/shared/Loader";
import { useToast } from "@/contexts/ToastContext";
import {
  getTrainingDatesMonth,
  removeTrainingDateAttendance,
  upsertTrainingDateAttendance,
} from "@/lib/api/client";
import { useAuth } from "@/lib/hooks/useAuth";
import styles from "./page.module.css";

type DayStatus = {
  isAttended: boolean;
  pageCount: number;
};

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildDayStatusMap = (
  attendanceDates: string[],
  pageCounts: Array<{ training_date: string; page_count: number }>,
): Record<string, DayStatus> => {
  const nextMap: Record<string, DayStatus> = {};

  for (const item of pageCounts) {
    nextMap[item.training_date] = {
      isAttended: false,
      pageCount: item.page_count,
    };
  }

  for (const trainingDate of attendanceDates) {
    const current = nextMap[trainingDate];
    nextMap[trainingDate] = {
      isAttended: true,
      pageCount: current?.pageCount ?? 0,
    };
  }

  return nextMap;
};

interface ActionModalProps {
  isOpen: boolean;
  title: string;
  attendanceLabel: string;
  createPageLabel: string;
  cancelLabel: string;
  isProcessing: boolean;
  onClose: () => void;
  onToggleAttendance: () => void;
  onCreatePage: () => void;
}

function CalendarActionModal({
  isOpen,
  title,
  attendanceLabel,
  createPageLabel,
  cancelLabel,
  isProcessing,
  onClose,
  onToggleAttendance,
  onCreatePage,
}: ActionModalProps) {
  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div className={styles.actionOverlay} role="presentation">
      <button
        type="button"
        className={styles.actionOverlayDismiss}
        onClick={onClose}
        aria-label={cancelLabel}
        disabled={isProcessing}
      />
      <div
        className={styles.actionDialog}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <p className={styles.actionTitle}>{title}</p>
        <div className={styles.actionButtons}>
          <Button
            variant="secondary"
            onClick={onToggleAttendance}
            disabled={isProcessing}
            className={styles.actionButton}
          >
            {attendanceLabel}
          </Button>
          <Button
            variant="primary"
            onClick={onCreatePage}
            disabled={isProcessing}
            className={styles.actionButton}
          >
            {createPageLabel}
          </Button>
          <Button
            variant="cancel"
            onClick={onClose}
            disabled={isProcessing}
            className={styles.actionButton}
          >
            {cancelLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function PersonalCalendar() {
  const locale = useLocale();
  const t = useTranslations();
  const { showToast } = useToast();
  const showToastRef = useRef(showToast);
  const tRef = useRef(t);
  const { user, loading: authLoading } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [dayStatusMap, setDayStatusMap] = useState<Record<string, DayStatus>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);

  useEffect(() => {
    showToastRef.current = showToast;
    tRef.current = t;
  }, [showToast, t]);

  const monthNames = useMemo(
    () => [
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
    ],
    [t],
  );

  const dayNames = useMemo(
    () => [
      t("datePickerModal.days.sunday"),
      t("datePickerModal.days.monday"),
      t("datePickerModal.days.tuesday"),
      t("datePickerModal.days.wednesday"),
      t("datePickerModal.days.thursday"),
      t("datePickerModal.days.friday"),
      t("datePickerModal.days.saturday"),
    ],
    [t],
  );

  const fetchMonthData = useCallback(async () => {
    if (authLoading) {
      return;
    }

    if (!user?.id) {
      setDayStatusMap({});
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;

      const response = await getTrainingDatesMonth({
        userId: user.id,
        year,
        month,
      });

      if (!response.success || !response.data) {
        throw new Error(tRef.current("personalCalendar.dataFetchFailed"));
      }

      const attendanceDates = response.data.training_dates
        .filter((item) => item.is_attended)
        .map((item) => item.training_date);
      const map = buildDayStatusMap(attendanceDates, response.data.page_counts);
      setDayStatusMap(map);
    } catch (error) {
      console.error("Failed to fetch calendar data:", error);
      showToastRef.current(
        tRef.current("personalCalendar.dataFetchFailed"),
        "error",
      );
      setDayStatusMap({});
    } finally {
      setLoading(false);
    }
  }, [authLoading, currentMonth, user?.id]);

  useEffect(() => {
    void fetchMonthData();
  }, [fetchMonthData]);

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const nextMonth = new Date(prev);
      nextMonth.setMonth(
        nextMonth.getMonth() + (direction === "next" ? 1 : -1),
      );
      return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1);
    });
  };

  const selectedDateKey = selectedDate ? formatDateKey(selectedDate) : null;
  const selectedStatus = selectedDateKey ? dayStatusMap[selectedDateKey] : null;
  const isSelectedDateAttended = selectedStatus?.isAttended ?? false;

  const handleDateClick = (date: Date, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) {
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    if (target > today) {
      showToast(t("personalCalendar.futureDateError"), "error");
      return;
    }

    setSelectedDate(date);
    setIsActionModalOpen(true);
  };

  const handleToggleAttendance = async () => {
    if (!user?.id || !selectedDateKey) {
      return;
    }

    setIsProcessing(true);
    try {
      if (isSelectedDateAttended) {
        await removeTrainingDateAttendance({
          userId: user.id,
          trainingDate: selectedDateKey,
        });
      } else {
        await upsertTrainingDateAttendance({
          userId: user.id,
          trainingDate: selectedDateKey,
        });
      }

      setDayStatusMap((prev) => {
        const currentStatus = prev[selectedDateKey] ?? {
          isAttended: false,
          pageCount: 0,
        };

        if (isSelectedDateAttended && currentStatus.pageCount === 0) {
          const { [selectedDateKey]: _removed, ...rest } = prev;
          return rest;
        }

        return {
          ...prev,
          [selectedDateKey]: {
            isAttended: !isSelectedDateAttended,
            pageCount: currentStatus.pageCount,
          },
        };
      });

      setIsActionModalOpen(false);
      showToast(
        isSelectedDateAttended
          ? t("personalCalendar.attendanceRemoved")
          : t("personalCalendar.attendanceAdded"),
        "success",
      );
    } catch (error) {
      console.error("Failed to update attendance:", error);
      showToast(t("personalCalendar.attendanceUpdateFailed"), "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenCreatePage = () => {
    setIsActionModalOpen(false);
    if (selectedDateKey) {
      const returnUrl = `/${locale}/personal/calendar`;
      window.location.href = `/${locale}/personal/pages/new?date=${selectedDateKey}&returnUrl=${encodeURIComponent(returnUrl)}`;
    }
  };

  const actionTitle = selectedDateKey
    ? t("personalCalendar.actionTitle", { date: selectedDateKey })
    : "";

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <p className={styles.description}>
          {t("personalCalendar.description")}
        </p>
      </div>

      <div className={styles.calendarCard}>
        <div className={styles.monthNavigation}>
          <button
            type="button"
            onClick={() => navigateMonth("prev")}
            className={styles.monthButton}
            aria-label={t("datePickerModal.prevMonth")}
          >
            <CaretLeftIcon size={18} weight="bold" />
          </button>
          <p className={styles.monthLabel}>
            {currentMonth.getFullYear()}
            {t("datePickerModal.year")} {monthNames[currentMonth.getMonth()]}
          </p>
          <button
            type="button"
            onClick={() => navigateMonth("next")}
            className={styles.monthButton}
            aria-label={t("datePickerModal.nextMonth")}
          >
            <CaretRightIcon size={18} weight="bold" />
          </button>
        </div>

        <div className={styles.calendarArea}>
          <div
            style={
              loading || authLoading
                ? { opacity: 0.4, pointerEvents: "none" as const }
                : undefined
            }
          >
            <CalendarGrid
              currentMonth={currentMonth}
              dayNames={dayNames}
              selectedDate={selectedDate}
              onDateClick={handleDateClick}
              highlightSelectedDate={false}
              getDateStatus={(date) => dayStatusMap[formatDateKey(date)]}
              onMonthChange={navigateMonth}
            />
          </div>
          {(loading || authLoading) && (
            <div className={styles.calendarLoader}>
              <Loader size="small" centered />
            </div>
          )}
        </div>
      </div>

      <p className={styles.legend}>{t("personalCalendar.legend")}</p>

      <CalendarActionModal
        isOpen={isActionModalOpen}
        title={actionTitle}
        attendanceLabel={
          isSelectedDateAttended
            ? t("personalCalendar.unmarkAttendance")
            : t("personalCalendar.markAttendance")
        }
        createPageLabel={t("personalCalendar.createPage")}
        cancelLabel={t("personalCalendar.cancel")}
        isProcessing={isProcessing}
        onClose={() => setIsActionModalOpen(false)}
        onToggleAttendance={handleToggleAttendance}
        onCreatePage={handleOpenCreatePage}
      />
    </div>
  );
}

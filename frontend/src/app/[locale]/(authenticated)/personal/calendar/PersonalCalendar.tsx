"use client";

import {
  BellRingingIcon,
  CaretLeftIcon,
  CaretRightIcon,
} from "@phosphor-icons/react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarGrid } from "@/components/features/personal/CalendarGrid/CalendarGrid";
import { Button } from "@/components/shared/Button/Button";
import { Loader } from "@/components/shared/Loader";
import { OfflineGuard } from "@/components/shared/OfflineGuard";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/lib/hooks/useAuth";
import { useIsNativeApp } from "@/lib/hooks/useIsNativeApp";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { usePersonalCalendarData } from "@/lib/hooks/usePersonalCalendarData";
import { useUmamiTrack } from "@/lib/hooks/useUmamiTrack";
import { useRouter } from "@/lib/i18n/routing";
import { getNetworkAwareErrorMessage } from "@/lib/utils/offlineError";
import { CalendarFooter } from "./CalendarFooter";
import styles from "./page.module.css";

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  const router = useRouter();
  const { showToast } = useToast();
  const showToastRef = useRef(showToast);
  const tRef = useRef(t);
  const { user, loading: authLoading } = useAuth();
  const { track } = useUmamiTrack();
  const isOnline = useOnlineStatus();
  const isNative = useIsNativeApp();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const {
    dayStatusMap,
    isMonthLoading,
    monthError,
    monthlyGoal,
    setMonthlyGoal,
    reminderEnabled,
    reminders,
    examGoal,
    examAttendanceCount,
    refetchExamGoal,
    toggleAttendance,
    isTogglingAttendance,
  } = usePersonalCalendarData(
    user?.id,
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
  );
  // 月データがまだ無いときだけローダーを出す（キャッシュ済み・前の月を表示中は出さない）
  const showMonthLoader = (authLoading && !user) || isMonthLoading;

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

  useEffect(() => {
    if (!monthError) return;
    console.error("Failed to fetch calendar data:", monthError);
    showToastRef.current(
      getNetworkAwareErrorMessage(
        monthError,
        tRef.current("personalCalendar.dataFetchFailed"),
      ),
      "error",
    );
  }, [monthError]);

  const handleGoalChanged = useCallback(
    (goal: number | null) => setMonthlyGoal(goal),
    [setMonthlyGoal],
  );

  const handleExamGoalSaved = useCallback(() => {
    void refetchExamGoal();
  }, [refetchExamGoal]);

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

  // legend 表示条件
  const hasAttendance = Object.values(dayStatusMap).some((s) => s.isAttended);
  const hasPages = Object.values(dayStatusMap).some((s) => s.pageCount > 0);

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

    track("calendar_toggle_attendance");
    // 表示は toggleAttendance 内で楽観的に更新されるので、モーダルはすぐ閉じる
    setIsActionModalOpen(false);
    try {
      await toggleAttendance({
        dateKey: selectedDateKey,
        attend: !isSelectedDateAttended,
      });
    } catch (error) {
      console.error("Failed to update attendance:", error);
      showToast(
        getNetworkAwareErrorMessage(
          error,
          t("personalCalendar.attendanceUpdateFailed"),
        ),
        "error",
      );
    }
  };

  const handleOpenCreatePage = () => {
    setIsActionModalOpen(false);
    if (selectedDateKey) {
      track("start_create_page_from_calendar", {
        selected_date: selectedDateKey,
      });
      const returnUrl = "/personal/calendar";
      router.push(
        `/personal/pages/new?date=${selectedDateKey}&returnUrl=${encodeURIComponent(returnUrl)}`,
      );
    }
  };

  const actionTitle = selectedDateKey
    ? t("personalCalendar.actionTitle", { date: selectedDateKey })
    : "";

  // ネイティブアプリ + オフライン時は専用ガード画面を表示。
  // カレンダー操作 (出欠登録 / 試験目標 / リマインダー) はサーバー API 必須で
  // ローカル算出に対応していないため、オフラインでは利用不可。
  if (isNative && !isOnline) {
    return <OfflineGuard />;
  }

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
              showMonthLoader
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
              highlightedDaysOfWeek={
                reminderEnabled && reminders.length > 0
                  ? Array.from(
                      new Set(reminders.flatMap((r) => r.reminder_days)),
                    )
                  : undefined
              }
              onMonthChange={navigateMonth}
              examDate={examGoal?.exam_date}
            />
          </div>
          {showMonthLoader && (
            <div className={styles.calendarLoader}>
              <Loader size="large" centered />
            </div>
          )}
        </div>
      </div>

      <div className={styles.legend}>
        {hasAttendance && (
          <span>◯：{t("personalCalendar.legendAttendance")}</span>
        )}
        {hasPages && <span>・：{t("personalCalendar.legendPages")}</span>}
        {reminderEnabled && reminders.length > 0 && (
          <span className={styles.legendItem}>
            <BellRingingIcon size={10} weight="fill" style={{ opacity: 0.6 }} />
            ：{t("personalCalendar.legendReminder")}
          </span>
        )}
        {examGoal && (
          <span className={styles.legendItem}>
            <span className={styles.legendExamLine} />：
            {t("personalCalendar.legendExam")}
          </span>
        )}
      </div>

      <CalendarFooter
        dayStatusMap={dayStatusMap}
        currentMonth={currentMonth}
        locale={locale}
        reminderEnabled={reminderEnabled}
        reminders={reminders}
        examGoal={examGoal}
        examAttendanceCount={examAttendanceCount}
        onExamGoalSaved={handleExamGoalSaved}
        monthlyGoal={monthlyGoal}
        onGoalChanged={handleGoalChanged}
      />

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
        isProcessing={isTogglingAttendance}
        onClose={() => setIsActionModalOpen(false)}
        onToggleAttendance={handleToggleAttendance}
        onCreatePage={handleOpenCreatePage}
      />
    </div>
  );
}

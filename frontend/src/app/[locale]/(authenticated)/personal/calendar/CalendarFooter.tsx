"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { PremiumUpgradeModal } from "@/components/shared/PremiumUpgradeModal/PremiumUpgradeModal";
import { useToast } from "@/contexts/ToastContext";
import { AIKIDO_RANK_OPTIONS } from "@/lib/constants/aikidoRank";
import { useSubscription } from "@/lib/hooks/useSubscription";
import styles from "./CalendarFooter.module.css";

type DayStatus = {
  isAttended: boolean;
  pageCount: number;
};

interface ReminderData {
  reminder_time: string;
  reminder_days: number[];
}

interface ExamGoalData {
  exam_rank: string;
  exam_date: string;
  prev_exam_date: string | null;
  target_attendance: number;
}

interface CalendarFooterProps {
  dayStatusMap: Record<string, DayStatus>;
  currentMonth: Date;
  locale: string;
  reminderEnabled: boolean;
  reminders: ReminderData[];
  examGoal: ExamGoalData | null;
  examAttendanceCount: number;
  onExamGoalSaved: () => void;
}

const DAY_LABELS_JA = ["日", "月", "火", "水", "木", "金", "土"];
const DAY_LABELS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatReminderSummary(
  reminders: ReminderData[],
  locale: string,
): string {
  const dayLabels = locale === "ja" ? DAY_LABELS_JA : DAY_LABELS_EN;
  return reminders
    .map((r) => {
      const days = r.reminder_days
        .sort((a, b) => a - b)
        .map((d) => dayLabels[d])
        .join("・");
      const time = r.reminder_time.slice(0, 5);
      return `${days} ${time}`;
    })
    .join(" / ");
}

export function CalendarFooter({
  dayStatusMap,
  currentMonth,
  locale,
  reminderEnabled,
  reminders,
  examGoal,
  examAttendanceCount,
  onExamGoalSaved,
}: CalendarFooterProps) {
  const t = useTranslations("personalCalendar");
  const { isPremium } = useSubscription();
  const { showToast } = useToast();
  const [goal, setGoal] = useState<number | null>(null);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [isEditingExam, setIsEditingExam] = useState(false);
  const [examRankInput, setExamRankInput] = useState("");
  const [examDateInput, setExamDateInput] = useState("");
  const [prevExamDateInput, setPrevExamDateInput] = useState("");
  const [examTargetInput, setExamTargetInput] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // 今月の参加回数を計算
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const monthlyCount = Object.entries(dayStatusMap).filter(([key, status]) => {
    if (!status.isAttended) return false;
    const d = new Date(key);
    return d.getFullYear() === year && d.getMonth() === month;
  }).length;

  // 目標を取得（Free/Premium 共通）
  useEffect(() => {
    fetch("/api/training-goals", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.data?.goal != null) {
          setGoal(data.data.goal);
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveGoal = useCallback(async () => {
    const value = Number.parseInt(goalInput, 10);
    if (Number.isNaN(value) || value < 1 || value > 31) return;

    try {
      const res = await fetch("/api/training-goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: value }),
        credentials: "include",
      });
      if (res.ok) {
        setGoal(value);
        setIsEditingGoal(false);
        showToast(t("goalSaved"), "success");
      }
    } catch {
      // silent
    }
  }, [goalInput, showToast, t]);

  const handleClearGoal = useCallback(async () => {
    try {
      const res = await fetch("/api/training-goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: null }),
        credentials: "include",
      });
      if (res.ok) {
        setGoal(null);
        setIsEditingGoal(false);
      }
    } catch {
      // silent
    }
  }, []);

  const handleSaveExamGoal = useCallback(async () => {
    if (!examRankInput || !examDateInput || !examTargetInput) return;
    if (examRankInput !== "五級" && !prevExamDateInput) return;
    const targetValue = Number.parseInt(examTargetInput, 10);
    if (Number.isNaN(targetValue) || targetValue < 1) return;

    const payload: Record<string, unknown> = {
      exam_rank: examRankInput,
      exam_date: examDateInput,
      target_attendance: targetValue,
    };
    if (examRankInput !== "五級") {
      payload.prev_exam_date = prevExamDateInput;
    }

    try {
      const res = await fetch("/api/exam-goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (res.ok) {
        setIsEditingExam(false);
        showToast(t("examSaved"), "success");
        onExamGoalSaved();
      }
    } catch {
      // silent
    }
  }, [
    examRankInput,
    examDateInput,
    prevExamDateInput,
    examTargetInput,
    showToast,
    t,
    onExamGoalSaved,
  ]);

  const handleClearExamGoal = useCallback(async () => {
    try {
      const res = await fetch("/api/exam-goals", {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setIsEditingExam(false);
        onExamGoalSaved();
      }
    } catch {
      // silent
    }
  }, [onExamGoalSaved]);

  // 残り必要稽古日数
  const examDaysLeft = examGoal
    ? Math.max(0, examGoal.target_attendance - examAttendanceCount)
    : 0;

  // 審査目標の達成度ドット列
  const examDots = examGoal
    ? Array.from(
        { length: examGoal.target_attendance },
        (_, i) => i < examAttendanceCount,
      )
    : null;

  const dots = goal
    ? Array.from({ length: goal }, (_, i) => i < monthlyCount)
    : monthlyCount > 0
      ? Array.from({ length: monthlyCount }, () => true)
      : null;

  return (
    <div className={styles.footer}>
      <div className={styles.section}>
        <div className={styles.monthlyHeader}>
          <span className={styles.monthlyLabel}>
            {t("monthlyLabel", {
              month: currentMonth.getMonth() + 1,
              monthName: currentMonth.toLocaleString(locale, { month: "long" }),
            })}
          </span>
          <span
            className={`${styles.monthlyCount} ${goal && monthlyCount >= goal ? styles.goalAchieved : ""}`}
          >
            {goal
              ? t("monthlyGoal", { current: monthlyCount, goal })
              : t("monthlyCount", { count: monthlyCount })}
          </span>
        </div>

        {dots && (
          <div className={styles.dots}>
            {dots.map((filled, i) => {
              const key = `dot-${filled ? "f" : "e"}-${i}`;
              return (
                <span
                  key={key}
                  className={`${styles.dot} ${filled ? styles.dotFilled : styles.dotEmpty}`}
                />
              );
            })}
          </div>
        )}

        {!isEditingGoal && (
          <div className={styles.goalLinkRow}>
            {goal ? (
              <>
                <button
                  type="button"
                  className={styles.goalLink}
                  onClick={() => {
                    setGoalInput(String(goal));
                    setIsEditingGoal(true);
                  }}
                >
                  {t("changeGoal")}
                </button>
                <span className={styles.goalLinkSeparator}>|</span>
                <button
                  type="button"
                  className={styles.goalLink}
                  onClick={handleClearGoal}
                >
                  {t("clearGoal")}
                </button>
              </>
            ) : (
              <button
                type="button"
                className={styles.goalLink}
                onClick={() => {
                  setGoalInput("8");
                  setIsEditingGoal(true);
                }}
              >
                {t("setGoal")} →
              </button>
            )}
          </div>
        )}

        {isEditingGoal && (
          <div className={styles.goalForm}>
            <input
              type="number"
              min={1}
              max={31}
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              className={styles.goalInput}
              placeholder={t("goalPlaceholder")}
            />
            <button
              type="button"
              className={styles.goalSaveButton}
              onClick={handleSaveGoal}
            >
              {t("goalSave")}
            </button>
          </div>
        )}
      </div>

      {/* 審査目標セクション */}
      <div className={styles.section}>
        {examGoal && !isEditingExam ? (
          <>
            <div className={styles.monthlyHeader}>
              <span className={styles.monthlyLabel}>
                {t("examRankLabel", { rank: examGoal.exam_rank })}
              </span>
              <span className={styles.monthlyCount}>
                {t("examDaysLeft", { days: examDaysLeft })}
              </span>
            </div>
            {examDots && (
              <div className={styles.dots}>
                {examDots.map((filled, i) => {
                  const key = `exam-dot-${filled ? "f" : "e"}-${i}`;
                  return (
                    <span
                      key={key}
                      className={`${styles.dot} ${filled ? styles.dotFilled : styles.dotEmpty}`}
                    />
                  );
                })}
              </div>
            )}
            <div className={styles.examProgressRow}>
              <span className={styles.examProgressText}>
                {t("examProgress", {
                  current: examAttendanceCount,
                  goal: examGoal.target_attendance,
                })}
              </span>
            </div>
            <div className={styles.goalLinkRow}>
              <button
                type="button"
                className={styles.goalLink}
                onClick={() => {
                  setExamRankInput(examGoal.exam_rank);
                  setExamDateInput(examGoal.exam_date);
                  setPrevExamDateInput(examGoal.prev_exam_date ?? "");
                  setExamTargetInput(String(examGoal.target_attendance));
                  setIsEditingExam(true);
                }}
              >
                {t("examChange")}
              </button>
              <span className={styles.goalLinkSeparator}>|</span>
              <button
                type="button"
                className={styles.goalLink}
                onClick={handleClearExamGoal}
              >
                {t("examClear")}
              </button>
            </div>
          </>
        ) : isEditingExam ? (
          <div className={styles.examForm}>
            <label className={styles.examFormLabel}>
              {t("examRank")}
              <select
                value={examRankInput}
                onChange={(e) => {
                  setExamRankInput(e.target.value);
                  if (e.target.value === "五級") {
                    setPrevExamDateInput("");
                  }
                }}
                className={styles.examFormSelect}
              >
                <option value="" />
                {AIKIDO_RANK_OPTIONS.map((rank) => (
                  <option key={rank} value={rank}>
                    {rank}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.examFormLabel}>
              {t("examDate")}
              <input
                type="date"
                value={examDateInput}
                onChange={(e) => setExamDateInput(e.target.value)}
                className={styles.examFormInput}
              />
            </label>
            <label className={styles.examFormLabel}>
              {t("examTargetDays")}
              <input
                type="number"
                min={1}
                value={examTargetInput}
                onChange={(e) => setExamTargetInput(e.target.value)}
                className={styles.examFormInput}
              />
            </label>
            {examRankInput !== "五級" && (
              <label className={styles.examFormLabel}>
                {t("prevExamDate")}
                <input
                  type="date"
                  value={prevExamDateInput}
                  onChange={(e) => setPrevExamDateInput(e.target.value)}
                  className={styles.examFormInput}
                />
              </label>
            )}
            <div className={styles.examFormActions}>
              <button
                type="button"
                className={styles.goalLink}
                onClick={() => setIsEditingExam(false)}
              >
                {t("examClear")}
              </button>
              <button
                type="button"
                className={styles.goalSaveButton}
                disabled={
                  !examRankInput ||
                  !examDateInput ||
                  !examTargetInput ||
                  (examRankInput !== "五級" && !prevExamDateInput)
                }
                onClick={handleSaveExamGoal}
              >
                {t("goalSave")}
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.monthlyHeader}>
            <span className={styles.monthlyLabel}>{t("examLabel")}</span>
            <button
              type="button"
              className={styles.goalLink}
              onClick={() => {
                if (!isPremium) {
                  setShowUpgradeModal(true);
                  return;
                }
                setExamRankInput("");
                setExamDateInput("");
                setPrevExamDateInput("");
                setExamTargetInput("");
                setIsEditingExam(true);
              }}
            >
              {t("examSetup")} →
            </button>
          </div>
        )}
      </div>

      {/* リマインダーセクション */}
      <div className={styles.section}>
        <div className={styles.monthlyHeader}>
          <span className={styles.monthlyLabel}>{t("reminderLabel")}</span>
          {reminderEnabled && reminders.length > 0 ? (
            <span className={styles.reminderSummary}>
              {formatReminderSummary(reminders, locale)}
            </span>
          ) : (
            <button
              type="button"
              className={styles.goalLink}
              onClick={() => {
                location.replace(`/${locale}/settings/push-notification`);
              }}
            >
              {t("reminderSetup")} →
            </button>
          )}
        </div>
        {reminderEnabled && reminders.length > 0 && (
          <div className={styles.goalLinkRow}>
            <button
              type="button"
              className={styles.goalLink}
              onClick={() => {
                location.replace(`/${locale}/settings/push-notification`);
              }}
            >
              {t("reminderChange")} →
            </button>
          </div>
        )}
      </div>

      <PremiumUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        translationKey="premiumModalCalendar"
      />
    </div>
  );
}

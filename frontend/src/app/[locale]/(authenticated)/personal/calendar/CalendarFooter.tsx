"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/contexts/ToastContext";
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

interface CalendarFooterProps {
  dayStatusMap: Record<string, DayStatus>;
  currentMonth: Date;
  locale: string;
  reminderEnabled: boolean;
  reminders: ReminderData[];
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
}: CalendarFooterProps) {
  const t = useTranslations("personalCalendar");
  const { isPremium } = useSubscription();
  const { showToast } = useToast();
  const [goal, setGoal] = useState<number | null>(null);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("");

  // 今月の参加回数を計算
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const monthlyCount = Object.entries(dayStatusMap).filter(([key, status]) => {
    if (!status.isAttended) return false;
    const d = new Date(key);
    return d.getFullYear() === year && d.getMonth() === month;
  }).length;

  // Premium: 目標を取得
  useEffect(() => {
    if (!isPremium) return;
    fetch("/api/training-goals", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.data?.goal != null) {
          setGoal(data.data.goal);
        }
      })
      .catch(() => {});
  }, [isPremium]);

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

  const dots = goal
    ? Array.from({ length: goal }, (_, i) => i < monthlyCount)
    : monthlyCount > 0
      ? Array.from({ length: monthlyCount }, () => true)
      : null;

  return (
    <div className={styles.footer}>
      <div className={styles.section}>
        <div className={styles.monthlyHeader}>
          <span className={styles.monthlyLabel}>{t("monthlyLabel")}</span>
          <span
            className={`${styles.monthlyCount} ${isPremium && goal && monthlyCount >= goal ? styles.goalAchieved : ""}`}
          >
            {isPremium && goal
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

        {isPremium && !isEditingGoal && (
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

      {/* リマインダーセクション */}
      <div className={styles.reminderSection}>
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
                window.location.href = `/${locale}/settings/push-notification`;
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
                window.location.href = `/${locale}/settings/push-notification`;
              }}
            >
              {t("reminderChange")} →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

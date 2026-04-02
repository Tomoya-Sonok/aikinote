"use client";

import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { useToast } from "@/contexts/ToastContext";
import styles from "./CalendarFooter.module.css";
import type { DayStatus } from "./types";

interface MonthlyGoalSectionProps {
  dayStatusMap: Record<string, DayStatus>;
  currentMonth: Date;
  locale: string;
  goal: number | null;
  onGoalChanged: (goal: number | null) => void;
}

export function MonthlyGoalSection({
  dayStatusMap,
  currentMonth,
  locale,
  goal,
  onGoalChanged,
}: MonthlyGoalSectionProps) {
  const t = useTranslations("personalCalendar");
  const { showToast } = useToast();
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("");

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const monthlyCount = Object.entries(dayStatusMap).filter(([key, status]) => {
    if (!status.isAttended) return false;
    const d = new Date(key);
    return d.getFullYear() === year && d.getMonth() === month;
  }).length;

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
        onGoalChanged(value);
        setIsEditingGoal(false);
        showToast(t("goalSaved"), "success");
      }
    } catch {
      // silent
    }
  }, [goalInput, showToast, t, onGoalChanged]);

  const handleClearGoal = useCallback(async () => {
    try {
      const res = await fetch("/api/training-goals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: null }),
        credentials: "include",
      });
      if (res.ok) {
        onGoalChanged(null);
        setIsEditingGoal(false);
      }
    } catch {
      // silent
    }
  }, [onGoalChanged]);

  const dots = goal
    ? Array.from({ length: goal }, (_, i) => i < monthlyCount)
    : monthlyCount > 0
      ? Array.from({ length: monthlyCount }, () => true)
      : null;

  return (
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
  );
}

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

interface CalendarFooterProps {
  dayStatusMap: Record<string, DayStatus>;
  currentMonth: Date;
}

export function CalendarFooter({
  dayStatusMap,
  currentMonth,
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

  const dots = goal
    ? Array.from({ length: goal }, (_, i) => i < monthlyCount)
    : null;

  return (
    <div className={styles.footer}>
      <div className={styles.section}>
        <div className={styles.monthlyRow}>
          <span className={styles.monthlyLabel}>{t("monthlyLabel")}</span>

          {isPremium && dots && (
            <div className={styles.dots}>
              {dots.map((filled, i) => (
                <span
                  key={`dot-${i}`}
                  className={`${styles.dot} ${filled ? styles.dotFilled : styles.dotEmpty}`}
                />
              ))}
            </div>
          )}

          <span
            className={`${styles.monthlyCount} ${isPremium && goal && monthlyCount >= goal ? styles.goalAchieved : ""}`}
          >
            {isPremium && goal
              ? t("monthlyGoal", { current: monthlyCount, goal })
              : t("monthlyCount", { count: monthlyCount })}
          </span>

          {isPremium && !goal && !isEditingGoal && (
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
    </div>
  );
}

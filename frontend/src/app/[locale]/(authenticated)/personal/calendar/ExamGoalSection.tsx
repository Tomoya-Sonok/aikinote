"use client";

import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { PremiumUpgradeModal } from "@/components/shared/PremiumUpgradeModal/PremiumUpgradeModal";
import { useToast } from "@/contexts/ToastContext";
import { AIKIDO_RANK_OPTIONS } from "@/lib/constants/aikidoRank";
import { useSubscription } from "@/lib/hooks/useSubscription";
import styles from "./CalendarFooter.module.css";
import type { ExamGoalData } from "./types";

interface ExamGoalSectionProps {
  examGoal: ExamGoalData | null;
  examAttendanceCount: number;
  locale: string;
  onExamGoalSaved: () => void;
}

export function ExamGoalSection({
  examGoal,
  examAttendanceCount,
  locale,
  onExamGoalSaved,
}: ExamGoalSectionProps) {
  const t = useTranslations("personalCalendar");
  const { isPremium } = useSubscription();
  const { showToast } = useToast();
  const [isEditingExam, setIsEditingExam] = useState(false);
  const [examRankInput, setExamRankInput] = useState("");
  const [examDateInput, setExamDateInput] = useState("");
  const [prevExamDateInput, setPrevExamDateInput] = useState("");
  const [examTargetInput, setExamTargetInput] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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

  const examDaysLeft = examGoal
    ? Math.max(0, examGoal.target_attendance - examAttendanceCount)
    : 0;

  const examDots = examGoal
    ? Array.from(
        { length: examGoal.target_attendance },
        (_, i) => i < examAttendanceCount,
      )
    : null;

  return (
    <>
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

      <PremiumUpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        translationKey="premiumModalCalendar"
      />
    </>
  );
}

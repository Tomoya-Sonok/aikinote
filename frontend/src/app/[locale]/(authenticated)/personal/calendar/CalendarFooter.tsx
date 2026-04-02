"use client";

import styles from "./CalendarFooter.module.css";
import { ExamGoalSection } from "./ExamGoalSection";
import { MonthlyGoalSection } from "./MonthlyGoalSection";
import { ReminderSection } from "./ReminderSection";
import type { DayStatus, ExamGoalData, ReminderData } from "./types";

interface CalendarFooterProps {
  dayStatusMap: Record<string, DayStatus>;
  currentMonth: Date;
  locale: string;
  reminderEnabled: boolean;
  reminders: ReminderData[];
  examGoal: ExamGoalData | null;
  examAttendanceCount: number;
  onExamGoalSaved: () => void;
  monthlyGoal: number | null;
  onGoalChanged: (goal: number | null) => void;
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
  monthlyGoal,
  onGoalChanged,
}: CalendarFooterProps) {
  return (
    <div className={styles.footer}>
      <MonthlyGoalSection
        dayStatusMap={dayStatusMap}
        currentMonth={currentMonth}
        locale={locale}
        goal={monthlyGoal}
        onGoalChanged={onGoalChanged}
      />
      <ExamGoalSection
        examGoal={examGoal}
        examAttendanceCount={examAttendanceCount}
        locale={locale}
        onExamGoalSaved={onExamGoalSaved}
      />
      <ReminderSection
        reminderEnabled={reminderEnabled}
        reminders={reminders}
        locale={locale}
      />
    </div>
  );
}

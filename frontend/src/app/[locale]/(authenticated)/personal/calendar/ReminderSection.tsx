"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/routing";
import styles from "./CalendarFooter.module.css";
import type { ReminderData } from "./types";

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

interface ReminderSectionProps {
  reminderEnabled: boolean;
  reminders: ReminderData[];
  locale: string;
}

export function ReminderSection({
  reminderEnabled,
  reminders,
  locale,
}: ReminderSectionProps) {
  const t = useTranslations("personalCalendar");
  const router = useRouter();

  return (
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
              router.replace("/settings/push-notification");
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
              router.replace("/settings/push-notification");
            }}
          >
            {t("reminderChange")} →
          </button>
        </div>
      )}
    </div>
  );
}
